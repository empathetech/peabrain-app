import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { db } from '../db/schema'
import type { Garden } from '../db/types'
import { useOnboarding } from '../state/OnboardingContext'
import { setActiveGardenId } from '../services/active-garden'
import './GardenSetup.css'

const M_PER_FT = 0.3048
const CM_PER_M = 100

function toCm(value: number, units: 'metric' | 'imperial'): number {
  if (units === 'metric') return Math.round(value * CM_PER_M)
  return Math.round(value * M_PER_FT * CM_PER_M)
}

export default function GardenSetup() {
  const navigate = useNavigate()
  const { draft, setLocation } = useOnboarding()
  const [name, setName] = useState('')
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!draft.location) navigate('/location', { replace: true })
  }, [draft.location, navigate])

  if (!draft.location) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give your garden a name.')
      return
    }
    const w = Number(width)
    const l = Number(length)
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(l) || l <= 0) {
      setError('Width and length should be positive numbers.')
      return
    }

    setBusy(true)
    try {
      const now = new Date().toISOString()
      const id = crypto.randomUUID()
      const garden: Garden = {
        id,
        name: trimmed,
        location: draft.location!,
        units,
        bounds: {
          widthCm: toCm(w, units),
          lengthCm: toCm(l, units),
        },
        createdAt: now,
        updatedAt: now,
      }
      await db.gardens.add(garden)
      setActiveGardenId(id)
      // Clear the onboarding draft's location now that it lives on the
      // saved Garden — keeps the flow restartable for a second garden.
      setLocation(garden.location)
      navigate('/canvas')
    } catch {
      setError("We couldn't save your garden — your browser may be blocking storage.")
    } finally {
      setBusy(false)
    }
  }

  const unitLabel = units === 'metric' ? 'metres' : 'feet'

  return (
    <main id="main" className="garden-setup">
      <h1>Set up your garden</h1>
      <p className="garden-setup__intro">
        We&rsquo;ve got your zone. Now tell us about the patch you&rsquo;ll be
        planting in &mdash; it&rsquo;s a top-down footprint, so just the two
        dimensions.
      </p>

      <form onSubmit={handleSubmit} className="garden-setup__form" noValidate>
        <label className="garden-setup__field">
          <span>Garden name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Backyard"
            required
          />
        </label>

        <fieldset className="garden-setup__units">
          <legend>Units</legend>
          <label>
            <input
              type="radio"
              name="units"
              value="metric"
              checked={units === 'metric'}
              onChange={() => setUnits('metric')}
            />
            <span>Metric (metres)</span>
          </label>
          <label>
            <input
              type="radio"
              name="units"
              value="imperial"
              checked={units === 'imperial'}
              onChange={() => setUnits('imperial')}
            />
            <span>Imperial (feet)</span>
          </label>
        </fieldset>

        <div className="garden-setup__dims">
          <label className="garden-setup__field">
            <span>Width ({unitLabel})</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="6"
              required
            />
          </label>
          <label className="garden-setup__field">
            <span>Length ({unitLabel})</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="4"
              required
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="garden-setup__error">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Create garden'}
        </Button>
      </form>
    </main>
  )
}
