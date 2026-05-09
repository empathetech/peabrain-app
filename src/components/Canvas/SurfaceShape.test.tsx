import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import SurfaceShape from './SurfaceShape'
import type { Surface } from '../../db/types'

function rect(overrides: Partial<Surface> = {}): Surface {
  return {
    id: 's-rect',
    gardenId: 'g',
    type: 'raised-bed',
    position: { x: 10, y: 20 },
    shape: { kind: 'rect', widthCm: 240, heightCm: 120 },
    ...overrides,
  }
}

function circle(overrides: Partial<Surface> = {}): Surface {
  return {
    id: 's-circle',
    gardenId: 'g',
    type: 'planter',
    position: { x: 100, y: 100 },
    shape: { kind: 'circle', diameterCm: 40 },
    ...overrides,
  }
}

function renderSvg(surface: Surface, opts?: { ghost?: boolean }) {
  return render(
    <svg>
      <SurfaceShape surface={surface} units="metric" {...opts} />
    </svg>,
  )
}

describe('SurfaceShape — per-type visual treatments', () => {
  it('in-ground uses the irregular-edge filter (feTurbulence + feDisplacementMap)', () => {
    const { container } = renderSvg(
      rect({ id: 'in-1', type: 'in-ground' }),
    )
    expect(container.querySelector('feTurbulence')).not.toBeNull()
    expect(container.querySelector('feDisplacementMap')).not.toBeNull()
    // No hard outline border.
    const path = container.querySelector('rect')
    expect(path?.getAttribute('stroke')).toBe('none')
  })

  it('raised-bed uses a wood-tone border and an inset shadow rectangle', () => {
    const { container } = renderSvg(rect({ id: 'rb-1', type: 'raised-bed' }))
    const rects = Array.from(container.querySelectorAll('rect'))
    expect(rects).toHaveLength(2) // outer + inset shadow
    expect(rects[0]?.getAttribute('stroke')).toBe('var(--color-wood)')
    expect(rects[1]?.getAttribute('stroke')).toBe('var(--color-soil-deep)')
  })

  it('planter uses a terracotta-bordered circle with an inner rim', () => {
    const { container } = renderSvg(circle())
    const circles = Array.from(container.querySelectorAll('circle'))
    expect(circles).toHaveLength(2) // outer + rim
    expect(circles[0]?.getAttribute('stroke')).toBe('var(--color-terracotta)')
  })

  it('renders an accessible label combining name, type, and dimensions', () => {
    const { container } = renderSvg(rect({ name: 'North bed' }))
    const group = container.querySelector('g[role="group"]')
    expect(group?.getAttribute('aria-label')).toMatch(
      /North bed.*Raised bed.*2\.4m × 1\.2m/i,
    )
  })

  it('omits the inset shadow on tiny raised beds where it would visually clutter', () => {
    const tiny: Surface = {
      ...rect({ id: 'rb-tiny' }),
      shape: { kind: 'rect', widthCm: 20, heightCm: 20 },
    }
    const { container } = renderSvg(tiny)
    expect(container.querySelectorAll('rect')).toHaveLength(1)
  })

  it('ghost mode renders a dashed outline with no label', () => {
    const { container } = renderSvg(rect({ name: 'Ignored', type: 'planter' }), {
      ghost: true,
    })
    expect(container.querySelector('text')).toBeNull()
    // ghost shapes are dashed.
    const stroked = container.querySelector('[stroke-dasharray]')
    expect(stroked).not.toBeNull()
  })

  it('formats dimensions in imperial when the garden uses imperial units', () => {
    const surface = rect({
      name: 'Sunny patch',
      shape: { kind: 'rect', widthCm: 244, heightCm: 122 }, // 8ft × 4ft
    })
    const { container } = render(
      <svg>
        <SurfaceShape surface={surface} units="imperial" />
      </svg>,
    )
    const textNodes = Array.from(container.querySelectorAll('text')).map(
      (n) => n.textContent,
    )
    expect(textNodes.some((t) => t?.includes('ft'))).toBe(true)
  })
})
