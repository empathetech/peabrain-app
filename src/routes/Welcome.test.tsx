import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Welcome from './Welcome'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useNavigate: () => navigateMock }
})

function renderWelcome() {
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  )
}

describe('Welcome', () => {
  it('renders heading and tagline', () => {
    renderWelcome()
    expect(
      screen.getByRole('heading', { level: 1, name: /peabrain/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/gardening companion/i)).toBeInTheDocument()
  })

  it('routes to /location when Start fresh is clicked', async () => {
    navigateMock.mockClear()
    renderWelcome()
    await userEvent.click(screen.getByRole('button', { name: /start fresh/i }))
    expect(navigateMock).toHaveBeenCalledWith('/location')
  })

  it('exposes an Import a plan button', () => {
    renderWelcome()
    expect(
      screen.getByRole('button', { name: /import a plan/i }),
    ).toBeInTheDocument()
  })
})
