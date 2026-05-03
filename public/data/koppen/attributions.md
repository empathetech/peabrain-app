# Köppen-Geiger climate zone grid — attribution

The file `grid.json` in this directory is derived from the Beck et al. (2023)
high-resolution Köppen-Geiger climate classification dataset, downsampled to
1° resolution and converted to JSON for offline use.

## Source

Beck, H. E., T. R. McVicar, N. Vergopolan, A. Berg, N. J. Lutsko, A. Dufour,
Z. Zeng, X. Jiang, A. I. J. M. van Dijk, and D. G. Miralles. **High-resolution
(1 km) Köppen-Geiger maps for 1901–2099 based on constrained CMIP6
projections.** *Scientific Data* 10, 724 (2023).

DOI: <https://doi.org/10.1038/s41597-023-02549-6>
Dataset DOI: <https://doi.org/10.6084/m9.figshare.21789074>
Project page: <https://www.gloh2o.org/koppen/>

## License

Beck et al. (2023) is published under the **Creative Commons Attribution 4.0
International (CC BY 4.0)** license:
<https://creativecommons.org/licenses/by/4.0/>

This means we may use, redistribute, and build on the data — including
commercially — provided attribution is preserved. The peabrain MIT license
applies to the *code* in this repository; this `grid.json` carries the
underlying CC BY 4.0 obligation from Beck et al. (2023). See
[LICENSING.md](../../../hacky-hours/02-design/LICENSING.md).

## Period

The grid uses the **1991–2020** historical observation period (the most recent
historical bin in the Beck 2023 archive). This reflects current climate, not
a forecast.

## Resolution and grid layout

- 1° resolution: 360 columns × 180 rows = 64,800 cells
- `lat_top: 89.5` — row 0 is the cell centred at 89.5°N
- `lon_left: -179.5` — column 0 is the cell centred at -179.5°
- Numeric codes 1–30 map to Köppen-Geiger codes via `code_names` in the JSON.
  Code `0` indicates no data (ocean / no land within the cell).

## Regenerating

To regenerate `grid.json` from a fresh Beck dataset download:

```sh
node scripts/build-koppen-grid.mjs path/to/koppen_geiger_1p0.tif
```

The TIFF lives inside `koppen_geiger_tif.zip` from the figshare archive linked
above, under e.g. `1991_2020/koppen_geiger_1p0.tif`.
