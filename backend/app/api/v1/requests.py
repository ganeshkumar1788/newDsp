"""
AgriMap DSP — Change Requests API Endpoints
Farmer change request lifecycle: farmers submit and read own requests; admins review and decide status.
"""
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field as PydField

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.access import ensure_admin, farmer_scope_id
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/requests", tags=["Change Requests"])


class ChangeRequestCreate(BaseModel):
    farm_id: Optional[str] = "field-1"
    type: str
    target_type: Optional[str] = "none"
    target_id: Optional[str] = None
    target_name: Optional[str] = ""
    description: str = PydField(..., min_length=20, max_length=1000)
    proposed_geometry: Optional[Dict[str, Any]] = None
    attachments: Optional[List[Dict[str, Any]]] = []
    urgency: Optional[str] = "Normal"
    contact: Optional[str] = "in_app"


class StatusUpdatePayload(BaseModel):
    status: str
    admin_note: Optional[str] = ""


class ReplyPayload(BaseModel):
    message: str = PydField(..., min_length=5, max_length=1000)


# In-memory backing for backend requests when database table is not migrated
_MEMORY_REQUESTS: List[Dict[str, Any]] = []


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_change_request(
    payload: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a change request. Farmers can only submit for their own profile.
    """
    farmer_id = str(farmer_scope_id(db, current_user)) if current_user.role == "farmer" else str(current_user.id)
    
    req_id = f"req-{uuid.uuid4()}"
    req_num = f"REQ-2026-{len(_MEMORY_REQUESTS) + 1:03d}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    record = {
        "id": req_id,
        "requestNumber": req_num,
        "farmId": payload.farm_id,
        "farmerId": farmer_id,
        "farmerName": current_user.full_name or current_user.email,
        "type": payload.type,
        "targetType": payload.target_type,
        "targetId": payload.target_id,
        "targetName": payload.target_name,
        "description": payload.description,
        "proposedGeometry": payload.proposed_geometry,
        "attachments": payload.attachments or [],
        "urgency": payload.urgency,
        "contact": payload.contact,
        "status": "Submitted",
        "adminNote": "",
        "createdAt": now_iso,
        "updatedAt": now_iso,
        "history": [
            {
                "status": "Submitted",
                "timestamp": now_iso,
                "actor": f"{current_user.full_name or current_user.email} (Farmer)",
                "note": "Change request submitted.",
            }
        ],
    }
    _MEMORY_REQUESTS.insert(0, record)
    logger.info("Change request created: %s by %s", req_num, current_user.email)
    return record


@router.get("/")
def list_change_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List change requests. Farmers only receive their own requests.
    """
    if current_user.role == "farmer":
        farmer_id = str(farmer_scope_id(db, current_user))
        return [r for r in _MEMORY_REQUESTS if r["farmerId"] == farmer_id]
    return _MEMORY_REQUESTS


@router.get("/{request_id}")
def get_change_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve details of a single request. Enforces farmer ownership.
    """
    req = next((r for r in _MEMORY_REQUESTS if r["id"] == request_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if current_user.role == "farmer":
        farmer_id = str(farmer_scope_id(db, current_user))
        if req["farmerId"] != farmer_id:
            raise HTTPException(status_code=403, detail="You can only view your own requests.")
            
    return req


@router.put("/{request_id}/status")
def update_request_status(
    request_id: str,
    payload: StatusUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update request status. Only Admins can set status. Farmers are rejected with 403.
    """
    ensure_admin(current_user)
    req = next((r for r in _MEMORY_REQUESTS if r["id"] == request_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    now_iso = datetime.now(timezone.utc).isoformat()
    req["status"] = payload.status
    if payload.admin_note:
        req["adminNote"] = payload.admin_note
    req["updatedAt"] = now_iso
    req["history"].append({
        "status": payload.status,
        "timestamp": now_iso,
        "actor": f"{current_user.full_name or 'Admin'}",
        "note": payload.admin_note or f"Status set to {payload.status}",
    })
    
    logger.info("Request %s status changed to %s by admin %s", req["requestNumber"], payload.status, current_user.email)
    return req


@router.post("/{request_id}/reply")
def reply_to_request(
    request_id: str,
    payload: ReplyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Farmer reply when request status is 'Needs more info'.
    """
    req = next((r for r in _MEMORY_REQUESTS if r["id"] == request_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if current_user.role == "farmer":
        farmer_id = str(farmer_scope_id(db, current_user))
        if req["farmerId"] != farmer_id:
            raise HTTPException(status_code=403, detail="You can only reply to your own requests.")
            
    if req["status"] != "Needs more info":
        raise HTTPException(status_code=400, detail="Replies are only allowed when status is 'Needs more info'.")
        
    now_iso = datetime.now(timezone.utc).isoformat()
    req["status"] = "Under review"
    req["updatedAt"] = now_iso
    req["history"].append({
        "status": "Under review",
        "timestamp": now_iso,
        "actor": f"{current_user.full_name or 'Farmer'} (Reply)",
        "note": payload.message,
    })
    return req
