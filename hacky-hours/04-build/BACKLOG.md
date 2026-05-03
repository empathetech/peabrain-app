# Backlog

Tasks queued for the current milestone. Removed when the PR merges; completed
work moves to [CHANGELOG.md](./CHANGELOG.md).

**Current milestone:** MVP — `v0.1.0` (Foundation slice)

---

## Foundation

- [ ] **Add LICENSE file and attribution**
  - MIT license at repo root, attributed to Empathetech (per LICENSING.md)
  - Branch: `chore/license`

- [ ] **Wire up Dexie with versioned schema**
  - Dexie dependency, initial schema module, version 1 declared
  - Migration scaffolding in place (no migrations yet, but the seam exists)
  - Branch: `feat/dexie-schema-v1`

- [ ] **Add vite-plugin-pwa for offline app shell**
  - PWA manifest, service worker registration, app shell precache
  - Verify offline reload works in a built preview
  - Branch: `feat/pwa-shell`

- [ ] **Set up CI pipeline (typecheck + lint + vitest + audit)**
  - GitHub Actions workflow on PR + push to `main`
  - Jobs: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm audit`
  - axe and plant-DB integrity jobs deferred until those modules exist
  - Branch: `ci/initial-pipeline`

- [ ] **Deploy to GitHub Pages on push to `main`**
  - GitHub Action that builds and publishes `dist/` to Pages
  - Confirm the live URL renders the Vite skeleton
  - Branch: `ci/gh-pages-deploy`
