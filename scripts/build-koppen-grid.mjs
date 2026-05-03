#!/usr/bin/env node
// Reads a 1° Köppen-Geiger GeoTIFF (Beck et al. 2023) and writes a compact
// JSON grid into public/data/koppen/grid.json.
//
// Usage:
//   node scripts/build-koppen-grid.mjs <path-to-koppen_geiger_1p0.tif>
//
// Re-run only when updating the source dataset; the produced grid.json is
// committed to the repo.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fromArrayBuffer } from 'geotiff'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')

const CODE_NAMES = [
  null,
  'Af', 'Am', 'Aw',
  'BWh', 'BWk', 'BSh', 'BSk',
  'Csa', 'Csb', 'Csc',
  'Cwa', 'Cwb', 'Cwc',
  'Cfa', 'Cfb', 'Cfc',
  'Dsa', 'Dsb', 'Dsc', 'Dsd',
  'Dwa', 'Dwb', 'Dwc', 'Dwd',
  'Dfa', 'Dfb', 'Dfc', 'Dfd',
  'ET', 'EF',
]

async function main() {
  const tifPath = process.argv[2]
  if (!tifPath) {
    console.error('Usage: build-koppen-grid.mjs <koppen_geiger_1p0.tif>')
    process.exit(1)
  }

  const buf = await readFile(tifPath)
  const tiff = await fromArrayBuffer(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  )
  const image = await tiff.getImage()
  const width = image.getWidth()
  const height = image.getHeight()

  if (width !== 360 || height !== 180) {
    console.error(
      `Expected 360x180 grid, got ${width}x${height}. Pass the 1° tiff.`,
    )
    process.exit(1)
  }

  const rasters = await image.readRasters()
  const data = rasters[0]

  // GeoTIFF is row-major from top-left: row 0 is lat=+90, col 0 is lon=-180.
  // We emit rows[i] for i in 0..179 corresponding to lat = 89.5 - i.
  // Each row is an array of 360 numeric codes (0 = no data / ocean).
  const rows = []
  let nonZero = 0
  for (let i = 0; i < height; i++) {
    const row = new Array(width)
    for (let j = 0; j < width; j++) {
      const v = data[i * width + j]
      row[j] = v
      if (v > 0) nonZero++
    }
    rows.push(row)
  }

  const out = {
    version: 1,
    source: {
      citation:
        'Beck, H. E., T. R. McVicar, N. Vergopolan, A. Berg, N. J. Lutsko, ' +
        'A. Dufour, Z. Zeng, X. Jiang, A. I. J. M. van Dijk, and D. G. Miralles. ' +
        'High-resolution (1 km) Köppen-Geiger maps for 1901–2099 based on ' +
        'constrained CMIP6 projections. Scientific Data 10, 724 (2023).',
      doi: '10.6084/m9.figshare.21789074',
      license: 'CC BY 4.0',
      period: '1991-2020',
      resolution_deg: 1,
    },
    // Top row corresponds to lat 89.5 (centre); leftmost column to lon -179.5.
    lat_top: 89.5,
    lon_left: -179.5,
    code_names: CODE_NAMES,
    rows,
  }

  const outPath = join(repoRoot, 'public/data/koppen/grid.json')
  await writeFile(outPath, JSON.stringify(out))
  const totalCells = width * height
  console.log(
    `Wrote ${outPath} — ${totalCells} cells, ${nonZero} land cells (${(
      (nonZero / totalCells) *
      100
    ).toFixed(1)}%)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
