import { describe, expect, it, vi } from 'vitest'
import {
  GeocodeError,
  geocode,
  parseCoordinatePair,
  roundCoord,
} from './geocode'

function makeFetch(
  response: { ok: boolean; status?: number; body: unknown } | Error,
) {
  return vi.fn(async () => {
    if (response instanceof Error) throw response
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? (response.ok ? 200 : 500),
    })
  }) as unknown as typeof fetch
}

describe('geocode', () => {
  it('returns null for empty query', async () => {
    const res = await geocode('   ', makeFetch({ ok: true, body: [] }))
    expect(res).toBeNull()
  })

  it('returns null when Nominatim has no results', async () => {
    const res = await geocode('xxxx', makeFetch({ ok: true, body: [] }))
    expect(res).toBeNull()
  })

  it('parses a successful response', async () => {
    const res = await geocode(
      'Lisbon, Portugal',
      makeFetch({
        ok: true,
        body: [
          {
            display_name: 'Lisbon, Lisbon Municipality, Portugal',
            lat: '38.7077507',
            lon: '-9.1365919',
            address: { country_code: 'pt' },
          },
        ],
      }),
    )
    expect(res).toEqual({
      label: 'Lisbon, Lisbon Municipality, Portugal',
      lat: 38.7077507,
      lon: -9.1365919,
      countryCode: 'PT',
    })
  })

  it('throws GeocodeError on HTTP error', async () => {
    await expect(
      geocode('x', makeFetch({ ok: false, status: 503, body: null })),
    ).rejects.toBeInstanceOf(GeocodeError)
  })

  it('throws GeocodeError on network failure', async () => {
    await expect(
      geocode('x', makeFetch(new TypeError('boom'))),
    ).rejects.toBeInstanceOf(GeocodeError)
  })
})

describe('roundCoord', () => {
  it('rounds to 0.1°', () => {
    expect(roundCoord(38.7077507)).toBe(38.7)
    expect(roundCoord(-9.1365919)).toBe(-9.1)
    expect(roundCoord(0.04)).toBe(0)
    expect(roundCoord(0.06)).toBe(0.1)
  })
})

describe('parseCoordinatePair', () => {
  it('parses decimal pairs', () => {
    expect(parseCoordinatePair('36, -15')).toEqual({ lat: 36, lon: -15 })
    expect(parseCoordinatePair('36 -15')).toEqual({ lat: 36, lon: -15 })
    expect(parseCoordinatePair('-12.05, -77.04')).toEqual({
      lat: -12.05,
      lon: -77.04,
    })
  })

  it('parses N/S/E/W notation in either order', () => {
    expect(parseCoordinatePair('36N, 15W')).toEqual({ lat: 36, lon: -15 })
    expect(parseCoordinatePair('36 N and 15 W')).toEqual({
      lat: 36,
      lon: -15,
    })
    expect(parseCoordinatePair('36.5°N 15.2°W')).toEqual({
      lat: 36.5,
      lon: -15.2,
    })
    expect(parseCoordinatePair('15W 36N')).toEqual({ lat: 36, lon: -15 })
    expect(parseCoordinatePair('33.9S, 151.2E')).toEqual({
      lat: -33.9,
      lon: 151.2,
    })
  })

  it('returns null for non-coordinate strings', () => {
    expect(parseCoordinatePair('Lisbon, Portugal')).toBeNull()
    expect(parseCoordinatePair('Portland, OR')).toBeNull()
    expect(parseCoordinatePair('90210')).toBeNull()
    expect(parseCoordinatePair('')).toBeNull()
    expect(parseCoordinatePair('   ')).toBeNull()
  })

  it('rejects out-of-range coordinates', () => {
    expect(parseCoordinatePair('200, 50')).toBeNull()
    expect(parseCoordinatePair('45, 200')).toBeNull()
  })

  it('does not accept ambiguous single numbers', () => {
    expect(parseCoordinatePair('36')).toBeNull()
    expect(parseCoordinatePair('36N')).toBeNull()
  })
})
