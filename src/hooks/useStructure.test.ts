import { describe, expect, it, vi, beforeEach } from 'vitest'
import { loadStructureWithSync } from './useStructure'
import type { ChecklistStructure } from '../types'

const getStructureMock = vi.fn()
const syncStructuresMock = vi.fn()

vi.mock('../db/structures', () => ({
  getStructure: (...args: unknown[]) => getStructureMock(...args),
}))

vi.mock('../drive/sync', () => ({
  syncStructures: (...args: unknown[]) => syncStructuresMock(...args),
}))

describe('loadStructureWithSync', () => {
  beforeEach(() => {
    getStructureMock.mockReset()
    syncStructuresMock.mockReset()
  })

  it('re-reads structure after sync when local cache is empty', async () => {
    const structure: ChecklistStructure = {
      type: 'АСП',
      version: 'v1',
      driveFileId: 'file1',
      sheets: [],
    }

    getStructureMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(structure)
    syncStructuresMock.mockResolvedValue({ updated: ['АСП'] })

    const result = await loadStructureWithSync('АСП', true)

    expect(syncStructuresMock).toHaveBeenCalledTimes(1)
    expect(getStructureMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual(structure)
  })

  it('does not sync when offline and local cache is empty', async () => {
    getStructureMock.mockResolvedValueOnce(undefined)

    const result = await loadStructureWithSync('АСП', false)

    expect(syncStructuresMock).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('returns cached structure immediately when cache exists', async () => {
    const cached: ChecklistStructure = {
      type: 'АСП',
      version: 'old',
      driveFileId: 'file1',
      sheets: [],
    }
    const refreshed: ChecklistStructure = {
      type: 'АСП',
      version: 'new',
      driveFileId: 'file1',
      sheets: [{ id: 'KPIs', name: 'Показатели', estimatedTime: '', sections: [] }],
    }

    getStructureMock.mockResolvedValueOnce(cached)
    syncStructuresMock.mockResolvedValue({ updated: ['АСП'] })

    const result = await loadStructureWithSync('АСП', true)

    expect(syncStructuresMock).toHaveBeenCalledTimes(1)
    expect(getStructureMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(cached)
  })
})
