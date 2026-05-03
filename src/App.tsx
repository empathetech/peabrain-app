import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Welcome from './routes/Welcome'
import Location from './routes/Location'
import GardenSetup from './routes/GardenSetup'
import Canvas from './routes/Canvas'

// HashRouter avoids 404s on refresh / direct-link under GitHub Pages, where
// only `/peabrain-app/` is server-served. Revisit if we move off Pages.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/location" element={<Location />} />
        <Route path="/garden" element={<GardenSetup />} />
        <Route path="/canvas" element={<Canvas />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
