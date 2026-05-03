import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Button from '../components/Button'
import { getActiveGardenId } from '../services/active-garden'
import './Welcome.css'

export default function Welcome() {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  // Returning users with a saved garden skip Welcome and go straight to
  // their plot. Synchronous read — no effect-driven setState cascade.
  const activeGarden = getActiveGardenId()

  useEffect(() => {
    if (activeGarden) navigate('/canvas', { replace: true })
  }, [activeGarden, navigate])

  if (activeGarden) return null

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Import wiring is deferred — for now just acknowledge and route forward.
    // The actual JSON import flow lands in a later task.
    navigate('/location')
  }

  return (
    <main id="main" className="welcome">
      <header className="welcome__header">
        <h1>peabrain</h1>
        <p className="welcome__tagline">
          A gardening companion that helps you plan a backyard plot — climate,
          surface, sun, and season aware.
        </p>
      </header>

      <p className="welcome__intro">
        Tell us where your garden lives and what shape it takes. We&rsquo;ll
        suggest plants that fit your climate and your patch of dirt, warn you
        when something&rsquo;s a stretch, and keep your plan saved on this
        device &mdash; yours to export anytime.
      </p>

      <div className="welcome__actions">
        <Button onClick={() => navigate('/location')}>Start fresh</Button>
        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
        >
          Import a plan
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: 'none' }}
        />
      </div>
    </main>
  )
}
