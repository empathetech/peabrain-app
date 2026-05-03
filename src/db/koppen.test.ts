// Verifies the bundled Köppen-Geiger grid resolves well-known cities to the
// codes Beck et al. (2023) report at 1° resolution. This is both a smoke test
// for the build-koppen-grid.mjs pipeline and a regression guard against
// accidental dataset swaps.

import { describe, expect, it } from 'vitest'
import grid from '../../public/data/koppen/grid.json'

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
})
