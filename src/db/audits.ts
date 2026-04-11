import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
  query, orderBy, deleteDoc,
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

export async function getAudit(id: string): Promise<Audit | undefined> {
  const snap = await getDoc(doc(db, AUDITS, id))
  return snap.exists() ? (snap.data() as Audit) : undefined
}

export async function listAudits(): Promise<Audit[]> {
  const q = query(collection(db, AUDITS), orderBy('updated', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Audit)
}

export async function saveAnswer(auditId: string, itemId: string, answer: Answer): Promise<void> {
  const ref = doc(db, AUDITS, auditId)
  // Use setDoc+merge to avoid Firestore interpreting dots in itemId as nested paths
  await setDoc(ref, {
    answers: { [itemId]: answer },
    updated: new Date().toISOString(),
  }, { merge: true })
}

export async function setAuditStatus(auditId: string, status: 'draft' | 'completed'): Promise<void> {
  await updateDoc(doc(db, AUDITS, auditId), { status, updated: new Date().toISOString() })
}

export async function deleteAudit(auditId: string): Promise<void> {
  await deleteDoc(doc(db, AUDITS, auditId))
}
