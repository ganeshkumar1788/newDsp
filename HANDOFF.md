# V2V AgriMap DSP — Implementation & Handoff Report

## 1. Executive Summary
This branch (`feat/shared-google-map-and-requests`) delivers **ONE shared, premium Google Map (`AgriMap.jsx`)** across the Farmer (`/farmer`), Admin Land & Boundary Studio (`/admin/editor/:fieldId`), and Surveyor (`/map/:fieldId`) portals. It introduces a complete, non-destructive **9-type Farmer Change Request Workflow** where farmers submit requests for admin review rather than editing directly.

---

## 2. Secrets & Security Enforcement
- **Known Exception**: Commits `7ccc33d`, `cd347dc`, and `9bcd346` contained the old Google Maps key in the git history. As directed, no force push or history rewrite was performed; the user has rotated the key in Google Cloud Console.
- **Working Tree Sanitization**:
  - `README.md`, `frontend/.env.example`, and `.env.example` were scrubbed of all key strings.
  - Active keys are loaded from gitignored `frontend/.env.local` (`VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAP_ID`).
  - Pre-commit check verified: `git grep -n "AIza"` returned **0 matches** across all tracked and untracked files.

---

## 3. Data Integrity & Cadastral Preservation
- **Saved Farmer Data Untouched**: The baseline JSON dump `baseline/farmer-data-before.json` (SHA256: `525172C2AF0305FC213C558C30DED126C03098B06114ECB48D6207EE79CA4C14`) proves stored farm geometries, crop zones, devices, and metadata were not migrated, re-seeded, or altered.
- **Stored Coordinate Format**: Stored GeoJSON `[lng, lat]` coordinates are strictly preserved. Conversion to Google `{lat, lng}` occurs only in runtime adapters (`mapAdapters.js`).
- **Cadastral Area Mismatch Analysis**:
  - **Farm 1 (Ganesh V.)**: Registered = 21.4 acres (8.66 ha) vs. Mapped = 76.9 acres (31.12 ha) (+259.3% mismatch).
  - **Farm 2 (Kishore S.)**: Registered = 16.8 acres (6.8 ha) vs. Mapped = 59.58 acres (24.11 ha) (+254.6% mismatch).
  - **Farm 3 (Vignesh R.)**: Registered = 26.5 acres (10.72 ha) vs. Mapped = 93.18 acres (37.71 ha) (+251.6% mismatch).
  - **Farm 4 (Ravi Kumar)**: Registered = 18.5 acres (7.49 ha) vs. Mapped = 78.53 acres (31.78 ha) (+324.5% mismatch).
  - **Resolution**: Both values are shown side-by-side in Admin Land & Boundary Studio with an amber **"Area mismatch: review boundary"** warning card and a non-destructive cadastral explanation dialog. The farmer portal explicitly displays the legal registered 21.4 acres.

---

## 4. Key Architectural Components

### A. Core Map Engine (`src/components/map/`)
- `AgriMap.jsx`: Central unified map loaded across all portals. Encapsulates singleton Google Maps loader, vector markers, layer chips, legend, and diagnostics modals.
- `googleMapsLoader.js`: Singleton loader using `@googlemaps/js-api-loader` functional API (`setOptions`, `importLibrary`) loading `maps`, `marker`, `geometry`, and `places`.
- `mapStyles.js`: V2V brand color tokens, POI-cleaned styled roadmap, and custom dark mode styles.
- `mapMarkers.js`: Scalable circular SVG markers with 2px white ring, status dots (running emerald, standby violet, CCTV royal violet, sensor electric purple, solar amber), zoom-level scaling (18px at zoom <=13, 28px at zoom 14-16, 36px at zoom >=17), and render-time overlap nudging.
- `mapAdapters.js`: Pure functions converting between GeoJSON and Google Maps geometries.
- `MapToolbar.jsx`: Segmented layer chips (Boundary, Crop Zones, Borewells, CCTV, Soil Sensors, Power/Solar, Lines), live counts, all/none toggle, map style switcher (Hybrid, Clean, Dark), zoom/re-center controls, and farmer lock badge.
- `MapLegend.jsx`: Dynamic, collapsible legend reflecting only active layers and farm-specific crop zones.
- `CropDistributionPanel.jsx`: Collapsible HUD featuring a brand SVG donut chart showing used vs. available farm acreage and sub-field crop breakdowns.
- `MapDrawingStudio.jsx`: In-map drawing studio with draggable vertex handles, edge-click insertion, right-click deletion, live area/perimeter calculations, and a Save Revision modal with before/after stats and audit logging.
- `CoordinateNavigator.jsx`: Fly-to-coordinate controller supporting both DMS (e.g., `9°34'03.0"N 77°40'44.8"E`) and decimal degrees.

### B. Farmer Change Request Workflow
- `src/lib/changeRequestStorage.js`: Isolated additive storage key `agrimap.changeRequests.v1` with validation (20-1000 char description, max 3 attachments <= 5MB), rate limiting (10 requests/hr/farmer), role-scoping, and timeline history.
- `FarmerChangeRequestModal.jsx`: 9-type request modal (Add a device, Report a device problem, Move or correct device, Correct boundary, Change crop zone, Add infrastructure, Update farm details, Request report, Other inquiry) with character counter, review step, and ghost geometry generation.
- `FarmerRequestsDrawer.jsx`: Slide-out timeline drawer with status chips (`Submitted`, `Under review`, `Needs more info`, `Approved`, `Completed`, `Rejected`), reply interface for "Needs more info", and cancel action for "Submitted" requests.
- `AdminRequestsPage.jsx` (`/admin/requests`): Dedicated admin inbox with search, status filters, mini AgriMap with ghost shape review, and actions (Approve, Reject, Ask info, Open in Editor).

---

## 5. Verification & Test Suite Results
All unit test suites executed with **100% pass rate (30 passed, 0 failed)**:
- `node src/lib/coordinateParser.test.js`: 9 passed
- `node src/lib/mapPermissions.test.js`: 7 passed
- `node src/components/map/mapAdapters.test.js`: 6 passed
- `node src/lib/changeRequestStorage.test.js`: 8 passed
- `npm run build`: Production bundle compiled cleanly in 6.29s with 0 errors.

---

## 6. Screenshots & Visual Artifacts
Verified in browser across Farmer, Admin Requests, and Admin Land & Boundary Studio:
- Farmer Dashboard: `farmer_dashboard_1792585465424.png`
- Farmer Change Request Modal: `farmer_change_request_modal_1792585511285.png`
- Farmer Requests Drawer: `farmer_requests_drawer_1792585558188.png`
- Admin Requests Inbox: `admin_requests_inbox_1792585706842.png`
- Admin Land & Boundary Studio (Area Mismatch): `boundary_view_tab_1792585963526.png`
