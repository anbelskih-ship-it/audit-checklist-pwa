import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

export type UserRole = 'admin' | 'auditor' | 'guest'

export interface AllowedUser {
  email: string
  role: UserRole
  name: string
  addedAt: string
}

const COLLECTION = 'allowedUsers'

export async function getAllowedUser(email: string): Promise<AllowedUser | null> {
  const snap = await getDoc(doc(db, COLLECTION, email))
  return snap.exists() ? (snap.data() as AllowedUser) : null
}

export async function listAllowedUsers(): Promise<AllowedUser[]> {
  const snap = await getDocs(collection(db, COLLECTION))
  return snap.docs.map(d => d.data() as AllowedUser)
}

export async function addAllowedUser(email: string, role: UserRole, name: string): Promise<void> {
  await setDoc(doc(db, COLLECTION, email), {
    email,
    role,
    name,
    addedAt: new Date().toISOString(),
  })
}

export async function removeAllowedUser(email: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, email))
}

export async function updateUserRole(email: string, role: UserRole): Promise<void> {
  const ref = doc(db, COLLECTION, email)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await setDoc(ref, { ...snap.data(), role }, { merge: true })
  }
}
