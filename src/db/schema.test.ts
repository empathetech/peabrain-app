import { describe, expect, it } from 'vitest'
import { PeabrainDB } from './schema'

describe('PeabrainDB', () => {
  it('declares the v1 schema with all DATA_MODEL.md tables', () => {
    const db = new PeabrainDB()
    const tableNames = db.tables.map((t) => t.name).sort()
    expect(tableNames).toEqual(
      [
        'dataVersions',
        'frostDateCells',
        'gardens',
        'koppenCells',
        'plantings',
        'plants',
        'regions',
        'sunZones',
        'surfaces',
        'zones',
      ].sort(),
    )
    expect(db.verno).toBe(2)
  })
})
