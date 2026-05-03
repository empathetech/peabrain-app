import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { lookupKoppen } from '../db/koppen'
import { describeKoppen } from '../db/koppen-meta'
import { lookupFrost } from '../db/frost'
import { geocode, GeocodeError, roundCoord } from '../services/geocode'
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
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Resolved | null>(null)

  async function handleResolve(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setResolved(null)
    setBusy(true)
    try {
      const query = [city.trim(), country.trim()].filter(Boolean).join(', ')
      if (!query) {
        setError('Please enter at least a city or country.')
        return
      }
      const hit = await geocode(query)
      if (!hit) {
        setError(`We couldn't find "${query}". Try a larger nearby city.`)
        return
      }
      const lat = roundCoord(hit.lat)
      const lon = roundCoord(hit.lon)
      const koppenCode = await lookupKoppen(lat, lon)
      if (!koppenCode) {
        setError(
          'That looks like an ocean cell on our climate grid. Try a city closer to where you garden.',
        )
        return
      }
      const frostCell = await lookupFrost(lat, lon)
      const location: LocationData = {
        label: hit.label,
        countryCode: hit.countryCode,
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
          <span>City or town</span>
          <input
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Lisbon"
            required
          />
        </label>
        <label className="location__field">
          <span>Country</span>
          <input
            type="text"
            autoComplete="country-name"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Portugal"
          />
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
