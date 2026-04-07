import Dexie, { type Table } from 'dexie'
import type { Audit, ChecklistStructure } from '../types'

export class AuditDB extends Dexie {
  audits!: Table<Audit, string>
  structures!: Table<ChecklistStructure & { id: string }, string>

  constructor() {
    super('AuditChecklistDB')
    this.version(1).stores({
      audits: 'id, type, author, status, updated',
      structures: 'id, type, version',
    })
  }
}

export const db = new AuditDB()
