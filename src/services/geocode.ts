// Nominatim geocoding client. Single-shot lookups only — never batch — to
// stay within OpenStreetMap's fair-use policy (1 req/sec, identifying UA).
//
// Coordinate privacy: callers should round results to 0.1° per
// SECURITY_PRIVACY.md before storing.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'

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

// Recognises coordinate strings the user might type:
//   "36, -15"        "-12.05 -77.04"
//   "36N, 15W"       "36.5°N 15.2°W"
//   "36 N and 15 W"  "12.05S, 77.04W"
//
// Returns null when the input doesn't look like a coordinate pair so the
// caller can fall back to the search endpoint. Returning a value here
// short-circuits Nominatim's text search — vital, because Nominatim's
// `/search` does NOT parse N/S/E/W and will fuzzy-match strings like
// "36N and 15W" to unrelated places (e.g. Lima, Peru).
export function parseCoordinatePair(
  input: string,
): { lat: number; lon: number } | null {
  const cleaned = input.trim().replace(/°/g, '')
  if (!cleaned) return null

  // Hemisphere notation first (otherwise the bare-decimal regex would
  // greedily consume the digits and miss the N/S/E/W letters).
  const tokens = cleaned.match(/(\d+(?:\.\d+)?)\s*([NSEW])/gi)
  if (tokens && tokens.length === 2) {
    const parsed = tokens.map((tok) => {
      const m = tok.match(/(\d+(?:\.\d+)?)\s*([NSEW])/i)!
      return { value: Number(m[1]), dir: m[2]!.toUpperCase() }
    })
    const latTok = parsed.find((p) => p.dir === 'N' || p.dir === 'S')
    const lonTok = parsed.find((p) => p.dir === 'E' || p.dir === 'W')
    if (latTok && lonTok) {
      const lat = latTok.dir === 'S' ? -latTok.value : latTok.value
      const lon = lonTok.dir === 'W' ? -lonTok.value : lonTok.value
      if (isValidCoord(lat, lon)) return { lat, lon }
    }
  }

  // Strict decimal pair: "36, -15" / "36 -15" — both numbers must be
  // plain decimals (no hemisphere letters) for this branch.
  const decimal = cleaned.match(
    /^(-?\d+(?:\.\d+)?)[,;\s]+(-?\d+(?:\.\d+)?)$/,
  )
  if (decimal) {
    const lat = Number(decimal[1])
    const lon = Number(decimal[2])
    if (isValidCoord(lat, lon)) return { lat, lon }
  }

  return null
}

function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

// Reverse-geocode a known lat/lon to a human label. Failure is non-fatal —
// callers fall back to a coordinate-formatted label.
export async function reverseGeocode(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const url = new URL(NOMINATIM_REVERSE)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '10') // city-level
  url.searchParams.set('email', CONTACT_EMAIL)

  try {
    const res = await fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { display_name?: string }
    return data.display_name ?? null
  } catch {
    return null
  }
}
