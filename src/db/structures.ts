import { db } from './schema'
import type { ChecklistStructure } from '../types'

export async function saveStructure(structure: ChecklistStructure): Promise<void> {
  const id = `${structure.type}_${structure.driveFileId}`
  await db.structures.put({ ...structure, id })
}

export async function getStructure(type: 'АСП' | 'НА'): Promise<ChecklistStructure | undefined> {
  return db.structures.where('type').equals(type).first()
}

export async function getStructureByVersion(type: 'АСП' | 'НА', version: string): Promise<ChecklistStructure | undefined> {
  return db.structures.where({ type, version }).first()
}
