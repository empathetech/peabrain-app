# Changelog

Shipped work, grouped by release. Items move here from
[BACKLOG.md](./BACKLOG.md) as their PRs merge.

## v0.1.0 — Unreleased

_MVP — Foundation slice complete; Onboarding slice in progress._

### Added

- Bundled the Beck et al. (2023) Köppen-Geiger climate zone map at 1°
  resolution (CC BY 4.0). The grid lives at
  `public/data/koppen/grid.json` (~150KB, ~8KB gzipped) with
  attribution in `attributions.md`. A regeneration script
  (`scripts/build-koppen-grid.mjs`) reads the upstream GeoTIFF and
  rebuilds the JSON; `src/db/koppen.ts` hydrates the `koppenCells`
  Dexie table on first load and resolves lat/lon to a Köppen code at
  lookup time. Workbox precache now includes the bundled grid for
  offline use.

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
