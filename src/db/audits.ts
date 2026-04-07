import { db } from './schema'
import type { Audit, Answer } from '../types'

export async function createAudit(name: string, type: 'АСП' | 'НА', author: string, structureVersion: string): Promise<Audit> {
  const audit: Audit = {
    id: crypto.randomUUID(),
    name,
    type,
    author,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    structureVersion,
    answers: {},
    status: 'draft',
    synced: false,
  }
  await db.audits.add(audit)
  return audit
}

export async function getAudit(id: string): Promise<Audit | undefined> {
  return db.audits.get(id)
}

export async function listAudits(author?: string): Promise<Audit[]> {
  let collection = db.audits.orderBy('updated').reverse()
  if (author) {
    collection = db.audits.where('author').equals(author).reverse()
  }
  return collection.toArray()
}

export async function saveAnswer(auditId: string, itemId: string, answer: Answer): Promise<void> {
  const audit = await db.audits.get(auditId)
  if (!audit) throw new Error(`Audit ${auditId} not found`)
  audit.answers[itemId] = answer
  audit.updated = new Date().toISOString()
  audit.synced = false
  await db.audits.put(audit)
}

export async function setAuditStatus(auditId: string, status: 'draft' | 'completed'): Promise<void> {
  await db.audits.update(auditId, { status, updated: new Date().toISOString() })
}

export async function deleteAudit(auditId: string): Promise<void> {
  await db.audits.delete(auditId)
}
