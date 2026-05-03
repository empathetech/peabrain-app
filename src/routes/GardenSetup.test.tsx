import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import GardenSetup from './GardenSetup'
import { OnboardingProvider } from '../state/OnboardingContext'
import type { Location } from '../db/types'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useNavigate: () => navigateMock }
})

const addMock = vi.fn()
vi.mock('../db/schema', () => ({
  db: { gardens: { add: (...args: unknown[]) => addMock(...args) } },
}))

const setActiveGardenIdMock = vi.fn()
vi.mock('../services/active-garden', () => ({
  setActiveGardenId: (id: string) => setActiveGardenIdMock(id),
}))

const SAMPLE_LOCATION: Location = {
  label: 'Lisbon, Portugal',
  countryCode: 'PT',
  coords: { lat: 38.7, lon: -9.1 },
  koppenCode: 'Csb',
  hemisphere: 'northern',
}

beforeEach(() => {
  navigateMock.mockClear()
  addMock.mockReset()
  addMock.mockResolvedValue('id')
  setActiveGardenIdMock.mockClear()
  window.sessionStorage.clear()
  window.sessionStorage.setItem(
    'peabrain.onboarding-draft',
    JSON.stringify({ location: SAMPLE_LOCATION }),
  )
})

function renderGardenSetup() {
  return render(
    <OnboardingProvider>
      <MemoryRouter>
        <GardenSetup />
      </MemoryRouter>
    </OnboardingProvider>,
  )
}

describe('GardenSetup', () => {
  it('redirects to /location when no draft location exists', () => {
    window.sessionStorage.clear()
    renderGardenSetup()
    expect(navigateMock).toHaveBeenCalledWith('/location', { replace: true })
  })

  it('saves the garden in centimetres and navigates to /canvas', async () => {
    renderGardenSetup()
    await userEvent.type(
      screen.getByRole('textbox', { name: /garden name/i }),
      'Backyard',
    )
    await userEvent.type(screen.getByRole('spinbutton', { name: /width/i }), '6')
    await userEvent.type(
      screen.getByRole('spinbutton', { name: /length/i }),
      '4',
    )
    await userEvent.click(screen.getByRole('button', { name: /create garden/i }))

    await waitFor(() => {
      expect(addMock).toHaveBeenCalledTimes(1)
    })
    const call = addMock.mock.calls[0]
    if (!call) throw new Error('expected db.gardens.add to be called')
    const garden = call[0]
    expect(garden.name).toBe('Backyard')
    expect(garden.units).toBe('metric')
    expect(garden.bounds).toEqual({ widthCm: 600, lengthCm: 400 })
    expect(garden.location).toEqual(SAMPLE_LOCATION)
    expect(setActiveGardenIdMock).toHaveBeenCalledWith(garden.id)
    expect(navigateMock).toHaveBeenCalledWith('/canvas')
  })

  it('converts imperial input to centimetres', async () => {
    renderGardenSetup()
    await userEvent.type(
      screen.getByRole('textbox', { name: /garden name/i }),
      'Backyard',
    )
    await userEvent.click(screen.getByRole('radio', { name: /imperial/i }))
    await userEvent.type(
      screen.getByRole('spinbutton', { name: /width/i }),
      '20',
    )
    await userEvent.type(
      screen.getByRole('spinbutton', { name: /length/i }),
      '10',
    )
    await userEvent.click(screen.getByRole('button', { name: /create garden/i }))

    await waitFor(() => {
      expect(addMock).toHaveBeenCalledTimes(1)
    })
    const call = addMock.mock.calls[0]
    if (!call) throw new Error('expected db.gardens.add to be called')
    const garden = call[0]
    // 20 ft = 609.6 cm → rounds to 610; 10 ft = 304.8 cm → rounds to 305
    expect(garden.bounds.widthCm).toBe(610)
    expect(garden.bounds.lengthCm).toBe(305)
    expect(garden.units).toBe('imperial')
  })

  it('rejects empty name', async () => {
    renderGardenSetup()
    await userEvent.type(screen.getByRole('spinbutton', { name: /width/i }), '6')
    await userEvent.type(
      screen.getByRole('spinbutton', { name: /length/i }),
      '4',
    )
    await userEvent.click(screen.getByRole('button', { name: /create garden/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/name/i)
    expect(addMock).not.toHaveBeenCalled()
  })
})
