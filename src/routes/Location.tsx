import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { lookupKoppen } from '../db/koppen'
import { describeKoppen } from '../db/koppen-meta'
import { lookupFrost } from '../db/frost'
import {
  geocode,
  GeocodeError,
  parseCoordinatePair,
  reverseGeocode,
  roundCoord,
} from '../services/geocode'
import { useOnboarding } from '../state/OnboardingContext'
import type { Location as LocationData } from '../db/types'
import './Location.css'

type Resolved = {
  location: LocationData
  frost: { last?: string; first?: string; stdDevDays?: number } | null
}

export default function Location() {
  const navigate = useNavigate()
  const { setLocation } = useOnboarding()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Resolved | null>(null)

  async function handleResolve(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setResolved(null)
    setBusy(true)
    try {
      const trimmed = query.trim()
      if (!trimmed) {
        setError(
          'Please enter a place name, postal code, or coordinates ("36, -15" or "36N 15W").',
        )
        return
      }

      // Coordinate input branch: parse client-side so Nominatim's text
      // search never sees "36N 15W" (it would fuzzy-match to a wrong place).
      // We use the user's coords directly and reverse-geocode for a label.
      const coordPair = parseCoordinatePair(trimmed)
      let lat: number
      let lon: number
      let label: string
      let countryCode: string | undefined

      if (coordPair) {
        lat = roundCoord(coordPair.lat)
        lon = roundCoord(coordPair.lon)
        const reversed = await reverseGeocode(lat, lon)
        label = reversed ?? `${lat}°, ${lon}°`
        countryCode = undefined
      } else {
        const hit = await geocode(trimmed)
        if (!hit) {
          setError(
            `We couldn't find "${trimmed}" on the map. Check spelling, or try a larger nearby city. We also accept postal codes (e.g. "90210"), decimal coordinates ("36, -15"), or hemisphere notation ("36N 15W").`,
          )
          return
        }
        lat = roundCoord(hit.lat)
        lon = roundCoord(hit.lon)
        label = hit.label
        countryCode = hit.countryCode
      }

      const koppenCode = await lookupKoppen(lat, lon)
      if (!koppenCode) {
        setError(
          `We resolved that to "${label}" at roughly ${lat}°, ${lon}°, but our climate grid doesn't have land data for that 1° cell — likely an ocean point, a small island, or right on a coastline. Try a larger town a bit further inland.`,
        )
        return
      }
      const frostCell = await lookupFrost(lat, lon)
      const location: LocationData = {
        label,
        countryCode,
        coords: { lat, lon },
        koppenCode,
        hemisphere: lat >= 0 ? 'northern' : 'southern',
      }
      setResolved({
        location,
        frost: frostCell
          ? {
              last: frostCell.avgLastSpringFrost,
              first: frostCell.avgFirstFallFrost,
              stdDevDays: frostCell.stdDevDays,
            }
          : null,
      })
    } catch (err) {
      if (err instanceof GeocodeError) {
        setError(`The geocoder is having trouble: ${err.message}`)
      } else {
        setError('Something unexpected went wrong. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  function handleConfirm() {
    if (!resolved) return
    setLocation(resolved.location)
    navigate('/garden')
  }

  return (
    <main id="main" className="location">
      <h1>Where is your garden?</h1>
      <p className="location__intro">
        Tell us roughly where you grow. We use this to figure out your climate
        zone and frost dates &mdash; and we round your coordinates to about
        11&nbsp;km before saving anything.
      </p>

      <form onSubmit={handleResolve} className="location__form" noValidate>
        <label className="location__field">
          <span>Where is your garden?</span>
          <input
            type="text"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Portland, OR  ·  Lisbon, Portugal  ·  Sydney, NSW"
            aria-describedby="location-help"
            required
          />
          <small id="location-help" className="location__hint">
            Include the state, region, or country if your city name is common
            &mdash; e.g. <em>Portland, OR</em> vs <em>Portland, ME</em>.
            Postal codes work too. For coordinates, use a decimal pair
            (<em>36, -15</em>) or hemisphere letters (<em>36N 15W</em>).
          </small>
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? 'Looking up…' : 'Find my zone'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="location__error">
          {error}
        </p>
      )}

      {resolved && (
        <section
          className="location__result"
          aria-live="polite"
          aria-labelledby="location-result-heading"
        >
          <h2 id="location-result-heading">We found you</h2>
          <p>
            <strong>{resolved.location.label}</strong>
          </p>
          <dl className="location__zone">
            <dt>Köppen zone</dt>
            <dd>
              <strong>{resolved.location.koppenCode}</strong> &mdash;{' '}
              {describeKoppen(resolved.location.koppenCode)}
            </dd>

            <dt>Hemisphere</dt>
            <dd>{resolved.location.hemisphere}</dd>

            <dt>Frost dates (approximate)</dt>
            <dd>
              {resolved.frost?.last && resolved.frost?.first ? (
                <>
                  Last spring frost ~{resolved.frost.last}, first fall frost ~
                  {resolved.frost.first}
                  {typeof resolved.frost.stdDevDays === 'number' && (
                    <> &nbsp;(&plusmn;{resolved.frost.stdDevDays} days)</>
                  )}
                </>
              ) : (
                'No frost expected — your zone is frost-free in our model.'
              )}
            </dd>
          </dl>
          <p className="location__caveat">
            We&rsquo;ll let you fine-tune your frost dates later. For now,
            this is a defensible starting point.
          </p>
          <div className="location__actions">
            <Button onClick={handleConfirm}>Looks right &mdash; continue</Button>
            <Button
              variant="secondary"
              onClick={() => setResolved(null)}
              type="button"
            >
              Try a different place
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}
