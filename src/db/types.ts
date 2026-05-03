// Domain types for IndexedDB-stored entities. Mirrors DATA_MODEL.md.
// Kept intentionally narrow at v1 — fields fill in as features land.

export type FitTier = 'great' | 'decent' | 'stretch' | 'impossible'

export type ShapeRect = { kind: 'rect'; widthCm: number; heightCm: number }
export type ShapeCircle = { kind: 'circle'; diameterCm: number }
export type ShapePolygon = {
  kind: 'polygon'
  pointsCm: { x: number; y: number }[]
}
export type Shape = ShapeRect | ShapeCircle | ShapePolygon

export type Location = {
  label: string
  countryCode?: string
  regionCode?: string
  coords?: { lat: number; lon: number }
  koppenCode: string
  hemisphere: 'northern' | 'southern'
  lastFrostMonthDay?: string
  firstFrostMonthDay?: string
}

export type Garden = {
  id: string
  name: string
  location: Location
  units: 'metric' | 'imperial'
  bounds: { widthCm: number; heightCm: number }
  notes?: string
  createdAt: string
  updatedAt: string
}

export type SurfaceType = 'in-ground' | 'raised-bed' | 'planter' | 'trellis'

export type Surface = {
  id: string
  gardenId: string
  type: SurfaceType
  name?: string
  position: { x: number; y: number }
  shape: Shape
  depthCm?: number
  buildOrBuy?: 'build' | 'buy' | 'existing'
  buildStatus?: 'planned' | 'in-progress' | 'ready'
  estimatedCost?: { amount: number; currency: 'USD' | 'EUR' | 'GBP' }
  notes?: string
  vertical?: { heightCm: number; orientationDeg?: number }
}

export type SunZone = {
  id: string
  gardenId: string
  shape: Shape
  level: 'full-sun' | 'partial-morning' | 'partial-afternoon' | 'shade'
  notes?: string
}

export type Planting = {
  id: string
  gardenId: string
  surfaceId: string
  plantId: string
  status: 'planned' | 'growing' | 'harvesting' | 'done'
  endedReason?: 'harvested' | 'failed' | 'removed'
  positionInSurface?: { x: number; y: number }
  quantity: number
  plannedDate?: string
  plantedDate?: string
  endedDate?: string
  label?: string
  notes?: string
}

export type Plant = {
  id: string
  scientificName: string
  commonNames: { [locale: string]: string[] }
  family: string
  description?: string
  imageUrl?: string
  surfaceFit: {
    inGround: FitTier
    raisedBed: FitTier
    planter: { fit: FitTier; minVolumeL?: number }
    trellis: FitTier
  }
  sunNeeds: 'full' | 'partial' | 'shade' | 'any'
  minSoilDepthCm: number
  spacingCm: number
  zoneFit: { [koppenCode: string]: FitTier }
  daysToMaturity: [number, number]
  sources: string[]
}

export type KoppenCell = {
  latBucket: number
  lonBucket: number
  code: string
}

export type FrostDateCell = {
  latBucket: number
  lonBucket: number
  avgLastSpringFrost?: string
  avgFirstFallFrost?: string
  stdDevDays?: number
}

export type ZoneInfo = {
  code: string
  description: string
  hemisphere: 'northern' | 'southern' | 'either'
}

export type Region = {
  code: string
  name: string
  parent?: string
}

export type DataVersion = {
  key: 'plants' | 'koppen' | 'frostDates' | 'regions'
  version: string
  fetchedAt: string
}
