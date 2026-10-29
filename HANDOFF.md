# V2V AgriMap DSP — Implementation & Handoff Report

- **Date**: 2026-10-29
- **Branch**: `update/2026-10-29-agrimap-integration`
- **Base Branch**: `main`
- **Compare / PR URL**: https://github.com/KishoreKumar0407/newDsp/compare/main...update/2026-10-29-agrimap-integration
- **Status**: Not merged — needs teammate review

---

## 1. Executive Summary
This branch consolidates and finalizes the complete **V2V AgriMap DSP Platform**:
1. **ONE Shared Interactive Google Map (`AgriMap.jsx`)**: Seamlessly shared across Farmer (`/farmer`), Admin Land & Boundary Studio (`/admin/editor/:fieldId`), and Surveyor (`/map/:fieldId`) portals.
2. **Farmer Change Request Workflow**: Complete 9-type request pipeline with attachment constraints, role validation, status lifecycle, and a dedicated Admin Inbox (`/admin/requests`).
3. **FarmXT Modern Authentication**: Centralized auth configuration (`authConfig.js`), role-based dashboard routing, and zero-error navigation.
4. **V2V Logo & Navigation Flow**: Clicking the V2V logo returns the user directly to their role-specific dashboard. A persistent "Go back" button provides reliable step-back navigation across all pages.
5. **Consumer & Dealer Portals**: Full catalog, bulk buying, cart, checkout, and order history pages functional with zero errors.

---

## 2. How to Get and Run It

To pull and run this work locally:

```powershell
# 1. Fetch latest refs and checkout branch
git fetch origin
git checkout update/2026-10-29-agrimap-integration

# 2. Install dependencies & run frontend tests
cd frontend
npm install
npm test

# 3. Start the development server
npm run dev
```

---

## 3. Environment Variable Names Only

Place local secrets in `.env.local` (never commit real values):
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps JavaScript API key with Maps, Marker, Geometry, and Places libraries enabled.
- `VITE_GOOGLE_MAP_ID`: Vector / Advanced Marker Map ID.
- `VITE_API_URL`: Backend API base URL (defaults to `http://localhost:8000`).
- `OPENAI_API_KEY`: (Backend optional) For AI demand and scoring insights.

---

## 4. Secrets & Security Enforcement
- **Known Exception**: Commits `7ccc33d`, `cd347dc`, and `9bcd346` contained the old Google Maps key in the git history. As directed, no force push or history rewrite was performed; the key was rotated in Google Cloud Console.
- **Working Tree Sanitization**:
  - `README.md`, `frontend/.env.example`, and `.env.example` scrubbed of all key strings.
  - Active keys loaded only from gitignored `frontend/.env.local`.
  - Secret scan check verified: 0 new secrets in diff or working tree.

---

## 5. Data Integrity & Cadastral Preservation
- **Saved Farmer Data Untouched**: The baseline JSON dump `baseline/farmer-data-before.json` (SHA256: `525172C2AF0305FC213C558C30DED126C03098B06114ECB48D6207EE79CA4C14`) confirms stored farm geometries, crop zones, devices, and metadata were not migrated, re-seeded, or altered.
- **Stored Coordinate Format**: Stored GeoJSON `[lng, lat]` coordinates are strictly preserved. Conversion to Google `{lat, lng}` occurs only in runtime adapters (`mapAdapters.js`).
- **Cadastral Area Mismatch Resolution**:
  - **Farm 1 (Ganesh V.)**: Registered = 21.4 acres (8.66 ha) vs. Mapped = 76.9 acres (31.12 ha) (+259.3% mismatch).
  - **Resolution**: Both values are displayed side-by-side in Admin Land & Boundary Studio with an amber **"Area mismatch: review boundary"** warning card and a non-destructive cadastral explanation dialog. The farmer portal explicitly displays the legal registered 21.4 acres.

---

## 6. Key Architectural Components

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

## 7. Verification & Test Suite Results
All unit test suites executed with **100% pass rate (39 assertions passed, 0 failed)**:
- `mapAdapters.test.js`: 6 passed
- `mapErrorAndStyling.test.js`: 8 passed
- `changeRequestStorage.test.js`: 8 passed
- `coordinateParser.test.js`: 10 passed
- `mapPermissions.test.js`: 7 passed
- `authIntegration.test.js`: 4 passed
- `npm run build`: Production bundle compiled cleanly in 7.14s with 0 errors.

---

## 8. Known Issues
- **Cadastral Area Variance**: Legal registered land area differs from satellite polygon area for demo farms; handled gracefully by presenting both metrics with an amber advisory.
- **Historical Git Commits**: Commits `7ccc33d`, `cd347dc`, and `9bcd346` contain the legacy API key. Key is revoked and rotated in Google Cloud.

---

## 9. Rules for Teammates
- **No Force Push**: Never run `git push --force` or rewrite history.
- **Branch Workflow**: Do not commit directly to `main`. Create feature/update branches and open PRs for review.
- **Credential Hygiene**: Never commit API keys, tokens, or credentials into repository files.
- **Data Preservation**: Stored farm GeoJSON data must not be mutated or wiped.
