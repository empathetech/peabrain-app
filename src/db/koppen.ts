// Loads the bundled Köppen-Geiger 1° grid into IndexedDB on first run, and
// resolves a lat/lon to a Köppen code at lookup time.
//
// Source: Beck et al. (2023), CC BY 4.0. See public/data/koppen/attributions.md.

import { db } from './schema'

type GridFile = {
  version: number
  source: { period: string; resolution_deg: number }
  lat_top: number
  lon_left: number
  code_names: (string | null)[]
  rows: number[][]
}

const KOPPEN_VERSION_KEY = 'koppen'

// Cells are stored at half-integer centre coords (89.5, 88.5, …, -89.5 for
// lat; -179.5, -178.5, …, 179.5 for lon). The bucket value must match exactly
// for Dexie's compound-key lookup, so we never round to an integer here.
export function bucketFromLat(lat: number, latTop: number): number {
  const i = Math.round(latTop - lat)
  return latTop - i
}

export function bucketFromLon(lon: number, lonLeft: number): number {
  const j = Math.round(lon - lonLeft)
  return lonLeft + j
}

let hydrationPromise: Promise<void> | null = null

export function ensureKoppenLoaded(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    const existing = await db.dataVersions.get(KOPPEN_VERSION_KEY)
    if (existing?.version === '2023-1991_2020-1deg') return

    const res = await fetch(
      `${import.meta.env.BASE_URL}data/koppen/grid.json`,
    )
    if (!res.ok) {
      throw new Error(`Köppen grid fetch failed: ${res.status}`)
    }
    const grid = (await res.json()) as GridFile

    const cells: { latBucket: number; lonBucket: number; code: string }[] = []
    for (let i = 0; i < grid.rows.length; i++) {
      const row = grid.rows[i]
      if (!row) continue
      const lat = grid.lat_top - i
      for (let j = 0; j < row.length; j++) {
        const v = row[j]
        if (!v) continue
        const code = grid.code_names[v]
        if (!code) continue
        const lon = grid.lon_left + j
        cells.push({ latBucket: lat, lonBucket: lon, code })
      }
    }

    await db.transaction('rw', db.koppenCells, db.dataVersions, async () => {
      await db.koppenCells.clear()
      await db.koppenCells.bulkAdd(cells)
      await db.dataVersions.put({
        key: KOPPEN_VERSION_KEY,
        version: '2023-1991_2020-1deg',
        fetchedAt: new Date().toISOString(),
      })
    })
  })()
  return hydrationPromise
}

export async function lookupKoppen(
  lat: number,
  lon: number,
): Promise<string | null> {
  await ensureKoppenLoaded()
  const latBucket = bucketFromLat(lat, 89.5)
  const lonBucket = bucketFromLon(lon, -179.5)
  const cell = await db.koppenCells.get([latBucket, lonBucket])
  return cell?.code ?? null
}
