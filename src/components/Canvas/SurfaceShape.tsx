// Per-type SVG visual treatments per STYLE_GUIDE.md § "Surface visual
// language". Each surface is wrapped in a labelled <g role="group"> so the
// screen-reader model from ACCESSIBILITY.md works without extra plumbing.

import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { Surface } from '../../db/types'

type Props = {
  surface: Surface
  // Render the dashed "this would land here" preview instead of a real
  // surface. Used while the add-surface form is open.
  ghost?: boolean
  units: 'metric' | 'imperial'
  // Interactive surfaces are focusable (Tab cycles them) and respond to
  // clicks/Enter to open their detail panel. Non-interactive renders are
  // used for ghost previews and any read-only contexts.
  interactive?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
  onActivate?: (id: string) => void
  // Movement: ArrowKey nudges (1cm / 10cm with shift). Resize: Alt+Arrow.
  // Both clamp to garden bounds inside the parent.
  onMove?: (id: string, dxCm: number, dyCm: number) => void
  onResize?: (id: string, dwCm: number, dhCm: number) => void
}

const M_PER_FT = 0.3048

function formatLength(cm: number, units: 'metric' | 'imperial'): string {
  if (units === 'imperial') {
    const ft = cm / (M_PER_FT * 100)
    return `${ft.toFixed(ft < 10 ? 1 : 0)}ft`
  }
  const m = cm / 100
  return `${m.toFixed(m < 10 ? 1 : 0)}m`
}

function dimensionLabel(
  surface: Surface,
  units: 'metric' | 'imperial',
): string {
  if (surface.shape.kind === 'rect') {
    return `${formatLength(surface.shape.widthCm, units)} × ${formatLength(surface.shape.heightCm, units)}`
  }
  if (surface.shape.kind === 'circle') {
    return `⌀ ${formatLength(surface.shape.diameterCm, units)}`
  }
  return ''
}

const TYPE_LABEL: Record<Surface['type'], string> = {
  'in-ground': 'In-ground plot',
  'raised-bed': 'Raised bed',
  planter: 'Planter',
  trellis: 'Trellis',
}

function ariaLabelFor(
  surface: Surface,
  units: 'metric' | 'imperial',
): string {
  const dims = dimensionLabel(surface, units).replace('⌀ ', 'diameter ')
  const name = surface.name ? `${surface.name}, ` : ''
  const depth =
    surface.depthCm !== undefined ? `, ${surface.depthCm} cm deep` : ''
  return `${name}${TYPE_LABEL[surface.type]}, ${dims}${depth}`
}

export default function SurfaceShape({
  surface,
  ghost = false,
  units,
  interactive = false,
  selected = false,
  onSelect,
  onActivate,
  onMove,
  onResize,
}: Props) {
  const label = ariaLabelFor(surface, units)

  function handleKeyDown(e: KeyboardEvent<SVGGElement>) {
    if (!interactive) return
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      onActivate?.(surface.id)
      return
    }
    const arrow = e.key === 'ArrowLeft'
      ? [-1, 0] as const
      : e.key === 'ArrowRight'
        ? [1, 0] as const
        : e.key === 'ArrowUp'
          ? [0, -1] as const
          : e.key === 'ArrowDown'
            ? [0, 1] as const
            : null
    if (!arrow) return
    e.preventDefault()
    e.stopPropagation()
    const stepCm = e.shiftKey ? 10 : 1
    const [dx, dy] = arrow
    if (e.altKey) {
      onResize?.(surface.id, dx * stepCm, dy * stepCm)
    } else {
      onMove?.(surface.id, dx * stepCm, dy * stepCm)
    }
  }

  function handleFocus() {
    if (!interactive) return
    onSelect?.(surface.id)
  }

  // Pointer drag on the surface body = move. Click without drag = select +
  // open the editor. We track movement in screen pixels (always available)
  // and translate to garden cm only when the SVG geometry APIs are present
  // — keeps the whole flow exercisable in jsdom-based unit tests.
  const dragRef = useRef<{
    pointerId: number
    lastClient: { x: number; y: number }
    lastSvg: { x: number; y: number } | null
    moved: boolean
  } | null>(null)
  const DRAG_THRESHOLD_PX = 4

  function handlePointerDown(e: React.PointerEvent<SVGGElement>) {
    if (!interactive) return
    if (e.button !== 0) return
    e.stopPropagation()
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const svg = e.currentTarget.ownerSVGElement
    const lastSvg = svg ? clientToSvg(svg, e.clientX, e.clientY) : null
    dragRef.current = {
      pointerId: e.pointerId,
      lastClient: { x: e.clientX, y: e.clientY },
      lastSvg,
      moved: false,
    }
    onSelect?.(surface.id)
  }

  function handlePointerMove(e: React.PointerEvent<SVGGElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dxPx = e.clientX - drag.lastClient.x
    const dyPx = e.clientY - drag.lastClient.y
    drag.lastClient = { x: e.clientX, y: e.clientY }
    if (
      !drag.moved &&
      Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX &&
      Math.hypot(e.clientX - drag.lastClient.x, e.clientY - drag.lastClient.y) <
        DRAG_THRESHOLD_PX
    ) {
      return
    }
    drag.moved = true
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const point = clientToSvg(svg, e.clientX, e.clientY)
    if (!point || !drag.lastSvg) {
      drag.lastSvg = point
      return
    }
    const dx = point.x - drag.lastSvg.x
    const dy = point.y - drag.lastSvg.y
    drag.lastSvg = point
    if (dx !== 0 || dy !== 0) onMove?.(surface.id, dx, dy)
  }

  function handlePointerUp(e: React.PointerEvent<SVGGElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (
      typeof e.currentTarget.hasPointerCapture === 'function' &&
      e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const wasClick = !drag.moved
    dragRef.current = null
    if (wasClick) {
      onActivate?.(surface.id)
    }
  }

  const groupProps = interactive
    ? {
        tabIndex: 0,
        'data-selected': selected || undefined,
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        className: 'surface-shape surface-shape--interactive',
      }
    : { className: 'surface-shape' }

  const inner = (() => {
    if (surface.shape.kind === 'rect') {
      if (surface.type === 'in-ground') {
        return (
          <InGroundRect
            surface={surface}
            shape={surface.shape}
            ghost={ghost}
            units={units}
          />
        )
      }
      if (surface.type === 'raised-bed') {
        return (
          <RaisedBedRect
            surface={surface}
            shape={surface.shape}
            ghost={ghost}
            units={units}
          />
        )
      }
      return (
        <PlainRect
          surface={surface}
          shape={surface.shape}
          ghost={ghost}
          units={units}
        />
      )
    }
    if (surface.shape.kind === 'circle') {
      return (
        <PlanterCircle
          surface={surface}
          shape={surface.shape}
          ghost={ghost}
          units={units}
        />
      )
    }
    return null
  })()

  return (
    <g role="group" aria-label={label} {...groupProps}>
      {inner}
      {selected && <SelectionOutline surface={surface} />}
      {selected && interactive && onResize && (
        <ResizeHandles
          surface={surface}
          onResize={(dw, dh) => onResize(surface.id, dw, dh)}
        />
      )}
    </g>
  )
}

// Pointer-drag resize handles. Eight on rect (4 corners + 4 edge midpoints);
// one on the right of a circle for diameter. Keyboard users resize via
// Alt+Arrow on the focused surface, so the handles themselves are
// aria-hidden — they're a pointer-only affordance.
type Handle = {
  cx: number
  cy: number
  cursor: string
  // (dxCm, dyCm) → (dwCm, dhCm). e.g. dragging the right edge right grows
  // width; dragging the top edge down shrinks height.
  apply: (dxCm: number, dyCm: number) => { dwCm: number; dhCm: number }
}

function ResizeHandles({
  surface,
  onResize,
}: {
  surface: Surface
  onResize: (dwCm: number, dhCm: number) => void
}) {
  const handles = handlesFor(surface)
  return (
    <g aria-hidden="true">
      {handles.map((h, i) => (
        <ResizeHandle
          key={i}
          handle={h}
          onResize={onResize}
        />
      ))}
    </g>
  )
}

function handlesFor(surface: Surface): Handle[] {
  if (surface.shape.kind === 'rect') {
    const { position } = surface
    const { widthCm: w, heightCm: h } = surface.shape
    const left = position.x
    const right = position.x + w
    const top = position.y
    const bottom = position.y + h
    const midX = position.x + w / 2
    const midY = position.y + h / 2
    return [
      { cx: left, cy: top, cursor: 'nwse-resize', apply: (dx, dy) => ({ dwCm: -dx, dhCm: -dy }) },
      { cx: midX, cy: top, cursor: 'ns-resize', apply: (_dx, dy) => ({ dwCm: 0, dhCm: -dy }) },
      { cx: right, cy: top, cursor: 'nesw-resize', apply: (dx, dy) => ({ dwCm: dx, dhCm: -dy }) },
      { cx: right, cy: midY, cursor: 'ew-resize', apply: (dx) => ({ dwCm: dx, dhCm: 0 }) },
      { cx: right, cy: bottom, cursor: 'nwse-resize', apply: (dx, dy) => ({ dwCm: dx, dhCm: dy }) },
      { cx: midX, cy: bottom, cursor: 'ns-resize', apply: (_dx, dy) => ({ dwCm: 0, dhCm: dy }) },
      { cx: left, cy: bottom, cursor: 'nesw-resize', apply: (dx, dy) => ({ dwCm: -dx, dhCm: dy }) },
      { cx: left, cy: midY, cursor: 'ew-resize', apply: (dx) => ({ dwCm: -dx, dhCm: 0 }) },
    ]
  }
  if (surface.shape.kind === 'circle') {
    const r = surface.shape.diameterCm / 2
    const cx = surface.position.x + r
    const cy = surface.position.y + r
    return [
      { cx: cx + r, cy, cursor: 'ew-resize', apply: (dx) => ({ dwCm: dx * 2, dhCm: dx * 2 }) },
    ]
  }
  return []
}

function ResizeHandle({
  handle,
  onResize,
}: {
  handle: Handle
  onResize: (dwCm: number, dhCm: number) => void
}) {
  const SIZE = 14
  function onPointerDown(e: React.PointerEvent<SVGRectElement>) {
    if (e.button !== 0) return
    e.stopPropagation()
    const target = e.currentTarget
    const svg = target.ownerSVGElement
    if (!svg || typeof svg.getScreenCTM !== 'function') return
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(e.pointerId)
    }
    const start = clientToSvg(svg, e.clientX, e.clientY)
    if (!start) return
    let last = start
    function move(ev: PointerEvent) {
      const next = clientToSvg(svg!, ev.clientX, ev.clientY)
      if (!next) return
      const dx = next.x - last.x
      const dy = next.y - last.y
      last = next
      const { dwCm, dhCm } = handle.apply(dx, dy)
      if (dwCm !== 0 || dhCm !== 0) onResize(dwCm, dhCm)
    }
    function up() {
      target.removeEventListener('pointermove', move as EventListener)
      target.removeEventListener('pointerup', up as EventListener)
      target.removeEventListener('pointercancel', up as EventListener)
    }
    target.addEventListener('pointermove', move as EventListener)
    target.addEventListener('pointerup', up as EventListener)
    target.addEventListener('pointercancel', up as EventListener)
  }
  return (
    <rect
      x={handle.cx - SIZE / 2}
      y={handle.cy - SIZE / 2}
      width={SIZE}
      height={SIZE}
      fill="var(--color-bg)"
      stroke="var(--color-garden-green)"
      strokeWidth={3}
      style={{ cursor: handle.cursor }}
      onPointerDown={onPointerDown}
    />
  )
}

function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (typeof svg.getScreenCTM !== 'function') return null
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const inv = ctm.inverse()
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const t = pt.matrixTransform(inv)
  return { x: t.x, y: t.y }
}

// Thick primary-green outline overlaid on the selected surface, per
// STYLE_GUIDE.md "Selected surface: thicker outline in primary green".
function SelectionOutline({ surface }: { surface: Surface }) {
  const PAD = 4
  if (surface.shape.kind === 'rect') {
    return (
      <rect
        x={surface.position.x - PAD}
        y={surface.position.y - PAD}
        width={surface.shape.widthCm + PAD * 2}
        height={surface.shape.heightCm + PAD * 2}
        fill="none"
        stroke="var(--color-garden-green)"
        strokeWidth={6}
        pointerEvents="none"
      />
    )
  }
  if (surface.shape.kind === 'circle') {
    const r = surface.shape.diameterCm / 2
    return (
      <circle
        cx={surface.position.x + r}
        cy={surface.position.y + r}
        r={r + PAD}
        fill="none"
        stroke="var(--color-garden-green)"
        strokeWidth={6}
        pointerEvents="none"
      />
    )
  }
  return null
}

type RectProps = {
  surface: Surface
  shape: Extract<Surface['shape'], { kind: 'rect' }>
  ghost: boolean
  units: 'metric' | 'imperial'
}

type CircleProps = {
  surface: Surface
  shape: Extract<Surface['shape'], { kind: 'circle' }>
  ghost: boolean
  units: 'metric' | 'imperial'
}

// In-ground: soft, irregular edge; soil-brown fill; no hard border. We use
// a heavy corner radius + an SVG turbulence filter for the wobbly edge so
// the shape reads as "carved out of the yard" rather than "drawn".
function InGroundRect({ surface, shape, ghost, units }: RectProps) {
  const filterId = `inground-edge-${surface.id}`
  const cornerR = Math.min(shape.widthCm, shape.heightCm) * 0.12
  return (
    <>
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="2"
            seed={hashSeed(surface.id)}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={ghost ? 6 : 14}
          />
        </filter>
      </defs>
      <rect
        x={surface.position.x}
        y={surface.position.y}
        width={shape.widthCm}
        height={shape.heightCm}
        rx={cornerR}
        ry={cornerR}
        fill="var(--color-soil-deep)"
        fillOpacity={ghost ? 0.4 : 0.85}
        stroke={ghost ? 'var(--color-soil-deep)' : 'none'}
        strokeWidth={ghost ? 4 : 0}
        strokeDasharray={ghost ? '12 8' : undefined}
        filter={`url(#${filterId})`}
      />
      <SurfaceLabel
        surface={surface}
        x={surface.position.x + shape.widthCm / 2}
        y={surface.position.y + shape.heightCm / 2}
        units={units}
        ghost={ghost}
      />
    </>
  )
}

// Raised bed: hard rectangle, wood-tone border, soil-mid fill, inset shadow
// to suggest depth.
function RaisedBedRect({ surface, shape, ghost, units }: RectProps) {
  const innerInset = 8
  return (
    <>
      <rect
        x={surface.position.x}
        y={surface.position.y}
        width={shape.widthCm}
        height={shape.heightCm}
        fill="var(--color-soil-mid)"
        fillOpacity={ghost ? 0.4 : 0.95}
        stroke="var(--color-wood)"
        strokeWidth={6}
        strokeDasharray={ghost ? '12 8' : undefined}
      />
      {/* Inset shadow line — a thin inner border that suggests the wall
          of the bed casting a shadow into the soil. */}
      {!ghost && shape.widthCm > innerInset * 3 && shape.heightCm > innerInset * 3 && (
        <rect
          x={surface.position.x + innerInset}
          y={surface.position.y + innerInset}
          width={shape.widthCm - innerInset * 2}
          height={shape.heightCm - innerInset * 2}
          fill="none"
          stroke="var(--color-soil-deep)"
          strokeOpacity="0.35"
          strokeWidth={3}
          pointerEvents="none"
        />
      )}
      <SurfaceLabel
        surface={surface}
        x={surface.position.x + shape.widthCm / 2}
        y={surface.position.y + shape.heightCm / 2}
        units={units}
        ghost={ghost}
      />
    </>
  )
}

// Planter / pot: circle, terracotta border, soil interior, with a small
// container icon top-left to signal "not the ground."
function PlanterCircle({ surface, shape, ghost, units }: CircleProps) {
  const r = shape.diameterCm / 2
  const cx = surface.position.x + r
  const cy = surface.position.y + r
  return (
    <>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--color-soil-mid)"
        fillOpacity={ghost ? 0.4 : 0.95}
        stroke="var(--color-terracotta)"
        strokeWidth={6}
        strokeDasharray={ghost ? '12 8' : undefined}
      />
      {/* Inner ring suggesting the rim of the pot. */}
      {!ghost && r > 12 && (
        <circle
          cx={cx}
          cy={cy}
          r={Math.max(r - 6, 4)}
          fill="none"
          stroke="var(--color-soil-deep)"
          strokeOpacity="0.35"
          strokeWidth={2}
          pointerEvents="none"
        />
      )}
      <SurfaceLabel
        surface={surface}
        x={cx}
        y={cy}
        units={units}
        ghost={ghost}
      />
    </>
  )
}

function PlainRect({ surface, shape, ghost, units }: RectProps) {
  return (
    <>
      <rect
        x={surface.position.x}
        y={surface.position.y}
        width={shape.widthCm}
        height={shape.heightCm}
        fill="var(--color-soil-mid)"
        fillOpacity={ghost ? 0.4 : 0.85}
        stroke="var(--color-soil-deep)"
        strokeWidth={4}
        strokeDasharray={ghost ? '12 8' : undefined}
      />
      <SurfaceLabel
        surface={surface}
        x={surface.position.x + shape.widthCm / 2}
        y={surface.position.y + shape.heightCm / 2}
        units={units}
        ghost={ghost}
      />
    </>
  )
}

// Centred name + dimensions text. Dimensions sit below the name in the
// mono font per STYLE_GUIDE.md "dimensions in the user's chosen units, in
// the mono font."
function SurfaceLabel({
  surface,
  x,
  y,
  units,
  ghost,
}: {
  surface: Surface
  x: number
  y: number
  units: 'metric' | 'imperial'
  ghost: boolean
}) {
  if (ghost) return null
  const dims = dimensionLabel(surface, units)
  const hasName = !!surface.name
  return (
    <g pointerEvents="none" textAnchor="middle">
      {hasName && (
        <text
          x={x}
          y={y - 6}
          fontSize="22"
          fontWeight="600"
          fill="var(--color-bg)"
          stroke="var(--color-text-strong)"
          strokeWidth="0.6"
          paintOrder="stroke"
        >
          {surface.name}
        </text>
      )}
      <text
        x={x}
        y={hasName ? y + 22 : y + 6}
        fontSize="18"
        fontFamily="var(--font-mono)"
        fill="var(--color-bg)"
        stroke="var(--color-text-strong)"
        strokeWidth="0.6"
        paintOrder="stroke"
      >
        {dims}
      </text>
    </g>
  )
}

// Stable per-surface seed for the in-ground turbulence filter so the same
// surface's wobble doesn't churn between renders. SVG `seed` wants an
// integer; this maps the UUID to a small one.
function hashSeed(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) % 1000
}
