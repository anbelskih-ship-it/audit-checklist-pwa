import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAyIIjqGrRqmV1BBHZdW3EA8eV3-jWf2nk',
  authDomain: 'audit-checklist-4d6ec.firebaseapp.com',
  projectId: 'audit-checklist-4d6ec',
  storageBucket: 'audit-checklist-4d6ec.firebasestorage.app',
  messagingSenderId: '595484723450',
  appId: '1:595484723450:web:77521825217d081ac8a143',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
googleProvider.addScope('https://www.googleapis.com/auth/drive.file')
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly')
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets')
export const db = getFirestore(app)

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch(() => {
  // Multi-tab persistence not available
})
