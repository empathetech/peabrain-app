# Backlog

Tasks queued for the current milestone. Removed when the PR merges; completed
work moves to [CHANGELOG.md](./CHANGELOG.md).

**Current milestone:** MVP — `v0.1.0`

---

_Layout planner slice is up for review on `feat/layout-planner`. The next
slice (Plant DB authoring + plant-recommendation panel, Plantings,
JSON import/export, Pages + trust, Settings) gets queued after that PR
merges._

## Carried follow-ups

- **Axe + tab-order accessibility checks** in CI. Vitest + jsdom doesn't
  have a stable axe runner; pick a tool (axe-core in Playwright? jest-axe?)
  and wire it into the test pipeline. Manual pre-merge browser walkthrough
  covers it for now.
