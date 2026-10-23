"""
AgriMap DSP — Device Management API Endpoints
CRUD for device registry and sensor data submission/retrieval.
"""
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.spatial import geojson_to_spatial
from app.core.access import (
    ensure_can_mutate, ensure_admin, ensure_field_access, farmer_scope_id
)
from app.models.device import Device
from app.models.field import Field
from app.models.sensor_data import SensorData
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceRead
from app.schemas.sensor_data import SensorDataCreate, SensorDataRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/devices", tags=["Devices & Sensors"])


# --- Device CRUD ---

@router.post("/", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def register_device(
    payload: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a new field device (GPS receiver, sensor, camera, drone). Requires surveyor or admin role."""
    ensure_can_mutate(current_user)
    device = Device(
        **payload.model_dump(),
        registered_by_id=current_user.id,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    
    logger.info("Device registered: %s (%s) by %s", device.device_name, device.device_type, current_user.email)
    return device


@router.get("/", response_model=dict)
def list_devices(
    device_type: Optional[str] = Query(None, description="Filter by type"),
    field_id: Optional[uuid.UUID] = Query(None, description="Filter by field"),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List registered devices with optional filters. Farmers only receive devices on their assigned fields."""
    query = db.query(Device)
    if current_user.role == "farmer":
        fid = farmer_scope_id(db, current_user)
        farmer_field_ids = [f.id for f in db.query(Field.id).filter(Field.farmer_id == fid).all()]
        query = query.filter(Device.field_id.in_(farmer_field_ids))
    elif field_id:
        query = query.filter(Device.field_id == field_id)

    if device_type:
        query = query.filter(Device.device_type == device_type)
    if status_filter:
        query = query.filter(Device.status == status_filter)

    total = query.count()
    devices = query.offset(skip).limit(limit).all()

    return {
        "items": [DeviceRead.model_validate(d) for d in devices],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{device_id}", response_model=DeviceRead)
def get_device(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific device."""
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if current_user.role == "farmer" and device.field_id:
        field = db.get(Field, device.field_id)
        if field:
            ensure_field_access(db, current_user, field)
    return device


@router.put("/{device_id}", response_model=DeviceRead)
def update_device(
    device_id: uuid.UUID,
    payload: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update device information. Requires surveyor or admin role."""
    ensure_can_mutate(current_user)
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(device, key, value)

    db.commit()
    db.refresh(device)
    
    logger.info("Device updated: %s by %s", device.device_name, current_user.email)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a device. Requires admin role."""
    ensure_admin(current_user)
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    db.delete(device)
    db.commit()
    logger.info("Device deleted: %s by %s", device_id, current_user.email)
    return


# --- Sensor Data ---

@router.post("/{device_id}/data", response_model=SensorDataRead, status_code=status.HTTP_201_CREATED)
def submit_sensor_reading(
    device_id: uuid.UUID,
    payload: SensorDataCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a sensor reading from a device."""
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    data = payload.model_dump()
    data.pop("device_id", None)
    geojson_geom = data.pop("geom", None)

    spatial_geom = None
    if geojson_geom:
        try:
            spatial_geom = geojson_to_spatial(geojson_geom)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    reading = SensorData(
        **data,
        device_id=device_id,
        geom=spatial_geom,
    )
    db.add(reading)

    # Update device last_seen
    device.last_seen_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(reading)
    
    logger.info("Sensor reading: %s=%s%s from device %s",
                reading.sensor_type, reading.value, reading.unit, device.device_name)
    return reading


@router.get("/{device_id}/data", response_model=dict)
def get_device_readings(
    device_id: uuid.UUID,
    sensor_type: Optional[str] = Query(None, description="Filter by sensor type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get sensor readings from a device. Paginated, newest first."""
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    query = db.query(SensorData).filter(SensorData.device_id == device_id)
    if sensor_type:
        query = query.filter(SensorData.sensor_type == sensor_type)

    total = query.count()
    readings = query.order_by(SensorData.measured_at.desc()).offset(skip).limit(limit).all()

    return {
        "device_id": str(device_id),
        "device_name": device.device_name,
        "items": [SensorDataRead.model_validate(r) for r in readings],
        "total": total,
        "skip": skip,
        "limit": limit,
    }
