# Roadmap

What gets built when. Each tier corresponds to a milestone and a
GitHub release tag. Items are **outcome-based**, not task-based —
"a user can do X" rather than "implement Y." Implementation tasks
land in [BACKLOG.md](../04-build/BACKLOG.md) once a milestone is in
flight.

## Milestone framing

| Milestone | Tag | Outcome the user reaches |
|-----------|-----|--------------------------|
| **MVP** | `v0.1.0` | A user can lay out a small garden and see which plants fit, with the climate, surface, sun, and season all considered, and save their plan to a file. |
| **V1** | `v1.0.0` | The MVP, plus sun-zone painting, companion + rotation warnings, cost + yield rollups, cloud sync, multi-garden support, and visual exports. |
| **V2+** | `v2.0.0+` | The decision-making garden companion: photo diagnosis, watering and pest awareness, full localization, and (eventually) social sharing. |

The MVP is deliberately the smallest version that proves peabrain's
*core value*: location-aware, surface-scoped plant fit for backyard
gardeners. Anything that doesn't directly serve that bar is V1 or
later.

---

## MVP — `v0.1.0`

**Outcome:** *A user can lay out a small garden, see which plants fit
each surface, place plants with awareness of climate / surface fit /
sun-default / season, and save their plan to a file they own.*

### Foundation

- React + TypeScript + Vite app skeleton
- TypeScript strict mode + ESLint + jsx-a11y rules
- IndexedDB persistence via Dexie with versioned schema
- Service worker via `vite-plugin-pwa` — app shell offline-cached
- GitHub Pages deployment via GitHub Action on push to `main`
- CI pipeline: typecheck, lint, vitest, axe, plant DB integrity, pnpm audit
- LICENSE file at repo root, attribution to Empathetech

### Onboarding (Journey 1 — space first)

- Welcome screen (one paragraph + Start fresh / Import buttons)
- Set location: typed input only (city + country); browser geolocation deferred to V1
- Climate zone identified from bundled Köppen-Geiger grid
- Hemisphere-aware seasons resolved from frost-date grid (bundled,
  derived heuristically from the Köppen grid for MVP — see
  [ADR 2026-05-03](../02-design/decisions/2026-05-03-frost-date-heuristic-mvp.md);
  V1 replaces with derived data from a real climatology)
- Garden creation: name, rough plot dimensions, units preference
- Empty bird's-eye canvas appears at scale

### Layout planner (3 of 4 surface types)

- Add surfaces: in-ground plot, raised bed, planter — **trellis deferred to V1** (the 2.5D treatment is the most complex)
- Place, size, and edit surfaces on the canvas
- SVG rendering with hand-rolled pan/zoom
- Capture build/buy/existing per surface (status display deferred to V1)
- Each surface type has its distinct visual treatment per STYLE_GUIDE.md
- Keyboard-only operability: Tab/Enter/Space/Arrow/Escape model from ACCESSIBILITY.md

### Populating surfaces with plants (Journey 2)

- Surface-scoped plant recommendations panel (open from a clicked surface)
- Curated plant database **starting at ~20 common food plants** — tomatoes, lettuce, beans, peppers, herbs, etc. **Authoring approach:** LLM-assisted first-pass curation grounded in open datasets (USDA PLANTS, Permapeople, GBIF, Wikidata, Royal Horticultural Society material where licensing allows), with human review of every entry before it ships. Sources cited per plant in `attributions.md`.
- Fit-tier computation across all 4 dimensions (zone, surface, sun, season) per BUSINESS_LOGIC.md
- Fit badges (great / decent / stretch / impossible) on plant cards
- Place plant in surface; quantity badge for cluster
- Inline fit warnings: "a bit shallow for carrots", "expect lower yield in this zone"
- Legal/invasive handling: illegal plants hidden from search; invasive plants gated with typed-confirm
- Sun fit defaults to "stretch" when no sun zones mapped (sun-zone painting is V1) with a "map sun for better fit" nudge

### Plantings

- Place + edit plantings inside surfaces
- Three of four lifecycle states: `planned`, `active`, `done` (the four-state `growing/harvesting` distinction lands in V1)
- `endedReason` capture (harvested / failed / removed)
- Free-form notes on garden, surface, planting, and sun zone (sun zones come V1)

### Data and persistence

- Garden + surfaces + plantings persist across page reloads (IndexedDB)
- localStorage for user preferences (units, theme, last-used location)
- JSON export (full round-trippable garden export per DATA_MODEL.md)
- JSON import via file picker (drag-drop deferred to V1)
- Schema versioning + migration infrastructure (one version exists today; the machinery has to work from day one)

### Visual + accessibility baseline

- Light + dark mode with system-preference default
- All STYLE_GUIDE.md hex pairs verified for WCAG AA contrast (audit doc committed)
- Color never sole carrier of meaning (icons + labels everywhere)
- Visible focus indicators; skip-link to main
- `prefers-reduced-motion` honored
- aria-live region for save status; assertive region for errors
- SVG canvas a11y model: `role="application"`, labeled groups for surfaces, labeled `role="img"` for plantings
- Keyboard drag-and-drop via dnd-kit
- axe-core clean across all components

### Pages and trust

- `/privacy` — what we collect, where it lives, what we never do
- `/terms` — MIT, gardening + legal + medical disclaimers, warranty disclaimer
- `/accessibility` — accessibility statement
- `/about` — what peabrain is, who Empathetech is, how to report issues
- `SECURITY.md` at repo root

### Settings

- Location (with edit + clear)
- Units (metric / imperial)
- Theme (light / dark / system)
- Data export/import affordances

### Out of scope for MVP (intentional cuts)

- Browser geolocation (typed input only) → V1
- Sun-zone painting → V1
- Trellis surface → V1
- Companion-planting warnings → V1
- Crop-rotation warnings → V1 (needs historical data anyway)
- Cost + yield rollups (data model captures the inputs; aggregation view comes V1)
- Build-status workflow (planned/in-progress/ready) → V1
- Visual exports (SVG / PNG / HTML) → V1 (JSON export only at MVP)
- Cloud sync → V1
- Multi-garden UI (data model supports it; UI shows one garden at a time) → V1
- Frost-date user override → V1
- Drag-drop import → V1
- Backup reminders → V1
- i18n machinery + RTL → V1
- Visual regression tests → V1

---

## V1 — `v1.0.0`

**Outcome:** *Peabrain becomes genuinely useful for an entire growing
season. The user can map their yard's actual conditions, get
neighborhood-aware planting advice, see whether the project is
worth the cost, share visual plans, and sync to their cloud.*

### Layout enrichment

- **Trellis surface** with elevation hint and lattice rendering
- **Sun-zone painting** — full-sun / partial-AM / partial-PM / shade
- Sun fit recomputes across all plantings when zones change
- **Build-status workflow** — planned / in-progress / ready, with the toolbar pills

### Plantings enrichment

- Four-state lifecycle: `planned → growing → harvesting → done`
- Computed expected-harvest window
- UI nudges for state transitions when window opens
- Crop-rotation warnings (uses historical `plantedDate` + plant family)
- Companion-planting warnings on adjacent plants

### Cost and yield

- Cost rollup view: surfaces + plant seeds, grouped by currency
- Yield rollup view: range estimates with disclaimer per BUSINESS_LOGIC.md
- "Is this worth it?" framing visible during planning

### Multi-garden

- Garden list / switcher in the header
- Per-garden settings (units override, location override)
- Garden duplication

### Frost dates and location

- Browser geolocation opt-in (one-tap "use my location") with rounding to 0.1°
- Reverse geocoding via Nominatim (per fair-use policy)
- User-overridden frost dates on a per-garden basis
- Detailed climate zone information page (what your zone means)

### Exports and imports

- SVG export (already free since the canvas IS SVG; needs UI affordance + print/screen styling)
- PNG export (rasterize SVG)
- HTML export (printable + interactive)
- Drag-drop file import anywhere on the page
- Improved import experience: schema-version migration, ID-conflict resolution

### Cloud sync — Google Drive only

- OAuth flow with `drive.file` scope
- Manual "save to Drive" / "load from Drive" actions
- Token storage session-scoped per SECURITY_PRIVACY.md
- Settings affordance to revoke access

### Plant DB growth

- Expand from ~20 to ~50 plants (same LLM-assisted, human-reviewed authoring approach)
- Per-plant attribution sources documented
- Add zone-fit data for top 5 Köppen zones globally (covers most users)
- **"Suggest a plant" affordance in the app** — opens a pre-filled GitHub Issue with the user's reasoning. Lightweight community contribution path before the full curation pipeline (V2+) is built.

### i18n + RTL infrastructure

- Translation table; no hardcoded English strings
- App reflows under `dir="rtl"` end-to-end
- Date/number formatting via `Intl`
- Plant common names support multiple locales (data shipped for English; structure supports adding more)

### Trust + UX polish

- Periodic "you haven't backed up in N days" reminder for users without cloud sync
- "Sync conflict" detection on import (don't silently overwrite)
- Empty-state copy + illustrations for first-run feel
- More forgiving keyboard shortcuts and discoverability (`?` opens shortcut reference)

### Quality

- Visual regression suite via Playwright screenshots
- Property-based tests for fit-tier and frost-date math (revisit need)
- Lighthouse PWA / Performance / A11y scores tracked in CI
- Bundle size budget set and enforced

---

## V2+ — `v2.0.0` and beyond

**Outcome:** *Peabrain becomes a year-round gardening companion that
helps with real care decisions, not just planning.*

The order within V2+ is intentionally loose — each item is a real
project of its own.

### Plant photo diagnosis

- Cloudflare Worker (or equivalent) at a separate subdomain
- Single `POST /diagnose` endpoint forwarding to a vision model
- Per-photo, per-explicit-action, no retention
- Privacy spec from SECURITY_PRIVACY.md applied
- Client-side capture / upload UX with clear "third-party AI" disclosure

### Care-time features

- **Watering / irrigation planning** — per-plant cadence recommendations; basic irrigation layout
- **Pest / disease awareness** — climate + plants → likely pests and how to spot them
- Pairs naturally with photo diagnosis

### Plant DB expansion

- Grow to several hundred plants
- Multiple locales for common names (Spanish, French, Portuguese, German, Mandarin to start)
- Plant photography library under permissive licenses

### OneDrive sync

- Same model as Google Drive integration

### Plant curation pipeline (community + LLM, in-app)

A real product feature, not just a content effort. The vision:

- **Browse the bundled DB** — every shipped plant is viewable in-app with its data and attribution sources
- **Custom local plants** — users add plants not in the curated DB; clearly marked "user-added"; lives in the user's IndexedDB only
- **Submit a plant proposal** — users can submit a custom plant (or amendments to an existing one) for review and inclusion in the bundled DB
- **LLM-assisted draft generation** — given a plant scientific name, the pipeline drafts a candidate entry from open datasets (USDA, GBIF, Permapeople, Wikidata) with confidence scores and citations, ready for human review
- **Review queue** — Empathetech maintainers (and trusted community reviewers later) approve / amend / reject submissions; approved entries land in the next plant DB release
- **Per-plant change history** — every shipped plant has a visible version history showing what changed between releases

This collapses the "we have to author all of this manually" wall and makes the plant DB a living, governed artifact the community owns.

Splits cleanly into smaller releases within V2+:

- V2.x — Browse the bundled DB in-app + custom local plants
- V2.x — Submit-a-proposal flow (creates a structured GitHub Issue or similar)
- V2.x — LLM-drafting tool (likely a separate maintainer-only tool, then integrated into the app)
- V2.x — Review queue UI and workflow

### Social / browsable gardens

- Opt-in publication of a garden as a viewable URL
- Browse friends' gardens with permission
- Care diary visibility ("how their season went")
- This requires a server and identity model — by far the biggest architectural shift; hold until clear demand

### Garden templates

- Starter templates ("4×8 raised bed for a beginner", "Salsa garden", "Pollinator garden")
- Imported as ready-made plans, fully editable

### Other items in the design docs

- Print stylesheet for HTML export
- Bulk planting placement (grid fill)
- Plant DB tamper-detection / signed manifest
- Cross-device sync via real-time backend (probably never; cloud-storage manual sync covers the use case)

---

## Risk and complexity callouts

The riskiest / most complex items, surfaced so we can attack them deliberately:

| Item | Where | Why it's hard |
|------|-------|---------------|
| Layout planner accessibility | MVP | Spatial drag-drop + screen-reader support is the hardest a11y problem in the product. Plan to invest serious time here. |
| Plant DB curation | MVP, V1 | Sustained content effort. ~20 plants for MVP is realistic for one person; ~50 for V1 implies real time and good sourcing. |
| Schema migration discipline | MVP onward | The contract that user data survives every release. Test-snapshot every prior version before it ships. |
| Bundled climate + frost data | MVP | Picking and packaging the right open dataset, ensuring license attribution is right, hitting reasonable bundle size. |
| Cost rollup math (V1) | V1 | Multi-currency without FX is honest but unusual UX. Users may expect a single total. |
| Photo diagnosis privacy (V2+) | V2+ | Easy to drift toward "save photos to improve the model" which would betray the privacy promise. Spec is locked now. |

## What's deferred until evidence demands it

- Native iOS / Android apps (PWA covers it)
- Real-time multi-device sync (cloud-storage manual sync covers it)
- Bug bounty / external security audit (depends on adoption)
- Property-based testing (revisit when first relevant bug ships)
- Cross-device testing services (revisit if device-specific bugs surface)

---

## How this roadmap will be built

**Implementation is LLM-assisted via the Hacky Hours framework's
`/hacky-hours step 4` build cycle.** Each backlog item becomes a
branch + PR, gated by the framework's pre-merge checklist (per
[TESTING.md](../02-design/TESTING.md)) and reviewed by the human
driver before merge. Empathetech is the human review layer.

This shapes the roadmap in two ways:

- **More scope per milestone is feasible** than a single-person
  hobby effort, because the implementation work parallelizes
  differently. The MVP scope above stands.
- **Discipline still matters.** We ship MVP first as a real
  artifact, then V1, then V2+. Bundling everything into one giant
  first release would defer the "is this thing useful?" feedback
  signal that keeps the project pointed at real users.

## Plant DB authoring strategy

**First pass (MVP + V1):** LLM-assisted curation grounded in open
datasets (USDA PLANTS, GBIF, Permapeople, Wikidata, regional
agricultural extensions where licensing allows). Every entry gets
human review before shipping. Sources cited per plant.

**Long-term (V2+):** The "Plant curation pipeline" feature above —
a real in-app workflow for browsing, proposing, drafting, reviewing,
and shipping plant entries. Turns the plant DB from "static content
we author" into "living governed artifact the community owns."

This two-phase approach lets MVP ship without waiting for the
pipeline, while making the pipeline itself an *expressed product
feature* rather than internal tooling.

## Possible deeper cuts (only if MVP scope feels strained mid-build)

Listed for visibility — not committed unless we hit real friction:

- Drop dark mode from MVP (system theme only — light or dark, not togglable). V1 adds the toggle.
- Drop import from MVP (export only — round-trip comes V1).
- Drop the planter surface from MVP (in-ground + raised bed only).
- Reduce plant DB from ~20 to ~10 plants for MVP.
- Drop free-form notes on entities other than Planting.

We'd revisit these only if a milestone is dragging significantly
past expected scope.
