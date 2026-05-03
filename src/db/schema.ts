// Dexie schema and migrations.
//
// Bump the version and append a new `.version(N).stores(...).upgrade(...)`
// block whenever the *shape* of stored objects changes. Adding optional
// fields doesn't require a bump — renames or restructures do.
//
// Migrations run on app load. Test pre-migration snapshots before shipping.

import Dexie, { type Table } from 'dexie'
import type {
  DataVersion,
  FrostDateCell,
  Garden,
  KoppenCell,
  Plant,
  Planting,
  Region,
  Surface,
  SunZone,
  ZoneInfo,
} from './types'

export class PeabrainDB extends Dexie {
  // User data
  gardens!: Table<Garden, string>
  surfaces!: Table<Surface, string>
  sunZones!: Table<SunZone, string>
  plantings!: Table<Planting, string>

  // Reference data (cached from bundled assets)
  plants!: Table<Plant, string>
  koppenCells!: Table<KoppenCell, [number, number]>
  frostDateCells!: Table<FrostDateCell, [number, number]>
  zones!: Table<ZoneInfo, string>
  regions!: Table<Region, string>

  // System
  dataVersions!: Table<DataVersion, string>

  constructor() {
    super('peabrain')

    this.version(1).stores({
      gardens: 'id, updatedAt',
      surfaces: 'id, gardenId, type',
      sunZones: 'id, gardenId',
      plantings: 'id, gardenId, surfaceId, plantId, status',
      plants: 'id, family',
      koppenCells: '[latBucket+lonBucket]',
      frostDateCells: '[latBucket+lonBucket]',
      zones: 'code',
      regions: 'code, parent',
      dataVersions: 'key',
    })
  }
}

export const db = new PeabrainDB()
