import {
  collection, doc, setDoc, getDocs,
  query, orderBy, deleteDoc, limit, startAfter, type QueryConstraint,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Audit, Answer } from '../types'

const AUDITS = 'audits'

export interface CreateAuditParams {
  type: 'АСП' | 'НА'
  dealership: string
  city: string
  plannedEnd: string
  comment: string
  authorUid: string
  authorName: string
  authorEmail: string
  structureVersion: string
}

export async function createAudit(params: CreateAuditParams): Promise<Audit> {
  const now = new Date()
  const monthYear = now.toLocaleDateString('ru', { month: 'short', year: 'numeric' })
  const name = `${params.dealership} — ${params.type} — ${monthYear}`

  const ref = doc(collection(db, AUDITS))
  const audit: Audit = {
    id: ref.id,
    name,
    type: params.type,
    dealership: params.dealership,
    city: params.city,
    authorUid: params.authorUid,
    authorName: params.authorName,
    authorEmail: params.authorEmail,
    created: now.toISOString(),
    updated: now.toISOString(),
    plannedEnd: params.plannedEnd,
    comment: params.comment,
    structureVersion: params.structureVersion,
    answers: {},
    status: 'draft',
  }
  await setDoc(ref, audit)
  return audit
}

export interface ListAuditsResult {
  audits: Audit[]
  nextCursor: string | null
}

export async function listAudits(pageSize = 40, cursor?: string | null): Promise<ListAuditsResult> {
  const constraints: QueryConstraint[] = [orderBy('updated', 'desc')]
  if (cursor) constraints.push(startAfter(cursor))
  constraints.push(limit(pageSize))
  const q = query(collection(db, AUDITS), ...constraints)
  const snap = await getDocs(q)
  const audits = snap.docs.map(d => d.data() as Audit)
  const nextCursor = audits.length === pageSize ? audits[audits.length - 1]?.updated || null : null
  return { audits, nextCursor }
}

export async function saveAnswer(auditId: string, itemId: string, answer: Answer): Promise<void> {
  const ref = doc(db, AUDITS, auditId)
  // Use setDoc+merge to avoid Firestore interpreting dots in itemId as nested paths
  await setDoc(ref, {
    answers: { [itemId]: answer },
    updated: new Date().toISOString(),
  }, { merge: true })
}

export async function saveAuditSummary(auditId: string, summary: string): Promise<void> {
  const ref = doc(db, AUDITS, auditId)
  await setDoc(ref, { summary, updated: new Date().toISOString() }, { merge: true })
}

export async function saveAuditExportMeta(
  auditId: string,
  meta: { exportFileId: string; exportFileName: string; exportUrl: string }
): Promise<void> {
  const ref = doc(db, AUDITS, auditId)
  await setDoc(ref, {
    ...meta,
    exportUpdatedAt: new Date().toISOString(),
    updated: new Date().toISOString(),
  }, { merge: true })
}

export async function deleteAudit(auditId: string): Promise<void> {
  await deleteDoc(doc(db, AUDITS, auditId))
}

export interface UpdateAuditMetaParams {
  dealership: string
  city: string
  plannedEnd: string
  comment: string
}

export async function updateAuditMeta(auditId: string, params: UpdateAuditMetaParams): Promise<void> {
  await setDoc(doc(db, AUDITS, auditId), {
    dealership: params.dealership,
    city: params.city,
    plannedEnd: params.plannedEnd,
    comment: params.comment,
    updated: new Date().toISOString(),
  }, { merge: true })
}
