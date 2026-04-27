# peabrain — Product Overview

A garden planning companion for backyard gardeners across the skill spectrum.

**Owner:** Empathetech — a community group ([empathetech.org](https://www.empathetech.org/)).
Released under MIT License with attribution to Empathetech.

---

## Who

**Backyard gardeners, mixed skill levels.** Specifically:

- People who own or have access to a yard and want to grow food
- Total beginners who don't know where to start (no green thumb)
- More experienced gardeners who want a planning + record-keeping tool
- Initially: the maker and a circle of friends

The product must work for someone with **zero** prior knowledge — it should
hold their hand from "I want to garden" all the way through to "I harvested
roughly what I expected to harvest."

Single-user / single-player for the foreseeable future. Sharing or browsing
friends' gardens is a long-term stretch goal, not foundational.

## What

A **garden planning, visualization, and care companion**. Core capabilities,
in priority order:

1. **Visual layout planner** — compose a garden from a palette of growing
   surfaces (in-ground plots, raised beds, planters/pots, trellises) in any
   combination, place plants into the surfaces that suit them, and see the
   result with colors and annotations. The planner must **guide** users who
   don't know which surface type to pick or whether to buy vs. build, since
   most beginners won't know the options exist.
2. **Climate + season guide** — given the user's location *anywhere in the
   world*, recommend what to plant (and what *not* to plant), what's
   seasonally appropriate (respecting hemisphere), and broad
   climate-zone-specific advice. Uses a global climate classification
   such as Köppen-Geiger rather than a US-only system like USDA
   Hardiness Zones. **Advisory, not prescriptive** — the app warns
   loudly when a choice is suboptimal but lets the gardener proceed
   anyway, blocking only when a plant fundamentally cannot grow in
   their climate, **is illegal to grow in their jurisdiction**, or
   **is invasive in their region**. Peabrain is not a legal authority;
   legal/regulatory data is dated and disclaimed in the UI.
3. **Budget + yield calculator** — estimate materials cost (soil, beds,
   seeds, fertilizer) and predicted yield, so the user can do a basic
   cost/benefit check before committing
4. **Plant photo diagnosis** *(later)* — upload a photo of a struggling
   plant, get a "what's wrong / is it dead?" answer
5. **Social / browse friends' gardens** *(much later)* — see other users'
   designs and how their seasons turned out

Additional capabilities that enrich the planner and care experience,
slotted across V1 and V2+ (exact priority decided in `03-roadmap/`):

- **Sun-exposure mapping** — paint full-sun / partial-shade / full-shade
  zones onto the yard before placing surfaces; planner warns when a
  plant's light needs don't match its placement. *(Layout-time.)*
- **Companion planting** — surface helpful pairings and warn about bad
  neighbors as plants are placed. *(Layout-time.)*
- **Crop rotation** — remember what was planted where in past seasons
  and warn against repeating same-family plantings in the same surface.
  *(Multi-season — requires the data model to track plantings over time.)*
- **Watering / irrigation planning** — recommend per-plant watering
  cadence; potentially help plan an irrigation layout. *(Care-time.)*
- **Pest / disease awareness** — given climate + plants, surface pests
  and diseases to watch for and how to spot them. Pairs with the
  future photo-diagnosis feature. *(Care-time.)*

Memory of "what's planted where" is implicit in the layout — once you've
designed your plot, the app *is* the record.

**Plans are portable.** Designs export as JSON (round-trippable) and as
visual artifacts (SVG / PNG / HTML) for sharing or printing.

## Where

**Web-first Progressive Web App (PWA).** Installable from the browser,
works offline, responsive enough to be "mostly usable" on a phone in the
yard. Desktop/tablet is the primary planning surface; phone is the
secondary in-the-garden surface.

No native iOS or Android app planned.

## When

No hard external deadline. Rough phasing:

- **MVP** — visual layout planner + zone/season guide. Small enough to
  ship and use for one real planting season.
- **V1** — adds budget + yield calculator.
- **V2+** — plant photo diagnosis, then social / browsable friend gardens.

Detailed milestones land in `03-roadmap/ROADMAP.md`.

## Why

Starting a garden is overwhelming for beginners. The information is
scattered across blogs, almanacs, hardware-store pamphlets, and
neighbor-knows-best advice. There's no single tool that takes a user
from "I have a yard and an idea" to "I harvested food I planned for"
with location-aware, beginner-safe guidance the whole way.

Peabrain wants to close that loop. Success means: a real human used
peabrain to design a garden, bought the right stuff, planted the right
things at the right time for their zone, and came out the other side
with crops roughly matching the predicted yield.

---

## Constraints & Values

### Licensing

**MIT License by Empathetech.** Code is open source. Anyone can use,
modify, and redistribute for personal or commercial purposes, with
attribution required. This will shape dependency choices in Step 2 —
GPL/AGPL-licensed dependencies would force the whole project into a
copyleft license and are out of scope.

### Privacy

**No PII collected if avoidable. No user accounts.** Specifically:

- **Location** — Use the browser's geolocation API to *suggest* a location,
  but require the user to confirm or correct it. Always offer fallback paths
  that work globally: search by city + country, or enter a postal code in
  the format the user's country actually uses. Never silently send precise
  location anywhere. Default unit system to metric; offer imperial as a
  user preference.
- **No accounts** — MVP requires no signup, no email, no password. All
  garden data lives in the user's browser (IndexedDB / localStorage).
- **Portability replaces accounts** — Users export their plans as JSON
  files (full fidelity, re-importable) and as visual exports (SVG/PNG/HTML
  for sharing). Optional integration with cloud storage (Google Drive,
  iCloud Drive, OneDrive) for users who want sync across devices, but this
  is opt-in and OAuth-mediated — peabrain itself never sees their files.
- **Photo diagnosis (future)** — when added, must be explicit per-photo
  upload. Photos should not be retained server-side beyond what's needed
  to return a diagnosis. This is a design decision to revisit when that
  feature is scoped.

### Infrastructure

**Managed, minimal, cheap, low-maintenance.** The user has explicitly said
they hate managing infrastructure, and want the smallest possible security
surface. Direction for Step 2:

- Static-site hosting (Cloudflare Pages / Netlify / GitHub Pages — all have
  generous free tiers)
- No backend server for MVP — the app is a client-side PWA
- Climate zone data and plant data bundled with the app (or fetched from
  a free, well-known dataset) rather than served from a peabrain-operated API
- Revisit this only when a feature genuinely requires a server (e.g.,
  photo diagnosis with a vision model)

This shape collapses entire categories of risk: no database to breach, no
session tokens to leak, no ops on-call rotation.

### Accessibility

WCAG 2.1 AA from day one. A planning tool with heavy visual components
(the layout planner especially) needs careful thought for keyboard
navigation, screen-reader narration, and color contrast. Detailed plan
in `02-design/ACCESSIBILITY.md`.
