# Testing Strategy

How we verify peabrain works, what the definition of "done" is, and
where we draw the line on test investment for a community-driven
project.

## Principles

1. **Test what's tricky, not what's trivial.** A high coverage number
   doesn't equal high confidence. Prioritize tests that catch the
   bugs we'd actually ship — domain logic, schema migrations,
   accessibility regressions, the rare-but-painful cases.
2. **Fast feedback over comprehensive feedback.** Unit + component
   tests must run in well under a minute locally. E2E tests run on
   PR and pre-release, not on every save.
3. **Brittle tests are deleted, not maintained.** A test that breaks
   every time the UI shifts is worse than no test — it trains the
   team to ignore failures. We delete and replace, not work around.
4. **Real environments where it matters.** IndexedDB, frost-date math,
   accessibility — test in real browsers where possible, not in
   simulated DOMs.
5. **Definition of done is human-verified, not just CI-green.** Some
   things (visual fidelity, keyboard ergonomics, the *feel* of a
   nudge firing) need eyes and hands.

## Tooling

| Layer | Tool | Why |
|-------|------|-----|
| Unit + component tests | **Vitest** + **React Testing Library** | Vite-native (no separate config), fast, Jest-compatible API |
| Mocking | Vitest's built-in `vi.mock` | Sufficient for our needs |
| End-to-end | **Playwright** | First-class TypeScript, multi-browser, great accessibility tooling |
| Accessibility (automated) | **axe-core** (`vitest-axe` for component tests, `@axe-core/playwright` for E2E) | Industry standard, mature |
| Schema validation | **Zod** | Single source of truth for runtime + compile-time validation |
| Lint | **ESLint** + `eslint-plugin-jsx-a11y` + `@typescript-eslint` | Catches a11y mistakes before they ship |
| Type-checking | **tsc --noEmit** in CI | TypeScript is part of the test strategy |
| Dep security | **`pnpm audit`** | High-severity findings block merge |

All testing dependencies are MIT or Apache (LICENSING.md compliant).

## Test layers

### 1. Unit tests — domain logic

The places where bugs cost the most:

- **Fit-tier calculations** (BUSINESS_LOGIC.md): exhaustive tests
  per dimension (zone, surface, sun, season) and aggregation rules.
  Includes corner cases: missing data, zone-boundary, depth right at
  the threshold, planter volume right at the threshold.
- **Seasonality math**: frost-date-relative window calculations,
  northern + southern hemisphere both, tropical fallback, leap-year
  edge cases.
- **Crop-rotation queries**: same family within 24 months across
  multiple plantings, status filtering, ignored future-planned
  entries.
- **Companion-planting symmetry lints**: every "B is bad with A"
  has a matching "A is bad with B" in the plant DB.
- **Recommendation ordering**: tier ranking + alphabetical tie-break,
  illegal/invasive exclusion, permit-required inclusion with warning.
- **Cost and yield rollups**: multi-currency handling (no FX), unit
  grouping, exclusion of `ready` surfaces.
- **Expected-harvest-window computation**: planted date + days-to-
  maturity range, missing data handling.
- **Schema migrations**: every prior schema version migrates to
  current correctly. Snapshots of pre-migration data captured before
  release.

These are pure functions or close to it; trivial to test exhaustively.

### 2. Component tests — UI in isolation

For each user-facing component:

- Renders correctly with realistic props
- Behaves correctly under keyboard interaction
- Exposes the right ARIA semantics (verified via axe + targeted
  assertions)
- Reflects state changes (e.g., fit badge updates when surface depth
  changes)

We don't test every styling permutation — that's what the visual
regression layer is for.

Heavy components that warrant extra coverage:

- **Plant card** — fit badge rendering across all tiers and warning
  combinations
- **Surface** — visual variant per type, build-status pill rendering
- **Layout canvas** — render correctness, not interaction (interaction
  is E2E)
- **Recommendation panel** — filter behavior, empty states
- **Form fields** with validation (location, frost dates, garden
  bounds)

### 3. Integration tests — IndexedDB and friends

The IndexedDB layer is too important to mock everywhere. We use
**fake-indexeddb** in Node-based Vitest tests for fast iteration, and
real-browser IndexedDB in Playwright tests for end-to-end coverage.

Specifically tested:

- Garden CRUD round-trips through Dexie
- Schema migrations on real IDB
- Concurrent writes (last-write-wins, no corruption)
- Quota-exceeded handling — does the app surface a useful error?
- Export → wipe IDB → import → identical state

### 4. End-to-end tests — critical journeys

We test all five critical journeys from USER_JOURNEYS.md:

| Journey | E2E coverage |
|---------|--------------|
| 1. First-time space layout | Land → set location → name garden → drop surfaces of each type → paint sun zones → reach Journey 2 |
| 2. Populate surfaces | Click surface → see recommendations → place plant → see fit/warnings → cost/yield rollup updates |
| 3. Returning user | Pre-seeded garden → status transitions (planned → growing → harvesting → done) → notes added |
| 4. Export | JSON export downloads; SVG/PNG/HTML downloads; round-trip JSON re-imports identically |
| 5. Import | Drag-drop import → schema-version migration → ID-conflict resolution → garden visible |

E2E tests also exercise:

- Offline mode (service-worker-served app shell still works)
- Reduced-motion preference (animations skip)
- Light/dark mode toggle
- Touch interaction patterns on a Playwright mobile viewport
- Keyboard-only navigation through Journey 1 + Journey 2

Each E2E test runs against Chromium, Firefox, and WebKit on PR; full
matrix on pre-release.

### 5. Accessibility tests

Three layers, mirroring ACCESSIBILITY.md:

| Type | Cadence | Tool |
|------|---------|------|
| Automated rule violations | Every PR | axe-core in component + E2E tests |
| Keyboard navigation | Every PR touching UI | Manual; pre-merge checklist |
| Screen-reader walkthrough | Pre-release | Manual; NVDA + Chrome and VoiceOver + Safari |

axe failures block merge. False positives are documented with
inline suppression and a comment, not blanket-disabled.

### 6. Visual regression

The layout planner is SVG-heavy and benefits from screenshot-based
checks. Playwright's screenshot diffing covers:

- Each surface type rendered in light + dark mode
- Sun-zone overlay treatments
- Fit badge variants
- Plant cluster icons across status states
- Empty states

These tests are tolerated to be slightly flaky — when a font shifts a
pixel or a theme tweak ripples through, we update baselines
deliberately. The goal is "did anything change unexpectedly?", not
"is this pixel-perfect."

### 7. Plant DB integrity tests

Run as a Vitest suite on every PR that touches the plant DB:

- Every plant has required fields (id, scientificName, family,
  surfaceFit, sunNeeds, sources)
- IDs are unique and stable (slug format, lowercase, no spaces)
- `companions.bad` and `companions.good` reference real plant IDs
- Companion relationships are symmetric (B in A.bad ↔ A in B.bad)
- `legalFlags` keys are valid ISO region codes
- `legalFlags[].asOf` dates parse and aren't in the future
- `zoneFit` keys are valid Köppen codes
- `daysToMaturity` is `[min, max]` with min ≤ max
- `seasonality` windows are coherent (start before end)
- `sources` is non-empty (every plant has at least one cited source)

These run fast and prevent the kind of typos that break the
recommendation engine silently.

## What we *don't* test

- **Every prop combination** of every component. We test what
  matters semantically; visual regression catches unexpected
  rendering changes.
- **The browser itself.** We trust the platform.
- **Node module internals.** We trust our deps; if a bug surfaces,
  we test the integration after fixing.
- **Performance at extreme scales.** A backyard with 1000 plantings
  isn't a realistic case. We test with up to ~50 surfaces and ~200
  plantings per garden — well above expected use.
- **Localization correctness for every locale.** We test that the
  i18n machinery works (string lookup, RTL flipping, plural rules)
  with at least two locales (English + one RTL); we don't verify
  every translated string makes sense.

## Definition of done

A change is not done until **all** of these are true. This expands
the framework's pre-merge checklist for peabrain specifically:

```
Code:
[ ] Implementation matches the relevant design document(s)
[ ] No secrets, API keys, or credentials in code or commit history
[ ] All user input that crosses a trust boundary is validated
[ ] Error messages don't expose internal system state
[ ] No dangerouslySetInnerHTML; user content rendered as text nodes
[ ] No new dep added without LICENSING.md compatibility check

Tests:
[ ] Domain logic changes have unit tests covering happy + edge cases
[ ] Schema changes have a migration + a migration test
[ ] UI changes have axe-clean component tests
[ ] User-facing flows changed → corresponding E2E test updated
[ ] tsc --noEmit passes
[ ] pnpm audit reports no high-severity findings

Manual:
[ ] Change tested by keyboard alone for the affected flow
[ ] Change verified in light + dark mode
[ ] Change verified at mobile viewport (≤ 480 px wide)
[ ] If touching the layout planner: verified with a screen reader
```

## CI pipeline

Triggered on every push to a PR branch:

```
1. Install deps (cached)        ~30 s
2. tsc --noEmit                 ~15 s
3. ESLint (with jsx-a11y)        ~10 s
4. Vitest (unit + component)     ~30 s
5. Plant DB integrity suite      ~5 s
6. pnpm audit                    ~5 s
7. Playwright (E2E + visual)    ~3-5 min
8. Bundle size check             ~5 s
```

Stages 1–6 must pass to merge; stage 7 must pass on the final PR
state before merge. Stage 8 fails the build only if the bundle
exceeds an agreed budget (defined at first stable release).

On `main` after merge: deploy to GitHub Pages via `actions/deploy-pages`.

## Manual testing cadence

| Cadence | Activities |
|---------|-----------|
| Every PR | Keyboard test for affected flow, light/dark check, mobile-viewport check |
| Pre-release tag | Full screen-reader pass on Journeys 1–5 (NVDA + Chrome and VoiceOver + Safari) |
| Each milestone | Real-world garden test — actually plan a real garden in peabrain end-to-end and note friction |
| Each milestone | axe full-app sweep against the deployed build |
| Each milestone | Lighthouse run (performance, PWA, a11y, best practices) |

The milestone-cadence "actually plan a garden" test is non-negotiable.
A tool you don't dogfood is a tool that doesn't work.

## Test data and fixtures

- **Sample garden fixtures** live in `src/__fixtures__/`: small
  realistic gardens covering different climates, surface mixes, and
  planting states. Used in component tests and E2E.
- **Pre-migration snapshots** for every released schema version live
  in `src/__fixtures__/migrations/` with a brief comment about what
  changed.
- **Plant DB test subset** — a tiny version with ~10 plants for fast
  unit tests; integration tests use the real bundled DB.

## Performance budgets

Set at first stable release; tracked in CI to prevent regressions.

| Metric | Target |
|--------|--------|
| Initial bundle | TBD (likely ≤ 250 KB gzipped JS) |
| Plant DB lazy-load | TBD (likely ≤ 200 KB gzipped) |
| Lighthouse Performance | ≥ 90 on mobile profile |
| Time-to-interactive on a mid-tier phone | ≤ 3 s |

These are not gates at MVP — they're targets we measure against. They
become gates once we have real numbers to anchor on.

## Open questions

- **Property-based tests?** The fit-tier model and frost-date math
  are excellent fits for `fast-check` (property-based testing in
  Vitest). Would catch rare edge cases. Defer to first time we ship
  a fit-tier bug; revisit then.
- **Visual regression in CI vs. nightly.** Screenshot diffs flake
  with font and rendering changes. May move to a nightly job rather
  than gating PRs if flake rate gets annoying.
- **Cross-device testing service.** BrowserStack / Sauce Labs offer
  real-device matrices. Probably overkill for MVP; revisit if we
  see device-specific bug reports.
- **Mutation testing.** Tools like Stryker measure how *useful* tests
  actually are by mutating code and checking if tests fail. Worth
  exploring once the test suite stabilizes.
