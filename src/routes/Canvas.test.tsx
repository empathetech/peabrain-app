import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Canvas from './Canvas'
import type { Garden } from '../db/types'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useNavigate: () => navigateMock }
})

const getMock = vi.fn()
vi.mock('../db/schema', () => ({
  db: { gardens: { get: (id: string) => getMock(id) } },
}))

const getActiveGardenIdMock = vi.fn()
vi.mock('../services/active-garden', () => ({
  getActiveGardenId: () => getActiveGardenIdMock(),
}))

const SAMPLE_GARDEN: Garden = {
  id: 'garden-1',
  name: 'Backyard',
  location: {
    label: 'Lisbon, Portugal',
    coords: { lat: 38.7, lon: -9.1 },
    koppenCode: 'Csb',
    hemisphere: 'northern',
  },
  units: 'metric',
  bounds: { widthCm: 600, heightCm: 400 },
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
}

beforeEach(() => {
  navigateMock.mockClear()
  getMock.mockReset()
  getActiveGardenIdMock.mockReset()
})

function renderCanvas() {
  return render(
    <MemoryRouter>
      <Canvas />
    </MemoryRouter>,
  )
}

describe('Canvas route', () => {
  it('redirects to Welcome when no active garden id is stored', () => {
    getActiveGardenIdMock.mockReturnValue(null)
    renderCanvas()
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
  })

  it('renders the garden name and Köppen description', async () => {
    getActiveGardenIdMock.mockReturnValue('garden-1')
    getMock.mockResolvedValue(SAMPLE_GARDEN)
    renderCanvas()
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Backyard/ }),
      ).toBeInTheDocument()
    })
    expect(screen.getByText(/Csb/)).toBeInTheDocument()
    expect(screen.getByText(/Temperate, dry summer, warm summer/i)).toBeInTheDocument()
  })

  it('renders the SVG canvas with an accessible label', async () => {
    getActiveGardenIdMock.mockReturnValue('garden-1')
    getMock.mockResolvedValue(SAMPLE_GARDEN)
    renderCanvas()
    await waitFor(() => {
      expect(screen.getByRole('application')).toBeInTheDocument()
    })
    expect(screen.getByRole('application')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Backyard'),
    )
  })
})
