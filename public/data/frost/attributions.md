# Frost-date grid — attribution and method

The file `grid.json` in this directory is **derived data**, not a third-party
dataset. It is generated from the bundled Beck et al. (2023) Köppen-Geiger
grid (see `../koppen/attributions.md`) using a per-zone heuristic anchored
against published frost climatology.

## Why a heuristic, not real data

There is no clean, pre-computed, openly-licensed global frost-date grid that
matches the resolution, format, and licensing model we use for the Köppen
grid. Real-data candidates (NOAA GHCN, WorldClim 2.1, CHELSA-W5E5) require
either US-only coverage or substantial NetCDF / daily-timeseries processing
that's out of scope for the MVP.

The full reasoning, alternatives considered, and V1 upgrade path live in:

> [`hacky-hours/02-design/decisions/2026-05-03-frost-date-heuristic-mvp.md`](../../../hacky-hours/02-design/decisions/2026-05-03-frost-date-heuristic-mvp.md)

## Method (in one paragraph)

For each 1° land cell in the bundled Köppen grid, we look up a per-zone
anchor pair `[lastSpringFrostDOY, firstFallFrostDOY]` calibrated against
published frost climatology for representative cities in that zone. Tropical,
hot-arid, and polar zones return `null` (no frost / undefined). Southern-
hemisphere cells shift the day-of-year by 183 days. Every derived cell
carries a fixed ±21-day uncertainty (`stdDevDays: 21` at the envelope
level), which the UI surfaces alongside any frost date.

## Anchor table

The numeric anchors live in `scripts/build-frost-grid.mjs`. They were
chosen against published frost climatology for representative cities in
each Köppen zone (London for Cfb, NYC for Cfa, Stockholm for Dfb, etc.)
and validated by spot-checking the resulting grid against ten reference
cities; mean absolute error on those checks falls within the stated ±21
day uncertainty.

## License

The derived frost-date grid carries no third-party-data obligation — it's
generated from the bundled Köppen grid (CC BY 4.0, attributed in
`../koppen/attributions.md`) and a deterministic table of constants. The
generator script, table, and resulting `grid.json` are released under
peabrain's MIT license.

## Regenerating

```sh
node scripts/build-frost-grid.mjs
```

Reads `public/data/koppen/grid.json` and writes `public/data/frost/grid.json`.
