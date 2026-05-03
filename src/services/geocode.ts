// Nominatim geocoding client. Single-shot lookups only — never batch — to
// stay within OpenStreetMap's fair-use policy (1 req/sec, identifying UA).
//
// Coordinate privacy: callers should round results to 0.1° per
// SECURITY_PRIVACY.md before storing.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

// Identifying UA per Nominatim policy. Browsers refuse to set User-Agent
// directly, but we pass an Accept-Language and Referer the request will
// expose, plus &email= as the documented identifying handle for browser
// callers.
const CONTACT_EMAIL = 'hello@empathetech.org'

export type GeocodeResult = {
  label: string         // "Lisbon, Lisbon Municipality, Portugal"
  lat: number           // raw lat from Nominatim
  lon: number           // raw lon from Nominatim
  countryCode?: string  // ISO 3166-1 alpha-2, lowercased upstream
}

export class GeocodeError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GeocodeError'
    this.status = status
  }
}

export async function geocode(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const url = new URL(NOMINATIM_BASE)
  url.searchParams.set('q', trimmed)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('email', CONTACT_EMAIL)

  let res: Response
  try {
    res = await fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new GeocodeError('Network error reaching the geocoder.')
  }

  if (!res.ok) {
    throw new GeocodeError(
      `Geocoder returned ${res.status}.`,
      res.status,
    )
  }

  const data = (await res.json()) as Array<{
    display_name: string
    lat: string
    lon: string
    address?: { country_code?: string }
  }>

  if (!data.length) return null
  const hit = data[0]
  if (!hit) return null

  const lat = Number(hit.lat)
  const lon = Number(hit.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new GeocodeError('Geocoder returned a malformed coordinate.')
  }

  return {
    label: hit.display_name,
    lat,
    lon,
    countryCode: hit.address?.country_code?.toUpperCase(),
  }
}

// Round coordinates to 0.1° (~11 km) before persisting.
export function roundCoord(value: number): number {
  return Math.round(value * 10) / 10
}
