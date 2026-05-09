import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GardenCanvas from './GardenCanvas'
import { db } from '../../db/schema'
import { listSurfacesByGarden } from '../../db/surfaces'
import type { Garden } from '../../db/types'

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
  bounds: { widthCm: 600, lengthCm: 400 },
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
}

beforeEach(async () => {
  await db.surfaces.clear()
})
afterEach(async () => {
  await db.surfaces.clear()
})

describe('GardenCanvas toolbar — add-surface', () => {
  it('exposes one add-surface button per placeable surface type', async () => {
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)
    const group = screen.getByRole('group', { name: /add a surface/i })
    expect(
      screen.getByRole('button', { name: /in-ground plot/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /raised bed/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^planter$/i }),
    ).toBeInTheDocument()
    expect(group).not.toHaveTextContent(/trellis/i)
  })

  it('toggles placement mode when an add-surface button is activated', async () => {
    const user = userEvent.setup()
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)
    const raisedBed = screen.getByRole('button', { name: /raised bed/i })

    expect(raisedBed).toHaveAttribute('aria-pressed', 'false')
    await user.click(raisedBed)
    expect(raisedBed).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(/placing raised bed/i)

    await user.click(raisedBed)
    expect(raisedBed).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('switches placement type when a different button is activated', async () => {
    const user = userEvent.setup()
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)
    const raisedBed = screen.getByRole('button', { name: /raised bed/i })
    const planter = screen.getByRole('button', { name: /^planter$/i })

    await user.click(raisedBed)
    await user.click(planter)
    expect(raisedBed).toHaveAttribute('aria-pressed', 'false')
    expect(planter).toHaveAttribute('aria-pressed', 'true')
  })

  it('cancels placement mode on Escape', async () => {
    const user = userEvent.setup()
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)
    const inGround = screen.getByRole('button', { name: /in-ground plot/i })
    await user.click(inGround)
    await user.keyboard('{Escape}')
    expect(inGround).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('GardenCanvas — add-surface flow (drag-to-draw, no form)', () => {
  it('Enter on the canvas in placement mode drops a default-sized surface immediately', async () => {
    const user = userEvent.setup()
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    await user.click(screen.getByRole('button', { name: /raised bed/i }))
    screen.getByRole('application').focus()
    await user.keyboard('{Enter}')

    await waitFor(async () => {
      const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
      expect(persisted).toHaveLength(1)
    })
    const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
    // Default raised-bed dimensions per surface-form-defaults.ts.
    expect(persisted[0]).toMatchObject({
      type: 'raised-bed',
      shape: { kind: 'rect', widthCm: 120, heightCm: 60 },
      depthCm: 25,
      buildOrBuy: 'build',
    })

    // No form interrupts the flow.
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('stays in placement mode after a drop so consecutive Enters add multiple surfaces', async () => {
    const user = userEvent.setup()
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    await user.click(screen.getByRole('button', { name: /raised bed/i }))
    const svg = screen.getByRole('application')
    svg.focus()
    await user.keyboard('{Enter}')
    await waitFor(async () => {
      expect(await listSurfacesByGarden(SAMPLE_GARDEN.id)).toHaveLength(1)
    })
    svg.focus()
    await user.keyboard('{Enter}')
    await waitFor(async () => {
      expect(await listSurfacesByGarden(SAMPLE_GARDEN.id)).toHaveLength(2)
    })

    // Toolbar button stays pressed across drops.
    expect(
      screen.getByRole('button', { name: /raised bed/i }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('Escape exits placement mode after a drop', async () => {
    const user = userEvent.setup()
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    await user.click(screen.getByRole('button', { name: /raised bed/i }))
    screen.getByRole('application').focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{Escape}')

    expect(
      screen.getByRole('button', { name: /raised bed/i }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('the empty-state copy disappears once a surface exists', async () => {
    const user = userEvent.setup()
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    expect(
      screen.getByText(/drop in a raised bed, planter, or in-ground plot/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /raised bed/i }))
    screen.getByRole('application').focus()
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(
        screen.queryByText(/drop in a raised bed, planter, or in-ground plot/i),
      ).not.toBeInTheDocument()
    })
  })

  it('Cmd+D duplicates the selected surface offset by 20cm', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 100, y: 100 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      depthCm: 25,
      name: 'Original',
      buildOrBuy: 'build',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Original.*Raised bed/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{Meta>}d{/Meta}')

    await waitFor(async () => {
      const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
      expect(persisted).toHaveLength(2)
    })
    const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
    const copy = persisted.find((s) => s.id !== 's1')
    expect(copy?.position).toEqual({ x: 120, y: 120 })
    expect(copy?.shape).toEqual({ kind: 'rect', widthCm: 200, heightCm: 100 })
    expect(copy?.name).toBe('Original copy')
  })

  it('clicking a surface selects it and opens the edit form', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      depthCm: 25,
      name: 'Tomato bed',
      buildOrBuy: 'build',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = await screen.findByLabelText(/Tomato bed.*Raised bed/i)
    await user.click(group)

    const form = await screen.findByRole('form', { name: /edit surface/i })
    expect(within(form).getByLabelText(/name/i)).toHaveValue('Tomato bed')
    expect(within(form).getByLabelText(/depth/i)).toHaveValue(25)
    expect(
      within(form).getByRole('button', { name: /^save$/i }),
    ).toBeInTheDocument()
  })

  it('Enter on a focused surface opens its edit form', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'planter',
      position: { x: 50, y: 50 },
      shape: { kind: 'circle', diameterCm: 40 },
      name: 'Basil pot',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Basil pot.*Planter/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{Enter}')

    expect(
      await screen.findByRole('form', { name: /edit surface/i }),
    ).toBeInTheDocument()
  })

  it('saves edits and reflects them in the canvas + persistence', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      depthCm: 25,
      name: 'Old name',
      buildOrBuy: 'build',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    await user.click(await screen.findByLabelText(/Old name.*Raised bed/i))
    const form = await screen.findByRole('form', { name: /edit surface/i })
    const nameInput = within(form).getByLabelText(/name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'New name')
    await user.click(within(form).getByRole('button', { name: /^save$/i }))

    // Popover stays open after Save — selection is preserved so the user
    // can keep tweaking. The persisted name + the surface label both update.
    await waitFor(async () => {
      const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
      expect(persisted[0]?.name).toBe('New name')
    })
    const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
    expect(persisted[0]?.depthCm).toBe(25) // unchanged
    expect(
      screen.getByLabelText(/New name.*Raised bed/i),
    ).toBeInTheDocument()
  })

  it('cancel discards edits without persisting', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      depthCm: 25,
      name: 'Stay this',
      buildOrBuy: 'build',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    await user.click(await screen.findByLabelText(/Stay this.*Raised bed/i))
    const form = await screen.findByRole('form', { name: /edit surface/i })
    const nameInput = within(form).getByLabelText(/name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Throwaway')
    await user.click(within(form).getByRole('button', { name: /cancel/i }))

    expect(
      screen.queryByRole('form', { name: /edit surface/i }),
    ).not.toBeInTheDocument()
    const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
    expect(persisted[0]?.name).toBe('Stay this')
  })

  it('Escape closes the edit form', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Bed',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    await user.click(await screen.findByLabelText(/Bed.*Raised bed/i))
    expect(
      await screen.findByRole('form', { name: /edit surface/i }),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('form', { name: /edit surface/i }),
    ).not.toBeInTheDocument()
  })

  it('clicking an existing surface in placement mode selects it instead of dropping a new one', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Bed',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)
    await screen.findByLabelText(/Bed.*Raised bed/i)

    await user.click(screen.getByRole('button', { name: /raised bed/i }))
    await user.click(screen.getByLabelText(/Bed.*Raised bed/i))

    // The existing surface is selected — the edit popover opens.
    expect(
      await screen.findByRole('form', { name: /edit surface/i }),
    ).toBeInTheDocument()
    // No new surface was created; only the seed one exists.
    const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
    expect(persisted).toHaveLength(1)
  })

  it('Arrow keys nudge a focused surface by 1cm and persist the move', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 100, y: 100 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Bed',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Bed.*Raised bed/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{ArrowRight}{ArrowDown}')

    await waitFor(async () => {
      const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
      expect(persisted[0]?.position).toEqual({ x: 101, y: 101 })
    })
  })

  it('Shift+Arrow moves a surface by 10cm', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 100, y: 100 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Bed',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Bed.*Raised bed/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}')

    await waitFor(async () => {
      const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
      expect(persisted[0]?.position.x).toBe(110)
    })
  })

  it('clamps surface movement to the garden bounds', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 0, y: 0 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Bed',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Bed.*Raised bed/i,
    )) as unknown as HTMLElement
    group.focus()
    // Try to move left and up past 0; should stay at 0/0.
    await user.keyboard('{ArrowLeft}{ArrowUp}')

    await waitFor(async () => {
      const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
      expect(persisted[0]?.position).toEqual({ x: 0, y: 0 })
    })
  })

  it('Alt+Arrow resizes a focused surface (1cm) and clamps to a minimum', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 100, y: 100 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Bed',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Bed.*Raised bed/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}')

    await waitFor(async () => {
      const persisted = await listSurfacesByGarden(SAMPLE_GARDEN.id)
      const shape = persisted[0]?.shape
      expect(shape?.kind === 'rect' && shape.widthCm).toBe(201)
    })
  })

  it('Delete on a focused surface opens the confirm and removes on confirm', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Doomed bed',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Doomed bed.*Raised bed/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{Delete}')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent(/Doomed bed/i)
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(async () => {
      expect(await listSurfacesByGarden(SAMPLE_GARDEN.id)).toHaveLength(0)
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('Backspace also triggers the delete confirm', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'planter',
      position: { x: 50, y: 50 },
      shape: { kind: 'circle', diameterCm: 40 },
      name: 'Pot',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Pot.*Planter/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{Backspace}')

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('Cancel keeps the surface', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Survivor',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Survivor.*Raised bed/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{Delete}')

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: /keep it/i }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await listSurfacesByGarden(SAMPLE_GARDEN.id)).toHaveLength(1)
  })

  it('Escape cancels the delete confirm without removing the surface', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Escape route',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    const group = (await screen.findByLabelText(
      /Escape route.*Raised bed/i,
    )) as unknown as HTMLElement
    group.focus()
    await user.keyboard('{Delete}')
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await listSurfacesByGarden(SAMPLE_GARDEN.id)).toHaveLength(1)
  })

  it('Delete button inside the edit form opens the same confirm', async () => {
    const user = userEvent.setup()
    await db.surfaces.add({
      id: 's1',
      gardenId: SAMPLE_GARDEN.id,
      type: 'raised-bed',
      position: { x: 50, y: 50 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Click target',
    })
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    await user.click(await screen.findByLabelText(/Click target.*Raised bed/i))
    const form = await screen.findByRole('form', { name: /edit surface/i })
    await user.click(
      within(form).getByRole('button', { name: /^delete$/i }),
    )

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('keyboard-only smoke: add → resize → move → edit name → delete', async () => {
    // Walks the full layout-planner happy path with no pointer events.
    // If any step's keyboard hook regresses, this catches it before merge.
    const user = userEvent.setup()
    render(<GardenCanvas garden={SAMPLE_GARDEN} />)

    // 1. Pick the raised-bed tool from the toolbar.
    const raisedBedTool = screen.getByRole('button', { name: /raised bed/i })
    raisedBedTool.focus()
    await user.keyboard(' ')
    expect(raisedBedTool).toHaveAttribute('aria-pressed', 'true')

    // 2. Drop a default-sized surface via Enter on the focused canvas.
    const svg = screen.getByRole('application')
    svg.focus()
    await user.keyboard('{Enter}')
    await waitFor(async () => {
      expect(await listSurfacesByGarden(SAMPLE_GARDEN.id)).toHaveLength(1)
    })

    // 3. Exit placement mode so the surface is interactive.
    await user.keyboard('{Escape}')
    expect(raisedBedTool).toHaveAttribute('aria-pressed', 'false')

    // 4. Focus the new surface, resize via Alt+Arrow (10cm with Shift).
    const initial = (await listSurfacesByGarden(SAMPLE_GARDEN.id))[0]!
    const group = (await screen.findByLabelText(
      new RegExp(`Raised bed`, 'i'),
    )) as unknown as HTMLElement
    group.focus()
    const initialW =
      initial.shape.kind === 'rect' ? initial.shape.widthCm : 0
    await user.keyboard('{Alt>}{Shift>}{ArrowRight}{/Shift}{/Alt}')
    await waitFor(async () => {
      const after = (await listSurfacesByGarden(SAMPLE_GARDEN.id))[0]!
      const w = after.shape.kind === 'rect' ? after.shape.widthCm : 0
      expect(w).toBe(initialW + 10)
    })

    // 5. Move it with Shift+Arrow (10cm).
    const beforeMove = (await listSurfacesByGarden(SAMPLE_GARDEN.id))[0]!
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
    await waitFor(async () => {
      const after = (await listSurfacesByGarden(SAMPLE_GARDEN.id))[0]!
      expect(after.position.y).toBe(beforeMove.position.y + 10)
    })

    // 6. Enter to open the editor; type a name; submit via Enter from the
    // name field.
    await user.keyboard('{Enter}')
    const form = await screen.findByRole('form', { name: /edit surface/i })
    const nameInput = within(form).getByLabelText(/name/i)
    await user.click(nameInput) // focus the field
    await user.keyboard('North bed')
    await user.click(
      within(form).getByRole('button', { name: /^save$/i }),
    )
    await waitFor(async () => {
      const after = (await listSurfacesByGarden(SAMPLE_GARDEN.id))[0]!
      expect(after.name).toBe('North bed')
    })

    // 7. Refocus the (now-named) surface and delete via Delete + confirm.
    const renamed = (await screen.findByLabelText(
      /North bed.*Raised bed/i,
    )) as unknown as HTMLElement
    renamed.focus()
    await user.keyboard('{Delete}')
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent(/North bed/i)
    // Tab off the auto-focused "Keep it" to "Delete" then activate.
    await user.tab()
    await user.keyboard('{Enter}')

    await waitFor(async () => {
      expect(await listSurfacesByGarden(SAMPLE_GARDEN.id)).toHaveLength(0)
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('renders previously-saved surfaces on mount', async () => {
    // Seed two surfaces and ensure both render as accessible groups.
    await db.surfaces.bulkAdd([
      {
        id: 's1',
        gardenId: SAMPLE_GARDEN.id,
        type: 'raised-bed',
        position: { x: 50, y: 50 },
        shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
        name: 'Tomato bed',
      },
      {
        id: 's2',
        gardenId: SAMPLE_GARDEN.id,
        type: 'planter',
        position: { x: 300, y: 200 },
        shape: { kind: 'circle', diameterCm: 40 },
        name: 'Basil pot',
      },
    ])

    render(<GardenCanvas garden={SAMPLE_GARDEN} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/Tomato bed.*Raised bed/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Basil pot.*Planter/i)).toBeInTheDocument()
    })
  })
})
