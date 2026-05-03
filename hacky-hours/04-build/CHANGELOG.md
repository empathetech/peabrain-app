# Changelog

Shipped work, grouped by release. Items move here from
[BACKLOG.md](./BACKLOG.md) as their PRs merge.

## v0.1.0 — Unreleased

_MVP — Foundation slice in progress._

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
