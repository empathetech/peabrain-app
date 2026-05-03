import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GardenCanvas from '../components/Canvas/GardenCanvas'
import { db } from '../db/schema'
import { describeKoppen } from '../db/koppen-meta'
import { getActiveGardenId } from '../services/active-garden'
import type { Garden } from '../db/types'
import './Canvas.css'

type Status = 'loading' | 'ready' | 'missing' | 'error'

export default function Canvas() {
  const navigate = useNavigate()
  const [garden, setGarden] = useState<Garden | null>(null)
  // Derived synchronously: if no active garden id, we're already 'missing'
  // before the first render — no effect-driven setState cascade.
  const initialId = getActiveGardenId()
  const [status, setStatus] = useState<Status>(
    initialId ? 'loading' : 'missing',
  )

  useEffect(() => {
    if (!initialId) return
    let cancelled = false
    db.gardens
      .get(initialId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setStatus('missing')
          return
        }
        setGarden(row)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [initialId])

  useEffect(() => {
    if (status === 'missing') navigate('/', { replace: true })
  }, [status, navigate])

  if (status === 'loading') {
    return (
      <main className="canvas-route">
        <p>Loading your garden…</p>
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className="canvas-route">
        <p role="alert">
          Something went wrong reading your garden. Please reload.
        </p>
      </main>
    )
  }
  if (!garden) return null

  return (
    <main className="canvas-route">
      <header className="canvas-route__header">
        <h1>{garden.name}</h1>
        <p className="canvas-route__meta">
          {garden.location.label} &middot;{' '}
          <strong>{garden.location.koppenCode}</strong>{' '}
          {describeKoppen(garden.location.koppenCode)}
        </p>
      </header>
      <GardenCanvas key={garden.id} garden={garden} />
      <p className="canvas-route__hint">
        This is your empty plot. Surfaces and plantings come next.
      </p>
    </main>
  )
}
