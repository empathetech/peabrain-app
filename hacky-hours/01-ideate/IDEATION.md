# Ideation — peabrain

Free-writing space. No rules, no structure required. Capture everything.

---

## Session 1 — 2026-04-26

### Who is the first person who'd use this?

Me and a group of friends who have a yard and want to build out a garden layout
successfully. Some of us are better than others at "green thumb" things — so
the app needs to work for total beginners *and* people with more experience.

### What problem does this solve?

Starting a garden is overwhelming. The user doesn't know:

- What materials are needed to build a garden
- What seeds to buy
- How to plant and care for things
- How to time plantings throughout the season
- How to budget the whole project
- Which soils and fertilizers to use
- Yield expectations and whether the cost/benefit makes sense
- What's appropriate for their climate zone / location

What they want from the app:

- **Plan and draw a garden layout** in-app (visualize the plot)
- **Remember what was planted where** over time
- **Diagnose plant problems** — upload a photo and ask "what's wrong with it? is it dead?"
- **Seasonal guidance** — which plants belong to which season
- **Soil & fertilizer recommendations**
- **Yield + cost-benefit analysis** — is this actually worth it?
- **Location-aware advice** — climate-zone-specific guidance, what's appropriate
  vs. not-great vs. great for the user's area

### What does success look like in a year?

A user (the user themselves, or a friend) was able to:

1. Design a garden plot and layout in the app
2. Get a budget of materials + crops/seeds/soil needed to implement it
3. Actually plant the things
4. Successfully yield crops that more or less matched the predicted yield

That's the full happy-path loop: plan → budget → plant → harvest.

### Form factor

Both phone and computer, but **web-first** — likely a PWA (Progressive Web App,
i.e. a website that can install like an app and work offline). Keep it
responsive so the phone experience is "mostly usable" without being the focus
initially.

### Social angle

**Single-player for now.** Intrigued by a future where you can browse friends'
garden designs and see how their season went — but that's a stretch goal,
not foundational.

### Feature priority (MVP-leaning)

1. **Visual layout planner** — design and draw the garden plot
2. **Zone + season guide** — what should I plant, given where I live and the time of year
3. **Budget / yield calculator** — fast follower if we can fit it
4. **Plant photo diagnosis** — later
5. **Social / browse friends' gardens** — much later

### Name

**peabrain** — confirmed. 🌱

### Owner / attribution

Empathetech (community group) — https://www.empathetech.org/

### Growing surface types — design planner must support combinations

The visual planner needs to handle **mixed growing surfaces** in any
combination that makes sense:

- **In-ground** plots (dig directly into the yard)
- **Raised garden beds** (built or bought)
- **Planters / pots** (containers of various sizes)
- **Trellises** (vertical growing surfaces — for climbers like beans, peas,
  tomatoes, cucumbers)

The user might not know which option to pick, or even that some options
exist. They also might not know whether to **buy** or **build** something.
The app needs to **guide them** through:

- What can grow well in each surface type
- What surface type each plant prefers (e.g., carrots want depth, lettuce
  is happy in a shallow planter, beans want a trellis)
- Buy vs. build tradeoffs (cost, time, skill required)
- How to combine surfaces in one cohesive layout

### Global, not US-only

Peabrain should work for gardeners anywhere in the world, not just the US.
This means:

- Don't ask for "ZIP code" — that's US-only terminology and format
- Use a globally applicable climate-zone system (e.g., **Köppen-Geiger**,
  which is free, open data, and covers the whole planet) rather than a
  US-only one like USDA Hardiness Zones — or support multiple systems
  with the right one chosen automatically based on the user's country
- Location entry should be: confirm-from-geolocation, OR search by
  city / region with a country selector, OR enter a postal code (which
  varies in format per country)
- Plant recommendations and seasonal timing must respect the user's
  hemisphere (planting calendars flip between northern and southern)
- Default to metric units, but offer imperial as a preference for users
  in the US, UK, etc.

### Additional concerns in the mental model

These are confirmed in scope, though most are post-MVP. They split into
two flavors based on when in the user's journey they show up:

**Layout-time concerns** (inform the visual planner / placement decisions):

- **Sun-exposure mapping** — a yard isn't uniformly sunny. The user should
  be able to mark zones of their yard as full sun / partial shade / full
  shade (and ideally morning vs. afternoon sun), so the planner can warn
  "tomatoes won't thrive in the spot you just dropped them."
- **Companion planting** — some plants help each other (basil + tomatoes),
  some hurt each other (tomatoes near brassicas). The planner should flag
  bad neighbors and suggest good ones.
- **Crop rotation** — across seasons/years, certain plant families
  shouldn't go in the same bed back-to-back (depletes soil, invites
  pests). Requires the app to remember *what was planted where last
  season* — which is a multi-season data model implication.

**Care-time concerns** (inform ongoing recommendations after planting):

- **Watering / irrigation planning** — different plants want different
  schedules. Recommend a watering cadence per plant; potentially help
  plan an irrigation layout (drip lines, soaker hoses) at higher fidelity.
- **Pest / disease awareness** — given what's planted + the user's
  climate, surface common pests/diseases to watch for and how to spot
  them early. Pairs naturally with the future plant-photo diagnosis
  feature.

**Implications worth flagging now:**

- The data model needs to track plants over **time** (planted-on, harvested-on,
  succession plantings, season X vs. season Y), not just "what's in the
  garden right now." This matters for crop rotation especially.
- Sun-exposure mapping adds a second layer to the visual planner — the
  user paints sun zones onto the yard *before* placing surfaces.
- Companion planting and pest/disease both depend on the plant database
  having those relationships modeled — another reason to evaluate
  open plant datasets carefully.

### Design philosophy: advisory, not prescriptive

Peabrain should **recommend**, not **dictate**. Some gardeners will insist
on planting something that isn't ideal for their climate — and that's
fine, as long as it's not a guaranteed failure. The app should:

- **Recommend** what grows well in the user's climate by default
- **Warn clearly** when the user picks something suboptimal — show
  the risks, expected lower yield, extra effort required (e.g.,
  shade cloth, indoor starts, frost protection)
- **Let them proceed anyway** if the plant is plausibly survivable
- **Refuse only** when the plant fundamentally cannot grow there
  (e.g., a banana tree outdoors in Reykjavik) — and even then,
  explain why rather than just hiding the option

The hierarchy:

1. **Great fit** — recommended, no warnings
2. **Decent fit** — works, with caveats; show caveats up front
3. **Stretch** — possible but hard; show what they're signing up for
4. **Will not grow here** — blocked with explanation

This applies broadly, not just to climate. Companion-planting "bad
neighbors," sun-exposure mismatches, surface mismatches — all should
warn and educate, not block, unless the choice is genuinely
unrecoverable.

### Legal and ecological constraints (carve-out from "advisory")

The "advisory, not prescriptive" rule has a carve-out for **legality** and
**ecological safety**. We don't want peabrain cheerfully recommending:

- Plants that are **outright illegal** in the user's country / state /
  region (e.g., cannabis in jurisdictions where it's prohibited, opium
  poppies, peyote, etc.)
- Plants that are **regulated or permit-required** (some medicinal or
  controlled species)
- **Invasive species** that are legal but ecologically harmful in the
  user's region (kudzu in the US southeast, English ivy in the Pacific
  Northwest, Japanese knotweed in the UK, cane toads aside — looking
  at you, Australia)

Proposed handling tiers:

1. **Illegal in user's jurisdiction** — never recommend; if user
   searches for it, show a clear notice ("This plant is illegal to
   grow in [region] as of our data update of [date]. We can't help
   you plan it.") and don't allow placement. Include a disclaimer
   that peabrain is not a legal authority and laws change — point
   the user at official sources.
2. **Restricted / permit-required** — surface the requirement *before*
   the user invests planning effort. ("Growing this in your region
   requires a permit from [authority].")
3. **Invasive in user's region** — never recommend; if user insists
   on adding it, show the ecological-harm warning prominently and
   require explicit acknowledgement before allowing placement.
4. **Legal and ecologically safe** — fall back to the standard
   advisory model.

**Implementation implications:**

- The plant database needs **per-jurisdiction legal status** and
  **per-region invasiveness flags**. Both change over time and
  vary in how rigorously they're cataloged. Authoritative open
  sources to consider: USDA APHIS noxious weeds (US), EU
  Regulation 1143/2014 invasive species list, CITES appendices,
  national agricultural authorities.
- Data goes stale. Bake a "data last updated" date into the UI
  for legal/regulatory info. Always disclaim.
- We are **not** legal advisors. Make this clear in
  `02-design/SECURITY_PRIVACY.md` and in user-facing copy.

