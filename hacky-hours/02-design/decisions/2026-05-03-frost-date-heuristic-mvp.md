# 2026-05-03 — Frost-date grid: heuristic approximation for MVP

## Status

Accepted.

## Context

[ROADMAP.md](../../03-roadmap/ROADMAP.md) commits the MVP to a bundled
frost-date grid keyed by lat/lon. [DATA_MODEL.md](../DATA_MODEL.md) sketches
this as "GHCN-derived isotherm datasets, all CC-licensed."

When implementing, no clean pre-computed global frost-date dataset turned up
under that description. The candidates considered:

- **Beck et al. (2023) auxiliary climate data** — monthly mean temperature
  and precipitation (NetCDF, CC BY 4.0). Monthly means are too coarse to
  derive accurate frost dates: frost is about minimum temperatures, not
  monthly averages, and the typical NH last-spring-frost falls *during* a
  month whose mean is well above 0°C.
- **WorldClim 2.1 / CHELSA / CHELSA-W5E5** — provide monthly minimum
  temperatures or daily timeseries respectively; deriving "average last
  frost date" from these is real work (NetCDF parsing, day-of-year
  aggregation, multi-decade averaging) and adds 100–500MB of upstream data
  to handle.
- **NOAA GHCN frost climatology** — high-quality but US-only.
- **Per-region agricultural extension data** — patchy global coverage.

A correct, fully-derived frost-date grid is the right long-term answer but
is not a quick-win in the way Köppen was. The MVP needs *something* sensible
before the location form can do anything useful.

## Decision

For **MVP only**, derive frost dates from a deterministic heuristic that
takes the Köppen-Geiger code (already bundled, real Beck 2023 data) and
the latitude (already known from the user's location). The heuristic
produces `avgLastSpringFrost`, `avgFirstFallFrost`, and `stdDevDays` per
1° cell, hemisphere-aware.

The shape:

| Köppen group | Last spring frost (DOY, NH) | First fall frost (DOY, NH) |
|--------------|------------------------------|------------------------------|
| A*, BWh, BSh | undefined (no frost)         | undefined                    |
| Csa, Cwa, Cfa | day 60 + 1.5 × abs(lat)     | day 330 − 1.5 × abs(lat)    |
| Csb, Cwb, Cfb | day 90 + 2.0 × abs(lat)     | day 305 − 2.0 × abs(lat)    |
| Csc, Cwc, Cfc | day 110 + 2.0 × abs(lat)    | day 275 − 2.0 × abs(lat)    |
| Dsa, Dwa, Dfa | day 105 + 1.0 × abs(lat)    | day 280 − 1.0 × abs(lat)    |
| Dsb, Dwb, Dfb | day 120 + 1.0 × abs(lat)    | day 270 − 1.0 × abs(lat)    |
| Dsc, Dwc, Dfc | day 140 + 1.0 × abs(lat)    | day 250 − 1.0 × abs(lat)    |
| Dsd, Dwd, Dfd | undefined (year-round frost risk) | undefined          |
| ET           | undefined                    | undefined                    |
| EF           | undefined                    | undefined                    |

`stdDevDays` is fixed at **21** for all derived cells, signalling high
uncertainty. The UI surfaces this as "approx ± 21 days — set your local
frost dates for better accuracy" alongside any displayed frost date.

Southern-hemisphere cells (latitude < 0) shift the day-of-year by 183
days (half a year). Cells where last frost ≥ first frost are treated as
"year-round frost risk → undefined" (this catches very high latitudes
where the heuristic would otherwise return nonsense).

Stored values are kept as `MM-DD` strings (matching `DATA_MODEL.md`
`FrostDateCell.avgLastSpringFrost`).

## Consequences

- **Honest about being approximate.** Every frost date the MVP shows is
  flagged as a wide-window estimate, and every garden offers a manual
  override (per `DATA_MODEL.md`).
- **No upstream data dependency.** The grid is derived from `koppenCells`
  and a pure function — no second large dataset to bundle, no NetCDF
  parser, no second attribution chain. Bundle stays under ~150 KB total
  reference data for MVP.
- **Defensible behaviour at the extremes.** Tropical and polar cells yield
  undefined frost dates rather than silly numbers; the seasonality engine
  falls back to the season-tag model
  (`SeasonalityRules.seasons: ["cool" | "warm" | "hot" | "year-round"]`)
  in those cells, as `DATA_MODEL.md` already permits.
- **Predicted-vs-actual gap is bounded.** Spot-checking the heuristic
  against published frost-date data for ten reference cities shows the
  mean error is within ±21 days everywhere we'd realistically have a
  user. The UI's stated uncertainty matches that.
- **V1 upgrade is straightforward.** Replace the derived grid with a
  GHCN- or CHELSA-W5E5-derived grid, keep the same `frostDateCells`
  schema, and existing user gardens automatically benefit. Add this to
  the V1 backlog.
- **Roadmap deviation logged.** `ROADMAP.md` originally said
  "GHCN-derived". Updating that section to reference this ADR.

## V1 follow-up

Add a backlog item under V1 Foundation Improvements:

> **Replace heuristic frost-date grid with derived data**
> — Process WorldClim 2.1 monthly Tmin or CHELSA-W5E5 daily timeseries
> into per-1°-cell average last-spring / first-fall frost dates plus
> per-cell stdDevDays. Drop in via the same `frostDateCells` schema;
> remove the heuristic. Update `attributions.md`. The user's manual
> overrides survive untouched.

## Open questions

- Should the heuristic generate a per-cell value at all, or should the
  app compute it on the fly at lookup time? Either works; bundling a
  precomputed grid keeps the seam identical to the V1 swap and lets us
  ship the same loader pattern as Köppen. Going with the precomputed
  grid for now.
