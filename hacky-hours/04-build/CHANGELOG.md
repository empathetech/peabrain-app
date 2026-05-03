# Changelog

Shipped work, grouped by release. Items move here from
[BACKLOG.md](./BACKLOG.md) as their PRs merge.

## v0.1.0 — Unreleased

_MVP — Foundation slice complete; Onboarding slice in progress._

### Changed

- **Schema v2 (Dexie migration):** `Garden.bounds.heightCm` →
  `Garden.bounds.lengthCm`. The original name implied a vertical
  third dimension, which Garden bounds do not represent — they're a
  top-down 2D footprint. Existing rows are migrated automatically on
  app load. `DATA_MODEL.md` updated.
- The Location form now takes a single combined "Where is your
  garden?" input with examples in the placeholder and a hint to
  include state/region/country when the city name is common (e.g.
  "Portland, OR" vs "Portland, ME"). Nominatim handles free-form
  queries fine and the previous split city/country fields lost
  important disambiguation context. Hint also notes that postal
  codes and "lat, lon" pairs are accepted.
- Location error messages clarified: "couldn't find" now suggests
  spelling / larger city / postal-code / lat-lon alternatives, and
  the no-climate-data path no longer claims "ocean cell" — it now
  shows what Nominatim resolved (label + coords) and explains that
  small islands or coastal points can fall into a 1° water cell.
- The canvas scale ruler now shows "3 ft" for imperial gardens
  (instead of always "1 m"). 3 ft (~91 cm) is roughly the same
  visual length as 1 m, so the ruler stays a comparable size.

### Fixed

- Köppen and frost lookups now resolve correctly for every land cell.
  The bucket math in `src/db/koppen.ts` and `src/db/frost.ts` was
  rounding compound-key values to integers (e.g. `45.5 → 46`), so
  every Dexie lookup missed against cells stored at half-integer
  centres (`45.5`, `-122.5`, etc.) and the UI surfaced the result as
  "ocean" — even for landlocked cities like Portland. Round-trip
  regression test added.

### Added

- Scaffolded Vite + React + TypeScript app at the repo root. `pnpm dev`,
  `pnpm build`, and `pnpm preview` are wired up.
- Enabled TypeScript strict mode and `noUncheckedIndexedAccess` across
  `tsconfig.app.json` and `tsconfig.node.json`.
- Added ESLint flat config with `typescript-eslint`, `eslint-plugin-react`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, and
  `eslint-plugin-jsx-a11y`. Pinned to ESLint 9 (plugin ecosystem hasn't
  caught up to ESLint 10 yet). `pnpm lint` and `pnpm typecheck` scripts
  wired up.
- Wired up Dexie with a v1 schema covering all DATA_MODEL.md tables
  (gardens, surfaces, sunZones, plantings, plants, koppenCells,
  frostDateCells, zones, regions, dataVersions). Domain types live in
  `src/db/types.ts`; the schema seam supports versioned migrations as
  shape-changes land.
- Added `vite-plugin-pwa` with an autoUpdate service worker, app-shell
  precache via Workbox, and a minimal web app manifest. The SW is
  registered in `src/main.tsx`. Offline reload should work after a
  production build (`pnpm build && pnpm preview`).
- Added Vitest with jsdom + Testing Library, a setup file pulling in
  `@testing-library/jest-dom`, and a smoke test asserting the v1 Dexie
  schema declares all DATA_MODEL.md tables.
- Added a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that
  runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, and
  `pnpm audit --prod` on PRs and pushes to `main`. Axe and plant-DB
  integrity jobs land alongside their respective modules.
- Added a GitHub Pages deploy workflow (`.github/workflows/deploy.yml`)
  that builds the production bundle and publishes `dist/` to Pages on
  push to `main`. Vite `base` is set to `/peabrain-app/` for production
  so assets resolve under the repo subpath.
- Bundled the Beck et al. (2023) Köppen-Geiger climate zone map at 1°
  resolution (CC BY 4.0). The grid lives at
  `public/data/koppen/grid.json` (~150KB, ~8KB gzipped) with
  attribution in `attributions.md`. A regeneration script
  (`scripts/build-koppen-grid.mjs`) reads the upstream GeoTIFF and
  rebuilds the JSON; `src/db/koppen.ts` hydrates the `koppenCells`
  Dexie table on first load and resolves lat/lon to a Köppen code at
  lookup time. Workbox precache now includes the bundled grid for
  offline use.
- Bundled a derived frost-date grid at `public/data/frost/grid.json`
  (~370KB raw, ~6KB gzipped) generated from the Köppen grid via a
  per-zone heuristic anchored against published frost climatology. The
  grid is hemisphere-shifted; tropical / hot-arid / polar cells are
  null. Generator script lives at `scripts/build-frost-grid.mjs`;
  `src/db/frost.ts` hydrates `frostDateCells` on first load.
  Approach + alternatives + V1 upgrade path documented in ADR
  [`2026-05-03-frost-date-heuristic-mvp.md`](../02-design/decisions/2026-05-03-frost-date-heuristic-mvp.md);
  ROADMAP updated to reference the ADR.
- Added `react-router-dom` 7 with a `HashRouter` (compatible with the
  GitHub Pages subpath deploy) and four routes: `/` (Welcome),
  `/location`, `/garden`, `/canvas`. Unknown paths redirect to
  Welcome.
- Replaced the Vite scaffold's CSS with peabrain design tokens from
  `STYLE_GUIDE.md`: full palette (brand, status, light/dark
  neutrals), modular type scale (1.125 ratio, 16px base), 4px spacing
  grid, 44px tap-target minimum, and `prefers-reduced-motion`
  handling.
- Built the Welcome screen — heading, tagline, intro copy synthesized
  from `PRODUCT_OVERVIEW.md`, and Start-fresh / Import-a-plan
  actions. Returning users with an active garden in localStorage are
  redirected straight to `/canvas`. Import wiring is deferred — the
  file picker exists but JSON-import logic lands later.
- Built the Location form — typed city + country, single-shot
  Nominatim geocoding (fair-use compliant, identifying email),
  coordinate rounding to 0.1° per `SECURITY_PRIVACY.md`, Köppen +
  frost lookup, and a confirmation panel showing the resolved zone +
  description + hemisphere + frost dates with the heuristic's
  ±21-day uncertainty surfaced.
  - `src/services/geocode.ts` — Nominatim client + `roundCoord`
  - `src/db/koppen-meta.ts` — code → human description (Beck legend)
  - `src/state/OnboardingContext.tsx` — sessionStorage-backed
    Location draft carried between routes
- Built the Garden creation form — name, dimensions (with metric /
  imperial unit toggle, normalized to centimetres for storage),
  validation. Inserts the Garden via Dexie and stamps the new id as
  the active garden in localStorage.
  - `src/services/active-garden.ts` — localStorage wrapper
- Built the empty bird's-eye Canvas route. Loads the active garden
  from Dexie, renders garden name + location + Köppen description,
  and displays the empty plot in an SVG canvas with hand-rolled pan
  / zoom (no third-party canvas library, per `ARCHITECTURE.md`).
  - `GardenCanvas` — viewBox-based pan + zoom, viewport-anchored
    wheel zoom, pointer drag to pan, full keyboard model
    (arrows / +/- / 0 / Home), `role="application"` with descriptive
    aria-label, 44×44 toolbar buttons, subtle 1m grid pattern, 1m
    scale ruler, soil-stroked plot rectangle.
- Wired the onboarding flow end-to-end:
  - `src/state/grid-bootstrap.ts` kicks off Köppen + frost
    hydration in the background on app boot, so the first geocode
    isn't blocked
  - Welcome → /canvas redirect for returning users
  - GardenSetup → /location redirect when no draft Location
  - Canvas → / redirect when no active garden
  - Skip-to-main-content link visible on focus
- Tests across the slice: geocode parsing + error paths + rounding,
  Welcome (heading / Start-fresh navigation / Import button /
  returning-user redirect), Location (resolution / no-results /
  confirm-and-navigate), GardenSetup (metric + imperial save flow,
  validation, no-location redirect), Canvas (no-garden redirect,
  header rendering, SVG accessible label). 28 tests across 8 files.
