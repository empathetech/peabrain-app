import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Welcome from './routes/Welcome'
import Location from './routes/Location'
import GardenSetup from './routes/GardenSetup'
import Canvas from './routes/Canvas'
import { OnboardingProvider } from './state/OnboardingContext'
import { bootstrapGrids } from './state/grid-bootstrap'

// HashRouter avoids 404s on refresh / direct-link under GitHub Pages, where
// only `/peabrain-app/` is server-served. Revisit if we move off Pages.
export default function App() {
  useEffect(() => {
    bootstrapGrids()
  }, [])

  return (
    <OnboardingProvider>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/location" element={<Location />} />
          <Route path="/garden" element={<GardenSetup />} />
          <Route path="/canvas" element={<Canvas />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </OnboardingProvider>
  )
}
