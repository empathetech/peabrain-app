#!/usr/bin/env node
// Builds the bundled frost-date grid from the Köppen grid using a deterministic
// per-zone heuristic. See ADR 2026-05-03-frost-date-heuristic-mvp.md.
//
// Inputs:  public/data/koppen/grid.json
// Outputs: public/data/frost/grid.json
//
// The output is a per-cell [lastDoy, firstDoy] pair (1-based day-of-year),
// hemisphere-shifted so southern-hemisphere cells already encode their own
// frost calendar. stdDevDays is constant (21) per the ADR and lives at the
// envelope level, not per cell.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')

// Northern-hemisphere [lastSpringFrostDOY, firstFallFrostDOY] per Köppen code.
// Anchored against published frost climatology for representative cities in
// each zone. Within-zone latitude variation is bundled into the ±21-day
// uncertainty rather than modelled — the ADR explains why.
//
// `null` = no frost / undefined (tropical, hot arid, polar).
const FROST_TABLE = {
  // Tropical and hot arid: no frost.
  Af: null, Am: null, Aw: null,
  BWh: null, BSh: null,
  // Cold arid / steppe: defensible frost windows.
  BWk: [105, 305],  // Apr 15 – Nov 1
  BSk: [120, 290],  // Apr 30 – Oct 17
  // Temperate, warm anchors.
  Csa: [74,  334],  // Mar 15 – Nov 30
  Cwa: [80,  325],  // Mar 21 – Nov 21
  Cfa: [100, 309],  // Apr 10 – Nov 5
  // Temperate, mild summer.
  Csb: [91,  319],  // Apr 1  – Nov 15
  Cwb: [95,  315],  // Apr 5  – Nov 11
  Cfb: [110, 305],  // Apr 20 – Nov 1
  // Temperate, cool summer.
  Csc: [130, 280],  // May 10 – Oct 7
  Cwc: [130, 280],
  Cfc: [130, 280],
  // Continental, hot summer.
  Dsa: [115, 288],  // Apr 25 – Oct 15
  Dwa: [115, 288],
  Dfa: [115, 288],
  // Continental, warm summer.
  Dsb: [130, 273],  // May 10 – Sep 30
  Dwb: [130, 273],
  Dfb: [130, 273],
  // Continental, cold summer.
  Dsc: [152, 253],  // Jun 1 – Sep 10
  Dwc: [152, 253],
  Dfc: [152, 253],
  // Subarctic and polar: undefined (year-round frost risk).
  Dsd: null, Dwd: null, Dfd: null,
  ET: null, EF: null,
}

const STD_DEV_DAYS = 21

function shiftSouth(doy) {
  // Add 183 days, wrap to 1..365.
  return ((doy + 183 - 1) % 365) + 1
}

function frostFor(code, lat) {
  const entry = FROST_TABLE[code]
  if (entry == null) return null
  const [lastNH, firstNH] = entry
  if (lat < 0) return [shiftSouth(lastNH), shiftSouth(firstNH)]
  return [lastNH, firstNH]
}

async function main() {
  const koppenPath = join(repoRoot, 'public/data/koppen/grid.json')
  const koppen = JSON.parse(await readFile(koppenPath, 'utf8'))

  const rows = []
  let derivedCount = 0
  for (let i = 0; i < koppen.rows.length; i++) {
    const row = koppen.rows[i]
    const lat = koppen.lat_top - i
    const outRow = new Array(row.length).fill(null)
    for (let j = 0; j < row.length; j++) {
      const v = row[j]
      if (!v) continue
      const code = koppen.code_names[v]
      if (!code) continue
      const frost = frostFor(code, lat)
      if (frost) {
        outRow[j] = frost
        derivedCount++
      }
    }
    rows.push(outRow)
  }

  const out = {
    version: 1,
    source: {
      method:
        'Heuristic — per-Köppen-zone anchor against published frost ' +
        'climatology, hemisphere-shifted. See ' +
        'hacky-hours/02-design/decisions/' +
        '2026-05-03-frost-date-heuristic-mvp.md.',
      stdDevDays: STD_DEV_DAYS,
      resolution_deg: koppen.source.resolution_deg,
    },
    lat_top: koppen.lat_top,
    lon_left: koppen.lon_left,
    rows,
  }

  const outPath = join(repoRoot, 'public/data/frost/grid.json')
  await writeFile(outPath, JSON.stringify(out))
  console.log(
    `Wrote ${outPath} — ${derivedCount} cells with derived frost dates.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
