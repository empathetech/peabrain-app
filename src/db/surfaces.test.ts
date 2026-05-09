import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  createSurface,
  deleteSurface,
  getSurface,
  listSurfacesByGarden,
  updateSurface,
} from './surfaces'

const GARDEN_A = 'garden-a'
const GARDEN_B = 'garden-b'

beforeEach(async () => {
  await db.surfaces.clear()
})

afterEach(async () => {
  await db.surfaces.clear()
})

describe('surfaces CRUD', () => {
  it('creates a surface with a generated id and persists every field', async () => {
    const created = await createSurface({
      gardenId: GARDEN_A,
      type: 'raised-bed',
      position: { x: 10, y: 20 },
      shape: { kind: 'rect', widthCm: 240, heightCm: 120 },
      name: 'North bed',
      depthCm: 30,
      buildOrBuy: 'build',
    })

    expect(created.id).toMatch(/[0-9a-f-]{36}/i)
    const fetched = await getSurface(created.id)
    expect(fetched).toEqual(created)
  })

  it('lists only surfaces that belong to the given garden', async () => {
    await createSurface({
      gardenId: GARDEN_A,
      type: 'in-ground',
      position: { x: 0, y: 0 },
      shape: { kind: 'rect', widthCm: 100, heightCm: 100 },
    })
    await createSurface({
      gardenId: GARDEN_A,
      type: 'planter',
      position: { x: 50, y: 50 },
      shape: { kind: 'circle', diameterCm: 40 },
    })
    await createSurface({
      gardenId: GARDEN_B,
      type: 'raised-bed',
      position: { x: 0, y: 0 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
    })

    const a = await listSurfacesByGarden(GARDEN_A)
    const b = await listSurfacesByGarden(GARDEN_B)
    expect(a).toHaveLength(2)
    expect(b).toHaveLength(1)
    expect(a.every((s) => s.gardenId === GARDEN_A)).toBe(true)
  })

  it('updates a surface by patching only the supplied fields', async () => {
    const created = await createSurface({
      gardenId: GARDEN_A,
      type: 'raised-bed',
      position: { x: 0, y: 0 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
      name: 'Old name',
      depthCm: 25,
    })

    const updated = await updateSurface(created.id, {
      name: 'New name',
      position: { x: 5, y: 5 },
    })

    expect(updated.name).toBe('New name')
    expect(updated.position).toEqual({ x: 5, y: 5 })
    expect(updated.depthCm).toBe(25)
    expect(updated.type).toBe('raised-bed')

    const fetched = await getSurface(created.id)
    expect(fetched).toEqual(updated)
  })

  it('throws when updating a missing surface', async () => {
    await expect(updateSurface('does-not-exist', { name: 'x' })).rejects.toThrow(
      /not found/,
    )
  })

  it('deletes a surface and leaves the rest of the garden alone', async () => {
    const a = await createSurface({
      gardenId: GARDEN_A,
      type: 'raised-bed',
      position: { x: 0, y: 0 },
      shape: { kind: 'rect', widthCm: 200, heightCm: 100 },
    })
    const b = await createSurface({
      gardenId: GARDEN_A,
      type: 'planter',
      position: { x: 50, y: 50 },
      shape: { kind: 'circle', diameterCm: 40 },
    })

    await deleteSurface(a.id)

    expect(await getSurface(a.id)).toBeUndefined()
    const remaining = await listSurfacesByGarden(GARDEN_A)
    expect(remaining).toEqual([b])
  })
})
