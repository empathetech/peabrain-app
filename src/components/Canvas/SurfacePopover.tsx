// Floating edit panel anchored to the selected surface. Lives in screen
// space (CSS positioning), not SVG space, so it stays a normal-sized form
// at any zoom level. Repositions whenever the underlying surface moves on
// screen — pan, zoom, resize, the surface's own move/resize.

import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import './SurfacePopover.css'

type Props = {
  // Anchor: the SVG-space rect of the surface the popover should follow.
  // Centimetres, garden-local — same coords the surface itself uses.
  anchor: { x: number; y: number; width: number; height: number }
  // The SVG element the anchor coords belong to. We use its CTM to map
  // SVG → screen px on every reposition. Passed as a ref so consumers
  // don't have to access `.current` during render.
  svgRef: RefObject<SVGSVGElement | null>
  // A trigger value the caller can bump to force a reposition (e.g. when
  // the viewBox changes or the surface itself is resized).
  positionToken?: unknown
  children: ReactNode
}

const GAP_PX = 12

export default function SurfacePopover({
  anchor,
  svgRef,
  positionToken,
  children,
}: Props) {
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{
    top: number
    left: number
    placement: 'above' | 'below'
  } | null>(null)

  useLayoutEffect(() => {
    function reposition() {
      const svg = svgRef.current
      if (!svg || !popoverRef.current) return
      if (typeof svg.getScreenCTM !== 'function') return
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      // Anchor's screen-space corners.
      const tl = svgToScreen(svg as SVGSVGElement, ctm, anchor.x, anchor.y)
      const br = svgToScreen(
        svg as SVGSVGElement,
        ctm,
        anchor.x + anchor.width,
        anchor.y + anchor.height,
      )
      const screenLeft = Math.min(tl.x, br.x)
      const screenRight = Math.max(tl.x, br.x)
      const screenTop = Math.min(tl.y, br.y)
      const screenBottom = Math.max(tl.y, br.y)
      const screenCentreX = (screenLeft + screenRight) / 2

      const popRect = popoverRef.current.getBoundingClientRect()
      const placement: 'above' | 'below' =
        screenTop - GAP_PX - popRect.height >= 8 ? 'above' : 'below'
      const top =
        placement === 'above'
          ? screenTop - GAP_PX - popRect.height
          : screenBottom + GAP_PX
      // Horizontally centre, clamp into the viewport.
      const rawLeft = screenCentreX - popRect.width / 2
      const left = Math.min(
        Math.max(rawLeft, 8),
        Math.max(window.innerWidth - popRect.width - 8, 8),
      )
      setPosition({ top, left, placement })
    }
    reposition()
    // Re-run on scroll/resize so the popover follows the canvas.
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [anchor, svgRef, positionToken])

  return (
    <div
      ref={popoverRef}
      className={
        'surface-popover' +
        (position ? ` surface-popover--placed surface-popover--${position.placement}` : '')
      }
      style={
        position
          ? { top: `${position.top}px`, left: `${position.left}px` }
          : undefined
      }
    >
      {children}
    </div>
  )
}

function svgToScreen(
  svg: SVGSVGElement,
  ctm: DOMMatrix,
  x: number,
  y: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = x
  pt.y = y
  const t = pt.matrixTransform(ctm)
  return { x: t.x, y: t.y }
}

