import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Location from './Location'
import { OnboardingProvider } from '../state/OnboardingContext'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../services/geocode', async () => {
  const actual = await vi.importActual<typeof import('../services/geocode')>(
    '../services/geocode',
  )
  return {
    ...actual,
    geocode: vi.fn(),
  }
})

vi.mock('../db/koppen', () => ({
  lookupKoppen: vi.fn(async () => 'Csb'),
}))

vi.mock('../db/frost', () => ({
  lookupFrost: vi.fn(async () => ({
    avgLastSpringFrost: '04-01',
    avgFirstFallFrost: '11-15',
    stdDevDays: 21,
  })),
}))

import { geocode } from '../services/geocode'
const geocodeMock = vi.mocked(geocode)

function renderLocation() {
  return render(
    <OnboardingProvider>
      <MemoryRouter>
        <Location />
      </MemoryRouter>
    </OnboardingProvider>,
  )
}

beforeEach(() => {
  navigateMock.mockClear()
  geocodeMock.mockReset()
  window.sessionStorage.clear()
})

describe('Location', () => {
  it('shows the resolved zone after a successful lookup', async () => {
    geocodeMock.mockResolvedValueOnce({
      label: 'Lisbon, Portugal',
      lat: 38.7,
      lon: -9.1,
      countryCode: 'PT',
    })
    renderLocation()
    await userEvent.type(
      screen.getByRole('textbox', { name: /where is your garden/i }),
      'Lisbon',
    )
    await userEvent.click(screen.getByRole('button', { name: /find my zone/i }))

    await waitFor(() => {
      expect(screen.getByText(/Köppen zone/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Csb/)).toBeInTheDocument()
    expect(screen.getByText(/Lisbon, Portugal/)).toBeInTheDocument()
  })

  it('surfaces an error when the geocoder finds nothing', async () => {
    geocodeMock.mockResolvedValueOnce(null)
    renderLocation()
    await userEvent.type(
      screen.getByRole('textbox', { name: /where is your garden/i }),
      'asdfqwerzxcv',
    )
    await userEvent.click(screen.getByRole('button', { name: /find my zone/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn/i)
  })

  it('navigates to /garden after the user confirms the resolved zone', async () => {
    geocodeMock.mockResolvedValueOnce({
      label: 'Lisbon, Portugal',
      lat: 38.7,
      lon: -9.1,
      countryCode: 'PT',
    })
    renderLocation()
    await userEvent.type(
      screen.getByRole('textbox', { name: /where is your garden/i }),
      'Lisbon',
    )
    await userEvent.click(screen.getByRole('button', { name: /find my zone/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /looks right/i }),
      ).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: /looks right/i }))
    expect(navigateMock).toHaveBeenCalledWith('/garden')
  })
})
