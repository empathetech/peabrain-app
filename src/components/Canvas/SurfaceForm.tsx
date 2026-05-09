// Form for capturing the fields of a new (or being-edited) surface. The
// caller owns the draft state and decides whether the result becomes a
// `createSurface` call (Task 3) or an `updateSurface` call (Task 5).

import { useState, type FormEvent } from 'react'
import Button from '../Button'
import type { Shape, SurfaceType } from '../../db/types'
import './SurfaceForm.css'

const M_PER_FT = 0.3048
const CM_PER_M = 100

function toCm(value: number, units: 'metric' | 'imperial'): number {
  if (units === 'metric') return Math.round(value * CM_PER_M)
  return Math.round(value * M_PER_FT * CM_PER_M)
}

function fromCm(cm: number, units: 'metric' | 'imperial'): string {
  const value = units === 'metric' ? cm / CM_PER_M : cm / CM_PER_M / M_PER_FT
  // Up to 2 decimal places, no trailing zeros — keeps the input typable
  // (typing "8.6" shouldn't be auto-rewritten to "8.60").
  return Number(value.toFixed(2)).toString()
}

import type { SurfaceFormValues } from './surface-form-defaults'

type Props = {
  type: SurfaceType
  units: 'metric' | 'imperial'
  initial: SurfaceFormValues
  // Heading shown at the top of the form. Differentiates "Add" vs "Edit".
  heading: string
  submitLabel: string
  onSubmit: (values: SurfaceFormValues) => void | Promise<void>
  onCancel: () => void
  // Optional: render a "Delete surface" affordance in the form footer.
  // The caller owns confirmation; this just kicks off the flow.
  onDelete?: () => void
}

const TYPE_LABEL: Record<SurfaceType, string> = {
  'in-ground': 'in-ground plot',
  'raised-bed': 'raised bed',
  planter: 'planter',
  trellis: 'trellis',
}

export default function SurfaceForm({
  type,
  units,
  initial,
  heading,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial.name)
  const [shape, setShape] = useState<Shape>(initial.shape)
  // Depth is always entered in cm, regardless of `units`. Soil depth is a
  // small dimension where centimetres are the right granularity for both
  // metric and imperial gardeners (raised beds are ~25cm / ~10in deep).
  const [depth, setDepth] = useState<string>(
    initial.depthCm !== undefined ? String(initial.depthCm) : '',
  )
  const [buildOrBuy, setBuildOrBuy] = useState<SurfaceFormValues['buildOrBuy']>(
    initial.buildOrBuy,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync from `initial` is handled in the parent: it bumps the SurfaceForm
  // `key` when the surface's shape changes externally (drag-resize,
  // Alt+Arrow). That remounts this component with the fresh `initial`,
  // which keeps the inputs honest without an effect-driven setState.

  const wantsDepth = type === 'raised-bed' || type === 'planter'
  const unitLabel = units === 'metric' ? 'm' : 'ft'

  const widthDisplay =
    shape.kind === 'rect' ? fromCm(shape.widthCm, units) : ''
  const heightDisplay =
    shape.kind === 'rect' ? fromCm(shape.heightCm, units) : ''
  const diameterDisplay =
    shape.kind === 'circle' ? fromCm(shape.diameterCm, units) : ''

  function setRectField(field: 'widthCm' | 'heightCm', value: string) {
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) return
    setShape((s) =>
      s.kind === 'rect' ? { ...s, [field]: toCm(num, units) } : s,
    )
  }

  function setCircleDiameter(value: string) {
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) return
    setShape((s) =>
      s.kind === 'circle' ? { ...s, diameterCm: toCm(num, units) } : s,
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (shape.kind === 'rect' && (shape.widthCm <= 0 || shape.heightCm <= 0)) {
      setError('Dimensions should be positive numbers.')
      return
    }
    if (shape.kind === 'circle' && shape.diameterCm <= 0) {
      setError('Diameter should be a positive number.')
      return
    }

    let depthCm: number | undefined
    if (wantsDepth) {
      const d = Number(depth)
      if (!Number.isFinite(d) || d <= 0) {
        setError('Depth should be a positive number.')
        return
      }
      depthCm = Math.round(d)
    }

    setBusy(true)
    try {
      await onSubmit({
        name: name.trim(),
        shape,
        depthCm,
        buildOrBuy,
      })
    } catch {
      setError("We couldn't save this surface — your browser may be blocking storage.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="surface-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={heading}
    >
      <h2 className="surface-form__heading">{heading}</h2>
      <p className="surface-form__type">Type: {TYPE_LABEL[type]}</p>

      <label className="surface-form__field">
        <span>
          Name <em>(optional)</em>
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            type === 'raised-bed'
              ? 'North bed'
              : type === 'planter'
                ? 'Patio pot'
                : 'Front border'
          }
        />
      </label>

      {shape.kind === 'rect' ? (
        <div className="surface-form__dims">
          <label className="surface-form__field">
            <span>Width ({unitLabel})</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={widthDisplay}
              onChange={(e) => setRectField('widthCm', e.target.value)}
              required
            />
          </label>
          <label className="surface-form__field">
            <span>Length ({unitLabel})</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={heightDisplay}
              onChange={(e) => setRectField('heightCm', e.target.value)}
              required
            />
          </label>
        </div>
      ) : (
        <label className="surface-form__field">
          <span>Diameter ({unitLabel})</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={diameterDisplay}
            onChange={(e) => setCircleDiameter(e.target.value)}
            required
          />
        </label>
      )}

      {wantsDepth && (
        <label className="surface-form__field">
          <span>Depth (cm)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            required
          />
        </label>
      )}

      <fieldset className="surface-form__acquisition">
        <legend>Where does it come from?</legend>
        <label>
          <input
            type="radio"
            name="buildOrBuy"
            value="existing"
            checked={buildOrBuy === 'existing'}
            onChange={() => setBuildOrBuy('existing')}
          />
          <span>Already have it</span>
        </label>
        <label>
          <input
            type="radio"
            name="buildOrBuy"
            value="build"
            checked={buildOrBuy === 'build'}
            onChange={() => setBuildOrBuy('build')}
          />
          <span>Going to build</span>
        </label>
        <label>
          <input
            type="radio"
            name="buildOrBuy"
            value="buy"
            checked={buildOrBuy === 'buy'}
            onChange={() => setBuildOrBuy('buy')}
          />
          <span>Going to buy</span>
        </label>
      </fieldset>

      {error && (
        <p role="alert" className="surface-form__error">
          {error}
        </p>
      )}

      <div className="surface-form__actions">
        {onDelete && (
          <button
            type="button"
            className="surface-form__delete"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

