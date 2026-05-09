// Default values for the SurfaceForm draft, per surface type. Lives in its
// own module so SurfaceForm.tsx can be a component-only file (Vite Fast
// Refresh wants components and constants to be separated).

import type { Shape, SurfaceType } from '../../db/types'

export type SurfaceFormValues = {
  name: string
  shape: Shape
  depthCm?: number
  buildOrBuy: 'build' | 'buy' | 'existing'
}

export function defaultValuesFor(type: SurfaceType): SurfaceFormValues {
  switch (type) {
    case 'in-ground':
      return {
        name: '',
        shape: { kind: 'rect', widthCm: 100, heightCm: 100 },
        buildOrBuy: 'existing',
      }
    case 'raised-bed':
      return {
        name: '',
        shape: { kind: 'rect', widthCm: 120, heightCm: 60 },
        depthCm: 25,
        buildOrBuy: 'build',
      }
    case 'planter':
      return {
        name: '',
        shape: { kind: 'circle', diameterCm: 40 },
        depthCm: 30,
        buildOrBuy: 'buy',
      }
    case 'trellis':
      return {
        name: '',
        shape: { kind: 'rect', widthCm: 120, heightCm: 5 },
        buildOrBuy: 'build',
      }
  }
}
