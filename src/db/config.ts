import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const CONFIG_DOC = 'config/ai'

export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, CONFIG_DOC))
    return snap.exists() ? (snap.data().geminiApiKey ?? null) : null
  } catch {
    return null
  }
}

export async function setGeminiApiKey(key: string): Promise<void> {
  await setDoc(doc(db, CONFIG_DOC), { geminiApiKey: key }, { merge: true })
}
