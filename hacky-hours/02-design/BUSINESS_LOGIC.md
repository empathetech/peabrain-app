# Business Logic

The rules and computations that make peabrain *useful* rather than just
a drawing tool. Where [DATA_MODEL.md](./DATA_MODEL.md) defines the
shapes, this doc defines what we *do* with them.

## Design principles

These principles govern every rule and recommendation in this doc:

1. **Advisory, not prescriptive.** Warn loudly when a choice is
   suboptimal; let the gardener proceed unless it's truly impossible.
   Block only for: climate-impossible, illegal, or invasive plants.
2. **Honest uncertainty.** When the data is approximate (frost dates
   ± N days, zone fit at a boundary), say so in the UI. Don't fake
   precision.
3. **Compute, don't snapshot.** Fit, recommendations, and rollups are
   all computed from current state — no derived values stored. This
   means improvements to the plant DB or climate data flow through
   instantly.
4. **Defer to the user.** When peabrain and the user disagree (their
   observed frost date vs. the lookup, their plant choice vs. our
   recommendation), the user wins. We make their reasons explicit; we
   don't override.

## Fit-tier model

The core abstraction. Given a candidate planting (plant + surface +
location + sun context + current date), compute a single overall fit
tier from four dimensions plus a legal veto.

```
fit(plant, surface, location, sunZone, date):

    // The four dimensions, each yielding a tier
    zoneFit    = computeZoneFit(plant, location)
    surfaceFit = computeSurfaceFit(plant, surface)
    sunFit     = computeSunFit(plant, sunZone)
    seasonFit  = computeSeasonFit(plant, location, date)

    // Legal/regulatory veto (separate from fit; can hard-block)
    legalStatus = computeLegalStatus(plant, location)

    if legalStatus is "illegal":
        return { tier: "blocked", reason: "illegal-in-region", details: ... }

    if any of [zoneFit, surfaceFit, sunFit, seasonFit] is "impossible":
        return { tier: "impossible", reason: ..., details: ... }

    if legalStatus is "invasive":
        // Allow with prominent ecological warning + acknowledgement
        return { tier: "blocked-with-override", reason: "invasive", details: ... }

    if legalStatus is "permit-required":
        // Allow with informational warning surfaced before placement
        return { tier: aggregateTier(...), warnings: ["permit-required", ...] }

    return { tier: aggregateTier([zoneFit, surfaceFit, sunFit, seasonFit]) }


aggregateTier(tiers):
    // Most restrictive non-impossible wins
    if any tier is "stretch":  return "stretch"
    if any tier is "decent":   return "decent"
    return "great"
```

### computeZoneFit

```
computeZoneFit(plant, location):
    code = location.koppenCode
    return plant.zoneFit[code] ?? "stretch"
```

If the plant doesn't have an explicit zone fit for the user's Köppen
code, default to `"stretch"` — meaning "unknown, probably possible
with effort." We never default to `"impossible"` for missing data;
absence of evidence is not evidence of absence.

### computeSurfaceFit

```
computeSurfaceFit(plant, surface):
    base = plant.surfaceFit[surface.type]   // e.g. surfaceFit.raisedBed

    // Depth check (raised beds, planters)
    if surface.depthCm and surface.depthCm < plant.minSoilDepthCm:
        return downgrade(base, by: 1)
        // "great" → "decent", "decent" → "stretch", "stretch" → "impossible"

    // Volume check (planters only)
    if surface.type == "planter" and plant.surfaceFit.planter.minVolumeL:
        volume = approxVolume(surface)
        if volume < plant.surfaceFit.planter.minVolumeL:
            return downgrade(base, by: 1)

    return base
```

The `downgrade(tier, by)` helper handles the dimension-specific
penalty: a too-shallow raised bed for carrots downgrades from
`"great"` to `"decent"`, not all the way to `"impossible"` —
gardeners often work around constraints. We surface the constraint as
a warning regardless.

### computeSunFit

```
computeSunFit(plant, sunZone):
    if no sunZone applies (user hasn't mapped sun, or surface is outside any zone):
        return "stretch"  // unknown — show a "set sun zones for better fit" nudge

    return matchTable[plant.sunNeeds][sunZone.level]
```

| Plant needs ↓ / Zone has → | full-sun | partial-morning | partial-afternoon | shade |
|---|---|---|---|---|
| `full` | great | decent | decent | impossible |
| `partial` | decent | great | great | stretch |
| `shade` | stretch | decent | decent | great |
| `any` | great | great | great | great |

When a surface overlaps multiple sun zones, **the most restrictive zone
wins from the plant's perspective.** A bed straddling full-sun and
partial-shade is treated as partial-shade for fit purposes — better to
nudge toward the conservative answer.

### computeSeasonFit

The hardest one. Takes `plant.seasonality`, the user's frost dates, and
the current date.

```
computeSeasonFit(plant, location, date):
    if plant.seasonality.perennial:
        return "great"  // always in season

    frostDates = location.frostDates ?? lookupTypicalFrostDates(location.coords)

    if frostDates is null (tropical / no frost):
        return computeFromSeasonTags(plant.seasonality.seasons, date, location)

    weeksFromLastFrost = (date - frostDates.lastSpringFrost) in weeks

    if any plant.seasonality window [startIndoors, directSow, transplant] contains weeksFromLastFrost:
        return "great"     // we're in an active planting window now

    if any window is upcoming within 4 weeks:
        return "decent"    // plan now, plant soon

    if plant.seasonality.harvestWindow contains current weeksFromLastFrost:
        return "decent"    // not the right time to plant, but a planted one would be harvesting now
        // (used for displaying existing plantings, not for new ones)

    return "stretch"        // wrong time of year; user can override
```

**Tropical fallback:** when frost dates are null, peabrain uses the
plant's coarse `seasons` tags (`cool | warm | hot | year-round`)
mapped against the location's monthly temperature climatology. Less
precise, honest about it.

**Confidence display:** the UI shows the underlying timing range with
the frost-date confidence (e.g., "plant in 2–4 weeks (frost dates
± 14 days at your location)") — not a single deceptively-precise date.

### computeLegalStatus

```
computeLegalStatus(plant, location):
    flags = []
    for each region in [location.countryCode, location.regionCode]:
        flag = plant.legalFlags[region]
        if flag: flags.push(flag)

    // Worst applies
    if any flag.status is "illegal":         return "illegal"
    if any flag.status is "invasive":        return "invasive"
    if any flag.status is "permit-required": return "permit-required"
    return "ok"
```

When data is older than 1 year (`flag.asOf` more than 365 days ago),
the UI surfaces an additional disclaimer: "this regulatory data was
last verified on YYYY-MM-DD; verify with your local authorities." We
do not auto-degrade or remove the flag.

## Companion planting (overlay, not part of fit)

Companion-planting compatibility is computed separately from fit and
shown as **adjacency warnings** when placing a plant near another
plant in the same surface (or nearby surfaces, for some allelopathic
interactions like walnut).

```
companionWarnings(planting, surface, allPlantingsInGarden):
    plant = lookup(planting.plantId)
    nearbyPlantings = filter allPlantingsInGarden where:
        - same surface, OR
        - same garden AND within 1m of planting.positionInSurface

    warnings = []
    for each neighbor in nearbyPlantings:
        neighborPlant = lookup(neighbor.plantId)
        if neighborPlant.id in plant.companions.bad:
            warnings.push({
                kind: "bad-companion",
                with: neighborPlant.commonNames.en[0],
                severity: "warning"
            })
        if neighborPlant.id in plant.companions.good:
            warnings.push({
                kind: "good-companion",
                with: neighborPlant.commonNames.en[0],
                severity: "info"
            })
    return warnings
```

Bad-companion warnings appear inline in the layout planner ("⚠️ basil
near fennel — usually unhappy together") but **never block placement**.

Symmetry: companion relationships are stored once per plant pair (the
plant DB ensures `plant.companions.bad` includes `B` if `B`'s entry
includes this plant — we lint this in plant DB tests). The lookup
checks both directions for redundancy.

## Crop rotation (overlay, not part of fit)

Crop rotation is purely about *time*, not space. Same surface +
different family across years.

```
rotationWarnings(planting, surface, allPlantingsInGarden, today):
    plant = lookup(planting.plantId)

    recentSameFamily = filter allPlantingsInGarden where:
        - p.surfaceId == surface.id
        - p.id != planting.id
        - lookup(p.plantId).family == plant.family
        - p.plantedDate within last 24 months from today
        - p.status in ["growing", "harvesting", "done"]   // ignore future-planned

    if recentSameFamily.any():
        most_recent = max by plantedDate
        return [{
            kind: "rotation-conflict",
            family: plant.family,
            previousPlant: lookup(most_recent.plantId).commonNames.en[0],
            previousDate: most_recent.plantedDate,
            severity: "warning"
        }]
    return []
```

Two-year window is the conservative gardening default; could be made
configurable per family in a future iteration.

## Recommendations (inverse fit)

Given a location, season, and surface, recommend plants that fit well.

```
recommendForSurface(garden, surface, sunZone, date, limit = 20):
    candidates = filter all plants where:
        - computeLegalStatus(plant, garden.location) != "illegal"
        - computeLegalStatus(plant, garden.location) != "invasive"
        - fit(plant, surface, garden.location, sunZone, date).tier is not "impossible"

    scored = candidates.map(plant => {
        plant,
        fit: fit(plant, surface, garden.location, sunZone, date),
        score: tierScore(fit.tier)  // great=3, decent=2, stretch=1
    })

    return scored
        .sortBy(score desc, plant.commonNames.en[0] asc)
        .take(limit)
```

We exclude `illegal` and `invasive` plants from recommendations
entirely (they only appear if the user explicitly searches for them).
We *include* `permit-required` with the warning attached.

**Tie-breaking:** strictly alphabetical by common name in the user's
locale, for stable, predictable ordering. No popularity metric, no
"recently viewed" — those add complexity without clearly improving
hobbyist outcomes.

**Filtering UI:** the recommendation view should let the user filter
by "edible / herb / flower," watering frequency, and effort level —
all derived from plant DB fields. These are presentation concerns,
detailed in `STYLE_GUIDE.md` later.

## Planning-time rollups

These power the cost-benefit / "is this worth it" view at planning time.
All rollups operate on plantings with `status: "planned"`.

### Estimated cost

```
gardenEstimatedCost(garden):
    surfaceCost = sum(surface.estimatedCost.amount)
                  for surfaces where buildOrBuy in ["build", "buy"]
                  and buildStatus != "ready"

    plantingCost = sum(lookup(planting.plantId).estimatedSeedCost.amount * planting.quantity)
                   for plantings where status == "planned"

    return groupByCurrency([
        ...surfaceCost entries,
        ...plantingCost entries
    ])
```

**Multi-currency handling:** we do not do FX conversion. If a user has
costs in mixed currencies (rare but possible), we show one subtotal
per currency rather than a fake unified total.

### Expected yield (planning time only)

```
gardenExpectedYield(garden):
    return groupByUnit(
        plantings.filter(p => p.status == "planned")
                 .map(p => {
                     plant: lookup(p.plantId),
                     amount: plant.yieldPerPlant.amount * p.quantity,
                     unit: plant.yieldPerPlant.unit
                 })
    )
    // returns { kg: X, count: Y, bunch: Z, ... }
```

**Honest uncertainty:** yield estimates are notoriously variable in
practice. The UI should always show these as a range (e.g., "~8–12 kg
of tomatoes") with an "actual results vary widely with weather, care,
and luck" disclaimer next to the rollup.

We deliberately do not track *actual* yield in structured form (see
DATA_MODEL.md). This rollup is for the planning decision, not for
post-hoc accounting.

## Expected harvest window

Computed for each `growing` planting to power the UI nudge that
suggests transitioning to `harvesting`.

```
expectedHarvestWindow(planting):
    plant = lookup(planting.plantId)
    if not planting.plantedDate or not plant.daysToMaturity:
        return null

    [minDays, maxDays] = plant.daysToMaturity
    return {
        windowStart: planting.plantedDate + minDays,
        windowEnd:   planting.plantedDate + maxDays
    }
```

UI uses this to:
- Show "ready to pick around YYYY-MM-DD" on the planting card
- Display a soft nudge ("looks like X should be ready — switch to
  harvesting?") when current date is past `windowStart` and status is
  still `growing`
- Show a stronger nudge when current date is well past `windowEnd`

The user always confirms the transition; peabrain never auto-changes
state.

## Surfacing fit and warnings in the UI

How fit tiers and warnings translate to user-visible UX:

| Tier | Visual | Behavior |
|------|--------|----------|
| `great` | Green check, no badge | Recommended, no friction |
| `decent` | Yellow info dot | Allowed; surface caveats inline ("a bit shallow for carrots") |
| `stretch` | Orange warning badge | Allowed with prominent caveats ("expect lower yield, may need shade cloth") |
| `impossible` | Red, disabled placement | Click shows "this won't grow here because…" — does not place |
| `blocked` (illegal) | Red, refused | Search results hide it; if accessed, show "illegal in your region" |
| `blocked-with-override` (invasive) | Red with override gate | "This plant is invasive in your region. Type INVASIVE to confirm placement." |

`permit-required` flags appear as a pre-placement modal, not a tier
downgrade — users see the legal note before investing planning effort.

Companion and rotation warnings appear as inline annotations on the
planting card, not as fit tier downgrades. They're valid concerns but
don't change whether something *can* grow.

## Open questions

- **Plant-DB depth tolerance.** When a surface is too shallow for a
  plant, we downgrade by one tier. Should this be parameterized per
  plant (some plants tolerate shallow soil better than others)?
  Defer until we have real plant data and feel the gap.
- **Sun-zone interpolation.** A plant placed *between* two sun zones
  currently gets the most restrictive level. Should we interpolate
  or weight by area? Defer; conservative answer is the right MVP.
- **Companion-planting evidence quality.** Companion-planting science
  is uneven — some pairings are well-evidenced, others are folk
  wisdom. Should we tag confidence per rule? Maybe in V2; for MVP
  every rule is treated equally.
- **Multi-region legal flags.** A user in California (US-CA) inherits
  flags from both US-CA and US. Currently the worst wins. Edge case:
  conflicting state vs. federal status. Document and revisit if it
  comes up in real plant data.
- **Recommendation pagination.** 20 results may be too few for a user
  in a fertile zone. Defer pagination decisions to UI design.
