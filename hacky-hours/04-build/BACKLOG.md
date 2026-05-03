# Backlog

Tasks queued for the current milestone. Removed when the PR merges; completed
work moves to [CHANGELOG.md](./CHANGELOG.md).

**Current milestone:** MVP — `v0.1.0` (Foundation slice)

---

## Foundation

- [ ] **Set up CI pipeline (typecheck + lint + vitest + audit)**
  - GitHub Actions workflow on PR + push to `main`
  - Jobs: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm audit`
  - axe and plant-DB integrity jobs deferred until those modules exist
  - Branch: `ci/initial-pipeline`

- [ ] **Deploy to GitHub Pages on push to `main`**
  - GitHub Action that builds and publishes `dist/` to Pages
  - Confirm the live URL renders the Vite skeleton
  - Branch: `ci/gh-pages-deploy`
