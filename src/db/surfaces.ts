// Typed CRUD over the Dexie `surfaces` table. The Layout planner UI builds
// on this — adds, edits, moves, resizes, and deletes go through here so the
// IndexedDB shape (per DATA_MODEL.md § Surface) stays in one place.

import { db } from './schema'
import type { Shape, Surface, SurfaceType } from './types'

export type CreateSurfaceInput = {
  gardenId: string
  type: SurfaceType
  position: { x: number; y: number }
  shape: Shape
  name?: string
  depthCm?: number
  buildOrBuy?: Surface['buildOrBuy']
  notes?: string
}

export type UpdateSurfaceInput = Partial<
  Omit<Surface, 'id' | 'gardenId' | 'type'>
>

function newId(): string {
  return crypto.randomUUID()
}

export async function createSurface(input: CreateSurfaceInput): Promise<Surface> {
  const surface: Surface = { id: newId(), ...input }
  await db.surfaces.add(surface)
  return surface
}

export async function getSurface(id: string): Promise<Surface | undefined> {
  return db.surfaces.get(id)
}

export async function listSurfacesByGarden(gardenId: string): Promise<Surface[]> {
  return db.surfaces.where('gardenId').equals(gardenId).toArray()
}

export async function updateSurface(
  id: string,
  patch: UpdateSurfaceInput,
): Promise<Surface> {
  const existing = await db.surfaces.get(id)
  if (!existing) throw new Error(`Surface ${id} not found`)
  const next: Surface = { ...existing, ...patch }
  await db.surfaces.put(next)
  return next
}

export async function deleteSurface(id: string): Promise<void> {
  await db.surfaces.delete(id)
}
