import { describe, expect, it, vi } from 'vitest'
import { GeocodeError, geocode, roundCoord } from './geocode'

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
