// Loads the bundled frost-date grid into IndexedDB on first run, and resolves
// a lat/lon to per-cell average frost dates at lookup time.
//
// Source: heuristic derived from Beck 2023 Köppen grid + per-zone anchors.
// See public/data/frost/attributions.md and ADR
// 2026-05-03-frost-date-heuristic-mvp.md.

import { db } from './schema'

type FrostGridFile = {
  version: number
  source: { stdDevDays: number; resolution_deg: number }
  lat_top: number
  lon_left: number
  rows: ([number, number] | null)[][]
}

const FROST_VERSION_KEY = 'frostDates'

let hydrationPromise: Promise<void> | null = null

function doyToMonthDay(doy: number): string {
  const ref = new Date(Date.UTC(2025, 0, 1))
  ref.setUTCDate(doy)
  return ref.toISOString().slice(5, 10)
}

export function ensureFrostLoaded(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    const existing = await db.dataVersions.get(FROST_VERSION_KEY)
    if (existing?.version === '2026-05-heuristic-1deg') return

    const res = await fetch(
      `${import.meta.env.BASE_URL}data/frost/grid.json`,
    )
    if (!res.ok) {
      throw new Error(`Frost grid fetch failed: ${res.status}`)
    }
    const grid = (await res.json()) as FrostGridFile
    const stdDev = grid.source.stdDevDays

    const cells: {
      latBucket: number
      lonBucket: number
      avgLastSpringFrost?: string
      avgFirstFallFrost?: string
      stdDevDays?: number
    }[] = []

    for (let i = 0; i < grid.rows.length; i++) {
      const row = grid.rows[i]
      if (!row) continue
      const lat = grid.lat_top - i
      for (let j = 0; j < row.length; j++) {
        const cell = row[j]
        if (!cell) continue
        const [lastDoy, firstDoy] = cell
        const lon = grid.lon_left + j
        cells.push({
          latBucket: lat,
          lonBucket: lon,
          avgLastSpringFrost: doyToMonthDay(lastDoy),
          avgFirstFallFrost: doyToMonthDay(firstDoy),
          stdDevDays: stdDev,
        })
      }
    }

    await db.transaction(
      'rw',
      db.frostDateCells,
      db.dataVersions,
      async () => {
        await db.frostDateCells.clear()
        await db.frostDateCells.bulkAdd(cells)
        await db.dataVersions.put({
          key: FROST_VERSION_KEY,
          version: '2026-05-heuristic-1deg',
          fetchedAt: new Date().toISOString(),
        })
      },
    )
  })()
  return hydrationPromise
}

export type FrostLookup = {
  avgLastSpringFrost?: string
  avgFirstFallFrost?: string
  stdDevDays?: number
}

export async function lookupFrost(
  lat: number,
  lon: number,
): Promise<FrostLookup | null> {
  await ensureFrostLoaded()
  const latBucket = Math.round(89.5 - Math.round(89.5 - lat))
  const lonBucket = Math.round(-179.5 + Math.round(lon - -179.5))
  const cell = await db.frostDateCells.get([latBucket, lonBucket])
  if (!cell) return null
  return {
    avgLastSpringFrost: cell.avgLastSpringFrost,
    avgFirstFallFrost: cell.avgFirstFallFrost,
    stdDevDays: cell.stdDevDays,
  }
}
