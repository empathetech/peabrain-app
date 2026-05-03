# Backlog

Tasks queued for the current milestone. Removed when the PR merges; completed
work moves to [CHANGELOG.md](./CHANGELOG.md).

**Current milestone:** MVP — `v0.1.0` (Onboarding slice)

---

## Onboarding (Journey 1 — space first)

- [ ] **Bundle Köppen-Geiger climate zone grid**
  - Pick + commit an open-licensed dataset (e.g., Beck et al. 1km map,
    downsampled to ~1° grid for bundle size)
  - Convert to a compact JSON or binary format under `public/data/koppen/`
  - Source + license recorded in `public/data/koppen/attributions.md`
  - Loader hydrates `koppenCells` table on first run; idempotent
  - Branch: `feat/koppen-grid`

- [ ] **Bundle frost-date grid**
  - Pick + commit an open-licensed frost-date dataset (e.g., GHCN-derived)
  - Same shape: `public/data/frost/` with `attributions.md`, ~1° resolution
  - Loader hydrates `frostDateCells` table; idempotent
  - Branch: `feat/frost-grid`

- [ ] **Add client-side routing**
  - React Router with routes for Welcome, Location, Garden setup, Canvas
  - HashRouter to avoid Pages 404s on refresh; revisit if we move off Pages
  - Branch: `feat/routing`

- [ ] **Welcome screen**
  - One paragraph of copy from PRODUCT_OVERVIEW.md
  - "Start fresh" + "Import" buttons (Import wired to JSON file picker; defers
    actual import logic to a later task — for now just routes to a placeholder)
  - First route the app shows when no Garden exists yet
  - Branch: `feat/welcome-screen`

- [ ] **Location input form**
  - Typed city + country input; no browser geolocation (deferred to V1)
  - On submit: geocode (Nominatim per fair-use, with rate limiting + UA)
    → resolve `koppenCode`, `hemisphere`, frost dates from bundled grids
  - Round stored coords to 0.1° per SECURITY_PRIVACY.md
  - Render "Your zone is X — typical climate is Y" confirmation before continuing
  - Branch: `feat/location-input`

- [ ] **Garden creation form**
  - Name, plot dimensions (widthCm × heightCm), units preference (metric/imperial)
  - Persists to `gardens` table via Dexie; sets `createdAt`/`updatedAt`
  - Carries forward Location resolved in the previous step
  - Branch: `feat/garden-create`

- [ ] **Empty bird's-eye canvas**
  - SVG canvas component sized to the garden's bounds, displayed at scale
  - Pan/zoom hand-rolled (no third-party canvas library) per ARCHITECTURE.md
  - No surfaces yet — just an empty plot with rulers/scale indicator
  - Renders when a Garden exists; replaces Welcome screen on subsequent visits
  - Branch: `feat/canvas-shell`

- [ ] **Onboarding flow wiring**
  - Routing logic: no Garden → Welcome; mid-onboarding → continue from last step;
    Garden exists → Canvas
  - State for in-progress garden creation (zustand or React context — pick one)
  - Loading + error states for grid hydration and geocoding
  - Branch: `feat/onboarding-flow`
