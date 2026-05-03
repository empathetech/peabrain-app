// Verifies the bundled Köppen-Geiger grid resolves well-known cities to the
// codes Beck et al. (2023) report at 1° resolution. This is both a smoke test
// for the build-koppen-grid.mjs pipeline and a regression guard against
// accidental dataset swaps.

import { describe, expect, it } from 'vitest'
import grid from '../../public/data/koppen/grid.json'
import { bucketFromLat, bucketFromLon } from './koppen'

function lookup(lat: number, lon: number): string {
  const i = Math.round(grid.lat_top - lat)
  const j = Math.round(lon - grid.lon_left)
  const v = grid.rows[i]?.[j] ?? 0
  return grid.code_names[v] ?? 'ocean'
}

describe('Köppen grid', () => {
  it('resolves well-known cities to plausible Köppen codes', () => {
    // Codes verified against Beck et al. (2023) 1991–2020 1° map.
    const cases: [string, number, number, string][] = [
      ['London', 51.5, -0.1, 'Cfb'],
      ['Cairo', 30.0, 31.2, 'BWh'],
      ['Singapore', 1.3, 103.8, 'Af'],
      ['Sydney', -33.9, 151.2, 'Cfa'],
      ['Lisbon', 38.7, -9.1, 'Csb'],
    ]
    for (const [name, lat, lon, expected] of cases) {
      expect(lookup(lat, lon), name).toBe(expected)
    }
  })

  it('returns ocean for a mid-Pacific point', () => {
    expect(lookup(0, -150)).toBe('ocean')
  })

  // Regression for the bug where bucketFromLat / bucketFromLon rounded
  // to an integer, causing every Dexie lookup to miss because cells are
  // stored at half-integer centres (45.5, -122.5, etc.). Without the fix
  // every land cell appeared as "ocean" in the running app.
  it('lookup buckets round to half-integer centres for half-integer lats', () => {
    expect(bucketFromLat(45.5, 89.5)).toBe(45.5)
    expect(bucketFromLat(-33.9, 89.5)).toBe(-33.5)
    expect(bucketFromLat(64.1, 89.5)).toBe(64.5)
    expect(bucketFromLon(-122.7, -179.5)).toBe(-122.5)
    expect(bucketFromLon(151.2, -179.5)).toBe(151.5)
    // The crucial regression case: half-integer-on-the-nose values must
    // round-trip to themselves (not to the next integer).
    expect(bucketFromLat(45.5, 89.5)).not.toBe(46)
  })

  it('bucket round-trips: store(latTop - i) == lookup(latTop - i)', () => {
    // For every grid row index, the stored bucket value must equal the
    // value the lookup computes for that row's representative lat.
    for (let i = 0; i < 180; i++) {
      const storedLatBucket = 89.5 - i
      expect(bucketFromLat(storedLatBucket, 89.5)).toBe(storedLatBucket)
    }
    for (let j = 0; j < 360; j++) {
      const storedLonBucket = -179.5 + j
      expect(bucketFromLon(storedLonBucket, -179.5)).toBe(storedLonBucket)
    }
  })
})
