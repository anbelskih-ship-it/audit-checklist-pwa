import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './schema'
import { saveStructure, getStructure } from './structures'

// Audit CRUD tests removed: audits now live in Firestore (not Dexie),
// so these tests would require a Firestore emulator to run.

beforeEach(async () => {
  await db.structures.clear()
})

describe('structures', () => {
  it('saves and retrieves structure', async () => {
    await saveStructure({ type: 'АСП', version: 'v1', driveFileId: 'f1', sheets: [] })
    const s = await getStructure('АСП')
    expect(s?.version).toBe('v1')
  })
})
