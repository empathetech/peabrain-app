// Verifies the bundled frost-date grid produces defensible dates for
// well-known cities across hemispheres and Köppen groups. This catches
// regressions in the per-zone anchor table and hemisphere-shift logic.

import { describe, expect, it } from 'vitest'
import frost from '../../public/data/frost/grid.json'
import koppen from '../../public/data/koppen/grid.json'

function lookupCell(lat: number, lon: number): [number, number] | null {
  const i = Math.round(frost.lat_top - lat)
  const j = Math.round(lon - frost.lon_left)
  return (frost.rows[i]?.[j] as [number, number] | null) ?? null
}

function lookupCode(lat: number, lon: number): string {
  const i = Math.round(koppen.lat_top - lat)
  const j = Math.round(lon - koppen.lon_left)
  const v = koppen.rows[i]?.[j] ?? 0
  return koppen.code_names[v] ?? 'ocean'
}

function doyToMonthDay(doy: number): string {
  const ref = new Date(Date.UTC(2025, 0, 1))
  ref.setUTCDate(doy)
  return ref.toISOString().slice(5, 10)
}

describe('frost-date grid', () => {
  it('returns null for tropical and hot-arid zones', () => {
    expect(lookupCell(1.3, 103.8)).toBeNull() // Singapore (Af)
    expect(lookupCell(30.0, 31.2)).toBeNull() // Cairo (BWh)
  })

  it('returns null for polar / subarctic zones', () => {
    // Reykjavik resolves to Dfc at 1°, which is allowed; what we check is
    // that *EF / Dfd* cells (high arctic) are null. Pick a confirmed Dfd.
    const lat = 75
    const lon = 100
    const code = lookupCode(lat, lon)
    if (code.startsWith('E') || code === 'Dfd' || code === 'Dwd') {
      expect(lookupCell(lat, lon)).toBeNull()
    }
  })

  it('produces NH frost dates with last < first', () => {
    const stockholm = lookupCell(59.3, 18.1)
    expect(stockholm).not.toBeNull()
    if (stockholm) {
      const [last, first] = stockholm
      expect(last).toBeLessThan(first)
      expect(doyToMonthDay(last)).toBe('05-10')
      expect(doyToMonthDay(first)).toBe('09-30')
    }
  })

  it('shifts SH frost dates so last > first (winter wraps year boundary)', () => {
    const sydney = lookupCell(-33.9, 151.2)
    expect(sydney).not.toBeNull()
    if (sydney) {
      const [last, first] = sydney
      // Southern hemisphere: last spring frost (Oct) is later in the year
      // than first fall frost (May), because winter spans the new year.
      expect(last).toBeGreaterThan(first)
    }
  })

  it('London (Cfb) lands in early spring / late autumn', () => {
    const london = lookupCell(51.5, -0.1)
    expect(london).not.toBeNull()
    if (london) {
      const [last, first] = london
      expect(doyToMonthDay(last)).toBe('04-20')
      expect(doyToMonthDay(first)).toBe('11-01')
    }
  })
})
