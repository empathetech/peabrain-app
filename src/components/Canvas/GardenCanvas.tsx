import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as RPointerEvent,
  type WheelEvent as RWheelEvent,
} from 'react'
import type { Garden, Surface, SurfaceType } from '../../db/types'
import {
  createSurface,
  deleteSurface,
  listSurfacesByGarden,
  updateSurface,
} from '../../db/surfaces'
import DeleteConfirm from './DeleteConfirm'
import SurfaceForm from './SurfaceForm'
import SurfacePopover from './SurfacePopover'
import SurfaceShape from './SurfaceShape'
import {
  defaultValuesFor,
  type SurfaceFormValues,
} from './surface-form-defaults'
import './GardenCanvas.css'

type PlaceableSurfaceType = Exclude<SurfaceType, 'trellis'>

const PLACEABLE_SURFACES: {
  type: PlaceableSurfaceType
  label: string
  symbol: string
}[] = [
  { type: 'in-ground', label: 'In-ground plot', symbol: '▢' },
  { type: 'raised-bed', label: 'Raised bed', symbol: '▭' },
  { type: 'planter', label: 'Planter', symbol: '◯' },
]

type Props = {
  garden: Garden
}

type ViewBox = { x: number; y: number; width: number; height: number }

// Live preview while the user is drag-drawing a new surface. Lives in
// pointer-event handlers; the persisted surface is created on pointer-up.
type DrawState = {
  type: PlaceableSurfaceType
  start: { x: number; y: number } // garden cm coords
  current: { x: number; y: number } // garden cm coords
  pointerId: number
  moved: boolean
}

const PAD_RATIO = 0.1
const MIN_ZOOM = 0.25
const MAX_ZOOM = 8

function makeInitialViewBox(garden: Garden): ViewBox {
  const padX = garden.bounds.widthCm * PAD_RATIO
  const padY = garden.bounds.lengthCm * PAD_RATIO
  return {
    x: -padX,
    y: -padY,
    width: garden.bounds.widthCm + padX * 2,
    height: garden.bounds.lengthCm + padY * 2,
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), Math.max(lo, hi))
}

function shapeBounds(s: Surface): { w: number; h: number } {
  if (s.shape.kind === 'rect') return { w: s.shape.widthCm, h: s.shape.heightCm }
  if (s.shape.kind === 'circle')
    return { w: s.shape.diameterCm, h: s.shape.diameterCm }
  return { w: 0, h: 0 }
}

// Convert a screen-space client point into the SVG's user coordinate space
// (centimetres, garden-local). Returns null if the SVG isn't laid out yet
// or the host environment (e.g. jsdom) doesn't implement the SVG geometry
// APIs we need.
function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (typeof svg.getScreenCTM !== 'function') return null
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const inverse = ctm.inverse()
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const transformed = pt.matrixTransform(inverse)
  return { x: transformed.x, y: transformed.y }
}

// Returns the top-left position that centres `shape` on `point`, clamped
// to the garden bounds so the surface lands fully inside the plot.
function clampedTopLeftFor(
  point: { x: number; y: number },
  initial: SurfaceFormValues,
  bounds: { widthCm: number; lengthCm: number },
): { x: number; y: number } {
  let w: number
  let h: number
  if (initial.shape.kind === 'rect') {
    w = initial.shape.widthCm
    h = initial.shape.heightCm
  } else if (initial.shape.kind === 'circle') {
    w = initial.shape.diameterCm
    h = initial.shape.diameterCm
  } else {
    w = 0
    h = 0
  }
  const x = Math.min(Math.max(point.x - w / 2, 0), Math.max(bounds.widthCm - w, 0))
  const y = Math.min(
    Math.max(point.y - h / 2, 0),
    Math.max(bounds.lengthCm - h, 0),
  )
  return { x, y }
}

const MIN_DRAW_CM = 5

// Top-left of the swept bbox, clamped to garden bounds. For rect surfaces
// this is the corner where (start.x|y) and (current.x|y) are both minima;
// for circles it's the top-left of the bounding square so the circle can
// be drawn radius-from-start by extending outward in one direction.
function clampedDrawPosition(
  d: DrawState,
  bounds: { widthCm: number; lengthCm: number },
): { x: number; y: number } {
  if (d.type === 'planter') {
    // Circle: start is the centre; clamp the bounding square to bounds.
    const r = Math.max(
      Math.hypot(d.current.x - d.start.x, d.current.y - d.start.y),
      MIN_DRAW_CM / 2,
    )
    const x = Math.min(Math.max(d.start.x - r, 0), Math.max(bounds.widthCm - r * 2, 0))
    const y = Math.min(Math.max(d.start.y - r, 0), Math.max(bounds.lengthCm - r * 2, 0))
    return { x, y }
  }
  // Rect: top-left of swept bbox, clamped to bounds.
  const x = Math.max(0, Math.min(d.start.x, d.current.x))
  const y = Math.max(0, Math.min(d.start.y, d.current.y))
  return { x: Math.min(x, bounds.widthCm), y: Math.min(y, bounds.lengthCm) }
}

function clampedDrawShape(
  d: DrawState,
  topLeft: { x: number; y: number },
  bounds: { widthCm: number; lengthCm: number },
):
  | { kind: 'rect'; widthCm: number; heightCm: number }
  | { kind: 'circle'; diameterCm: number } {
  if (d.type === 'planter') {
    const r = Math.max(
      Math.hypot(d.current.x - d.start.x, d.current.y - d.start.y),
      MIN_DRAW_CM / 2,
    )
    const maxD = Math.min(
      bounds.widthCm - topLeft.x,
      bounds.lengthCm - topLeft.y,
    )
    return { kind: 'circle', diameterCm: Math.max(MIN_DRAW_CM, Math.min(r * 2, maxD)) }
  }
  const w = Math.max(MIN_DRAW_CM, Math.abs(d.current.x - d.start.x))
  const h = Math.max(MIN_DRAW_CM, Math.abs(d.current.y - d.start.y))
  return {
    kind: 'rect',
    widthCm: Math.min(w, bounds.widthCm - topLeft.x),
    heightCm: Math.min(h, bounds.lengthCm - topLeft.y),
  }
}

export default function GardenCanvas({ garden }: Props) {
  const initial = useMemo(() => makeInitialViewBox(garden), [garden])
  const [viewBox, setViewBox] = useState<ViewBox>(initial)
  const [placementMode, setPlacementMode] =
    useState<PlaceableSurfaceType | null>(null)
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [drawing, setDrawing] = useState<DrawState | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [spacePan, setSpacePan] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ x: number; y: number; vbx: number; vby: number; moved: boolean } | null>(null)

  // Load existing surfaces on mount / garden change.
  useEffect(() => {
    let cancelled = false
    listSurfacesByGarden(garden.id).then((rows) => {
      if (!cancelled) setSurfaces(rows)
    })
    return () => {
      cancelled = true
    }
  }, [garden.id])

  // GardenCanvas is keyed on garden.id by its parent, so a different garden
  // mounts a fresh component with the right initial viewBox — no effect needed.
  const reset = useCallback(() => setViewBox(initial), [initial])

  const togglePlacement = useCallback((type: PlaceableSurfaceType) => {
    setPlacementMode((current) => (current === type ? null : type))
  }, [])

  // Escape cancels placement / drawing / edit / delete-confirm no matter
  // where focus is. Only attached while one of those is active so we don't
  // swallow Escape elsewhere.
  useEffect(() => {
    if (!placementMode && !drawing && !selectedId && !pendingDeleteId) return
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Escape') return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        // Let inputs handle their own Escape (clearing values, blurring).
        return
      }
      setPlacementMode(null)
      setDrawing(null)
      setSelectedId(null)
      setPendingDeleteId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [placementMode, drawing, selectedId, pendingDeleteId])

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
    // Cmd/Ctrl+wheel zooms toward the cursor. Chrome synthesizes pinch
    // gestures as wheel+ctrlKey, so this branch handles both. Plain wheel
    // (and natural two-finger trackpad scroll) pans the canvas — matches
    // Figma / Miro expectations and stops the canvas from kidnapping
    // every page scroll the cursor happens to pass over.
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (e.ctrlKey || e.metaKey) {
      const ratio = rect
        ? {
            rx: (e.clientX - rect.left) / rect.width,
            ry: (e.clientY - rect.top) / rect.height,
          }
        : undefined
      // Smaller per-tick factor for smoother pinch zoom.
      const factor = Math.exp(-e.deltaY * 0.01)
      zoomBy(factor, ratio)
      return
    }
    if (!rect) return
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height
    panBy(e.deltaX * scaleX, e.deltaY * scaleY)
  }

  function handlePointerDown(e: RPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    // Spacebar pan trumps placement / draw / surface drag — same as
    // Photoshop / Figma. Lets the user reposition mid-task without
    // exiting their current tool.
    if (spacePan) {
      if (typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        vbx: viewBox.x,
        vby: viewBox.y,
        moved: false,
      }
      return
    }
    if (placementMode) {
      // Drag-to-draw a new surface. The actual size is the bbox swept out
      // by the pointer between down and up; a click without drag falls back
      // to the type's default size at pointer-up.
      const svg = svgRef.current
      if (!svg) return
      const point = clientToSvgPoint(svg, e.clientX, e.clientY)
      if (!point) return
      if (typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      setDrawing({
        type: placementMode,
        start: point,
        current: point,
        pointerId: e.pointerId,
        moved: false,
      })
      return
    }
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      vbx: viewBox.x,
      vby: viewBox.y,
      moved: false,
    }
  }

  function handlePointerMove(e: RPointerEvent<SVGSVGElement>) {
    if (drawing && drawing.pointerId === e.pointerId) {
      const svg = svgRef.current
      if (!svg) return
      const point = clientToSvgPoint(svg, e.clientX, e.clientY)
      if (!point) return
      setDrawing((d) =>
        d
          ? {
              ...d,
              current: point,
              moved:
                d.moved ||
                Math.abs(point.x - d.start.x) > 2 ||
                Math.abs(point.y - d.start.y) > 2,
            }
          : d,
      )
      return
    }
    const start = dragRef.current
    if (!start) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    if (
      Math.abs(e.clientX - start.x) > 2 ||
      Math.abs(e.clientY - start.y) > 2
    ) {
      start.moved = true
    }
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height
    setViewBox({
      x: start.vbx - (e.clientX - start.x) * scaleX,
      y: start.vby - (e.clientY - start.y) * scaleY,
      width: viewBox.width,
      height: viewBox.height,
    })
  }

  async function handlePointerUp(e: RPointerEvent<SVGSVGElement>) {
    if (
      typeof e.currentTarget.hasPointerCapture === 'function' &&
      e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (drawing && drawing.pointerId === e.pointerId) {
      await commitDrawing(drawing)
      setDrawing(null)
      return
    }
    // Click on the empty canvas (pointer-down + pointer-up with no
    // significant movement, no placement mode) deselects whatever surface
    // was selected and closes the popover. Surface clicks are caught by
    // the surface itself and never reach this handler thanks to
    // stopPropagation in SurfaceShape's pointer handlers.
    const start = dragRef.current
    dragRef.current = null
    if (!start) return
    if (!start.moved && !placementMode && !spacePan && selectedId) {
      setSelectedId(null)
    }
  }

  // Persist the drawn surface and select it. Stays in placement mode so
  // the next drag/click drops another surface of the same type.
  async function commitDrawing(d: DrawState) {
    // Click without drag while a surface is selected = deselect, don't
    // create a new surface. The user has to click empty canvas a second
    // time to actually drop. Drag-to-draw still creates immediately.
    if (!d.moved && selectedId) {
      setSelectedId(null)
      return
    }
    const defaults = defaultValuesFor(d.type)
    const position = d.moved
      ? clampedDrawPosition(d, garden.bounds)
      : clampedTopLeftFor(d.start, defaults, garden.bounds)
    const shape = d.moved
      ? clampedDrawShape(d, position, garden.bounds)
      : defaults.shape
    const created = await createSurface({
      gardenId: garden.id,
      type: d.type,
      position,
      shape,
      depthCm: defaults.depthCm,
      buildOrBuy: defaults.buildOrBuy,
    })
    setSurfaces((prev) => [...prev, created])
    // Intentionally don't select — selecting opens the edit popover, which
    // would block the next drop spot. The user clicks the surface later if
    // they want to edit. Enables fast multi-drop placement.
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
      case 'Enter':
        if (placementMode) {
          // Drop a default-sized surface at the centre of the current view.
          const centre = {
            x: viewBox.x + viewBox.width / 2,
            y: viewBox.y + viewBox.height / 2,
          }
          const defaults = defaultValuesFor(placementMode)
          void (async () => {
            const created = await createSurface({
              gardenId: garden.id,
              type: placementMode,
              position: clampedTopLeftFor(centre, defaults, garden.bounds),
              shape: defaults.shape,
              depthCm: defaults.depthCm,
              buildOrBuy: defaults.buildOrBuy,
            })
            setSurfaces((prev) => [...prev, created])
            // No auto-select on drop — keeps fast multi-drop placement
            // unobstructed by the edit popover.
          })()
          e.preventDefault()
        }
        break
    }
  }

  async function handleEditSubmit(values: SurfaceFormValues) {
    if (!selectedId) return
    const updated = await updateSurface(selectedId, {
      name: values.name || undefined,
      shape: values.shape,
      depthCm: values.depthCm,
      buildOrBuy: values.buildOrBuy,
    })
    setSurfaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    // Keep the selection — popover stays anchored on the just-saved surface.
  }

  function handleEditCancel() {
    setSelectedId(null)
  }

  // Spacebar held = temporary pan tool (Photoshop/Figma convention). Pointer
  // drag anywhere on the canvas pans while held; release returns to the
  // previous tool. Don't fire while typing into a form field.
  useEffect(() => {
    function isInField(t: EventTarget | null): boolean {
      const el = t as HTMLElement | null
      if (!el) return false
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable ||
        // Buttons activate on Space — leave them alone or the user can't
        // press toolbar buttons with the keyboard.
        el.tagName === 'BUTTON'
      )
    }
    function down(e: globalThis.KeyboardEvent) {
      if (e.code !== 'Space') return
      if (isInField(e.target)) return
      e.preventDefault()
      setSpacePan(true)
    }
    function up(e: globalThis.KeyboardEvent) {
      if (e.code !== 'Space') return
      setSpacePan(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // Delete / Backspace on a selected surface starts the confirm flow.
  // Doesn't fire while typing into form fields, so editing a name with
  // Backspace stays safe.
  useEffect(() => {
    if (!selectedId || pendingDeleteId) return
    function isInField(t: EventTarget | null): boolean {
      const el = t as HTMLElement | null
      if (!el) return false
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable
      )
    }
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (isInField(e.target)) return
      e.preventDefault()
      setPendingDeleteId(selectedId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, pendingDeleteId])

  async function confirmDelete() {
    const id = pendingDeleteId
    if (!id) return
    await deleteSurface(id)
    setSurfaces((prev) => prev.filter((s) => s.id !== id))
    if (selectedId === id) setSelectedId(null)
    setPendingDeleteId(null)
  }

  function cancelDelete() {
    setPendingDeleteId(null)
  }

  // Cmd+0 fits to view. Matches Figma / most design tools.
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        const target = e.target as HTMLElement | null
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return
        }
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [reset])

  // Cmd/Ctrl+D duplicates the selected surface, offset 20cm so it doesn't
  // sit exactly under the original. The duplicate becomes the new selection
  // so chained Cmd+D drops a row of beds.
  useEffect(() => {
    if (!selectedId) return
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        const target = e.target as HTMLElement | null
        // Don't hijack Cmd+D inside form fields the user might be typing in.
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return
        }
        const original = surfaces.find((s) => s.id === selectedId)
        if (!original) return
        e.preventDefault()
        const dims = shapeBounds(original)
        const offset = 20
        const x = clamp(
          original.position.x + offset,
          0,
          Math.max(garden.bounds.widthCm - dims.w, 0),
        )
        const y = clamp(
          original.position.y + offset,
          0,
          Math.max(garden.bounds.lengthCm - dims.h, 0),
        )
        void (async () => {
          const created = await createSurface({
            gardenId: garden.id,
            type: original.type,
            position: { x, y },
            shape: original.shape,
            name: original.name ? `${original.name} copy` : undefined,
            depthCm: original.depthCm,
            buildOrBuy: original.buildOrBuy,
          })
          setSurfaces((prev) => [...prev, created])
          setSelectedId(created.id)
        })()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, surfaces, garden.id, garden.bounds])

  // Move/resize: optimistically patch local state, persist asynchronously.
  // Both clamp so the surface stays inside the garden bounds. Resize keeps
  // dimensions positive (>= 5cm minimum) so the user can't shrink to nothing.
  const MIN_DIM_CM = 5

  function applyMove(id: string, dxCm: number, dyCm: number) {
    setSurfaces((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const dims = shapeBounds(s)
        const x = clamp(s.position.x + dxCm, 0, garden.bounds.widthCm - dims.w)
        const y = clamp(s.position.y + dyCm, 0, garden.bounds.lengthCm - dims.h)
        const next = { ...s, position: { x, y } }
        void updateSurface(id, { position: next.position })
        return next
      }),
    )
  }

  function applyResize(id: string, dwCm: number, dhCm: number) {
    setSurfaces((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        if (s.shape.kind === 'rect') {
          const maxW = garden.bounds.widthCm - s.position.x
          const maxH = garden.bounds.lengthCm - s.position.y
          const widthCm = clamp(s.shape.widthCm + dwCm, MIN_DIM_CM, maxW)
          const heightCm = clamp(s.shape.heightCm + dhCm, MIN_DIM_CM, maxH)
          const nextShape = { ...s.shape, widthCm, heightCm }
          const next = { ...s, shape: nextShape }
          void updateSurface(id, { shape: nextShape })
          return next
        }
        if (s.shape.kind === 'circle') {
          // Circles use dwCm as the diameter delta.
          const maxD = Math.min(
            (garden.bounds.widthCm - s.position.x),
            (garden.bounds.lengthCm - s.position.y),
          )
          const diameterCm = clamp(
            s.shape.diameterCm + dwCm,
            MIN_DIM_CM,
            Math.max(maxD, MIN_DIM_CM),
          )
          const nextShape = { ...s.shape, diameterCm }
          const next = { ...s, shape: nextShape }
          void updateSurface(id, { shape: nextShape })
          return next
        }
        return s
      }),
    )
  }

  const widthLabel = formatLength(garden.bounds.widthCm, garden.units)
  const lengthLabel = formatLength(garden.bounds.lengthCm, garden.units)

  // Scale ruler segment — show 1 m for metric users, 3 ft (~91 cm) for
  // imperial. Picking 3 ft instead of 1 ft gives a comparable-sized bar.
  const rulerCm = garden.units === 'imperial' ? 91.44 : 100
  const rulerLabel = garden.units === 'imperial' ? '3 ft' : '1 m'

  const placementLabel = placementMode
    ? PLACEABLE_SURFACES.find((s) => s.type === placementMode)?.label
    : null

  const surfaceCountLabel = surfaces.length === 0
    ? 'Empty for now.'
    : `${surfaces.length} surface${surfaces.length === 1 ? '' : 's'} placed.`

  return (
    <div className="garden-canvas">
      <div
        className="garden-canvas__toolbar"
        role="toolbar"
        aria-label="Garden canvas tools"
      >
        <div
          className="garden-canvas__tool-group"
          role="group"
          aria-label="Add a surface"
        >
          {PLACEABLE_SURFACES.map((surface) => {
            const active = placementMode === surface.type
            return (
              <button
                key={surface.type}
                type="button"
                className="garden-canvas__tool"
                aria-pressed={active}
                onClick={() => togglePlacement(surface.type)}
              >
                <span aria-hidden="true" className="garden-canvas__tool-icon">
                  {surface.symbol}
                </span>
                <span>{surface.label}</span>
              </button>
            )
          })}
        </div>
        <div className="garden-canvas__tool-group" role="group" aria-label="View">
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
          <button
            type="button"
            onClick={reset}
            aria-label={`Zoom level ${Math.round((initial.width / viewBox.width) * 100)} percent — click to fit`}
            className="garden-canvas__zoom-readout"
          >
            {Math.round((initial.width / viewBox.width) * 100)}%
          </button>
        </div>
      </div>
      <div
        className="garden-canvas__status"
        role="status"
        aria-live="polite"
      >
        {spacePan
          ? 'Pan tool — drag to move the canvas. Release Space to return.'
          : placementLabel
            ? `Placing ${placementLabel.toLowerCase()} — drag to draw, click for default. Esc to exit.`
            : ''}
      </div>
      <svg
        ref={svgRef}
        className={
          'garden-canvas__svg' +
          (spacePan ? ' garden-canvas__svg--panning' : '') +
          (placementMode ? ' garden-canvas__svg--placing' : '')
        }
        data-placement-mode={placementMode ?? undefined}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        role="application"
        aria-label={`Bird's-eye view of ${garden.name}, ${widthLabel} by ${lengthLabel}. ${surfaceCountLabel} Two-finger scroll to pan; hold Cmd or pinch to zoom; hold Space to drag the canvas; Cmd+0 to fit to view.`}
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
          height={garden.bounds.lengthCm}
          fill="var(--color-surface)"
          stroke="var(--color-soil-deep)"
          strokeWidth="6"
        />
        <rect
          x="0"
          y="0"
          width={garden.bounds.widthCm}
          height={garden.bounds.lengthCm}
          fill="url(#grid-1m)"
          pointerEvents="none"
        />

        {surfaces.map((s) => (
          <SurfaceShape
            key={s.id}
            surface={s}
            units={garden.units}
            // Surfaces are always interactive — clicking an existing
            // surface in placement mode selects it instead of dropping
            // a new one underneath.
            interactive
            selected={selectedId === s.id}
            onSelect={setSelectedId}
            onActivate={setSelectedId}
            onMove={applyMove}
            onResize={applyResize}
          />
        ))}

        {drawing && drawing.moved && (() => {
          const position = clampedDrawPosition(drawing, garden.bounds)
          const shape = clampedDrawShape(drawing, position, garden.bounds)
          return (
            <SurfaceShape
              surface={{
                id: '__drawing__',
                gardenId: garden.id,
                type: drawing.type,
                position,
                shape,
              }}
              ghost
              units={garden.units}
            />
          )
        })()}

        {/* Scale ruler — segment + label in the lower-left, outside the plot.
            Length matches the user's preferred units. */}
        <g pointerEvents="none">
          <line
            x1={0}
            y1={garden.bounds.lengthCm + 60}
            x2={rulerCm}
            y2={garden.bounds.lengthCm + 60}
            stroke="var(--color-text-strong)"
            strokeWidth="6"
          />
          <text
            x={rulerCm / 2}
            y={garden.bounds.lengthCm + 90}
            textAnchor="middle"
            fontSize="36"
            fill="var(--color-text-strong)"
            fontFamily="var(--font-mono)"
          >
            {rulerLabel}
          </text>
        </g>
      </svg>

      {surfaces.length === 0 && !drawing && (
        <p className="garden-canvas__empty">
          Drop in a raised bed, planter, or in-ground plot to get started.
          Drag to draw the size you want, or click for a default.
        </p>
      )}

      {selectedId && (() => {
        const editing = surfaces.find((s) => s.id === selectedId)
        if (!editing) return null
        const initialValues: SurfaceFormValues = {
          name: editing.name ?? '',
          shape: editing.shape,
          depthCm: editing.depthCm,
          buildOrBuy: editing.buildOrBuy ?? 'existing',
        }
        const dims = shapeBounds(editing)
        const anchor = {
          x: editing.position.x,
          y: editing.position.y,
          width: dims.w,
          height: dims.h,
        }
        const isConfirmingDelete = pendingDeleteId === editing.id
        const deleteLabel =
          editing.name?.trim() || `this ${editing.type.replace('-', ' ')}`
        return (
          <SurfacePopover
            anchor={anchor}
            svgRef={svgRef}
            positionToken={`${viewBox.x}|${viewBox.y}|${viewBox.width}|${viewBox.height}|${editing.position.x}|${editing.position.y}|${anchor.width}|${anchor.height}|${isConfirmingDelete}`}
          >
            {isConfirmingDelete ? (
              <DeleteConfirm
                label={deleteLabel}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
              />
            ) : (
              <SurfaceForm
                key={`${editing.id}|${editing.shape.kind === 'rect' ? `${editing.shape.widthCm}x${editing.shape.heightCm}` : editing.shape.kind === 'circle' ? `d${editing.shape.diameterCm}` : 'p'}|${editing.depthCm ?? ''}`}
                type={editing.type}
                units={garden.units}
                initial={initialValues}
                heading="Edit surface"
                submitLabel="Save"
                onSubmit={handleEditSubmit}
                onCancel={handleEditCancel}
                onDelete={() => setPendingDeleteId(editing.id)}
              />
            )}
          </SurfacePopover>
        )
      })()}
    </div>
  )
}

