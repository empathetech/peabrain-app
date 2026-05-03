import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as RPointerEvent,
  type WheelEvent as RWheelEvent,
} from 'react'
import type { Garden } from '../../db/types'
import './GardenCanvas.css'

type Props = {
  garden: Garden
}

type ViewBox = { x: number; y: number; width: number; height: number }

const PAD_RATIO = 0.1
const MIN_ZOOM = 0.25
const MAX_ZOOM = 8

function makeInitialViewBox(garden: Garden): ViewBox {
  const padX = garden.bounds.widthCm * PAD_RATIO
  const padY = garden.bounds.heightCm * PAD_RATIO
  return {
    x: -padX,
    y: -padY,
    width: garden.bounds.widthCm + padX * 2,
    height: garden.bounds.heightCm + padY * 2,
  }
}

function formatLength(cm: number, units: 'metric' | 'imperial'): string {
  if (units === 'imperial') {
    const ft = cm / 30.48
    return `${ft.toFixed(ft < 10 ? 1 : 0)} ft`
  }
  const m = cm / 100
  return `${m.toFixed(m < 10 ? 1 : 0)} m`
}

export default function GardenCanvas({ garden }: Props) {
  const initial = useMemo(() => makeInitialViewBox(garden), [garden])
  const [viewBox, setViewBox] = useState<ViewBox>(initial)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ x: number; y: number; vbx: number; vby: number } | null>(null)

  // GardenCanvas is keyed on garden.id by its parent, so a different garden
  // mounts a fresh component with the right initial viewBox — no effect needed.
  const reset = useCallback(() => setViewBox(initial), [initial])

  const zoomBy = useCallback(
    (factor: number, originRatio?: { rx: number; ry: number }) => {
      setViewBox((vb) => {
        const newW = Math.min(
          Math.max(vb.width / factor, initial.width / MAX_ZOOM),
          initial.width / MIN_ZOOM,
        )
        const newH = (newW / vb.width) * vb.height
        const rx = originRatio?.rx ?? 0.5
        const ry = originRatio?.ry ?? 0.5
        const cx = vb.x + vb.width * rx
        const cy = vb.y + vb.height * ry
        return {
          x: cx - newW * rx,
          y: cy - newH * ry,
          width: newW,
          height: newH,
        }
      })
    },
    [initial.width],
  )

  const panBy = useCallback((dx: number, dy: number) => {
    setViewBox((vb) => ({ ...vb, x: vb.x + dx, y: vb.y + dy }))
  }, [])

  function handleWheel(e: RWheelEvent<SVGSVGElement>) {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    const ratio = rect
      ? {
          rx: (e.clientX - rect.left) / rect.width,
          ry: (e.clientY - rect.top) / rect.height,
        }
      : undefined
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    zoomBy(factor, ratio)
  }

  function handlePointerDown(e: RPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      vbx: viewBox.x,
      vby: viewBox.y,
    }
  }

  function handlePointerMove(e: RPointerEvent<SVGSVGElement>) {
    const start = dragRef.current
    if (!start) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height
    setViewBox({
      x: start.vbx - (e.clientX - start.x) * scaleX,
      y: start.vby - (e.clientY - start.y) * scaleY,
      width: viewBox.width,
      height: viewBox.height,
    })
  }

  function handlePointerUp(e: RPointerEvent<SVGSVGElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
  }

  function handleKey(e: KeyboardEvent<SVGSVGElement>) {
    const step = viewBox.width * 0.1
    switch (e.key) {
      case 'ArrowLeft':
        panBy(-step, 0); e.preventDefault(); break
      case 'ArrowRight':
        panBy(step, 0); e.preventDefault(); break
      case 'ArrowUp':
        panBy(0, -step); e.preventDefault(); break
      case 'ArrowDown':
        panBy(0, step); e.preventDefault(); break
      case '+':
      case '=':
        zoomBy(1.2); e.preventDefault(); break
      case '-':
      case '_':
        zoomBy(1 / 1.2); e.preventDefault(); break
      case '0':
      case 'Home':
        reset(); e.preventDefault(); break
    }
  }

  // Grid lines every 1m (100cm), thicker every 5m.
  const gridLines: number[] = []
  for (let x = 0; x <= garden.bounds.widthCm; x += 100) gridLines.push(x)

  const widthLabel = formatLength(garden.bounds.widthCm, garden.units)
  const heightLabel = formatLength(garden.bounds.heightCm, garden.units)

  return (
    <div className="garden-canvas">
      <div className="garden-canvas__toolbar">
        <button type="button" onClick={() => zoomBy(1.2)} aria-label="Zoom in">
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.2)}
          aria-label="Zoom out"
        >
          &minus;
        </button>
        <button type="button" onClick={reset}>
          Reset view
        </button>
      </div>
      <svg
        ref={svgRef}
        className="garden-canvas__svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        role="application"
        aria-label={`Bird's-eye view of ${garden.name}, ${widthLabel} by ${heightLabel}. Empty for now. Use arrow keys to pan, plus and minus to zoom, zero to reset.`}
        tabIndex={0}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKey}
      >
        <defs>
          <pattern
            id="grid-1m"
            x="0"
            y="0"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="2"
              opacity="0.45"
            />
          </pattern>
        </defs>

        <rect
          x="0"
          y="0"
          width={garden.bounds.widthCm}
          height={garden.bounds.heightCm}
          fill="var(--color-surface)"
          stroke="var(--color-soil-deep)"
          strokeWidth="6"
        />
        <rect
          x="0"
          y="0"
          width={garden.bounds.widthCm}
          height={garden.bounds.heightCm}
          fill="url(#grid-1m)"
          pointerEvents="none"
        />

        {/* Scale ruler — 1m segment in the lower-left, outside the plot */}
        <g pointerEvents="none">
          <line
            x1={0}
            y1={garden.bounds.heightCm + 60}
            x2={100}
            y2={garden.bounds.heightCm + 60}
            stroke="var(--color-text-strong)"
            strokeWidth="6"
          />
          <text
            x={50}
            y={garden.bounds.heightCm + 90}
            textAnchor="middle"
            fontSize="36"
            fill="var(--color-text-strong)"
            fontFamily="var(--font-mono)"
          >
            1 m
          </text>
        </g>
      </svg>
    </div>
  )
}
