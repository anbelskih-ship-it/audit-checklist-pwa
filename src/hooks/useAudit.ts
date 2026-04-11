import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { saveAnswer as dbSaveAnswer } from '../db/audits'
import type { Audit, Answer } from '../types'

export function useAudit(auditId: string) {
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(doc(db, 'audits', auditId), (snap) => {
      setAudit(snap.exists() ? (snap.data() as Audit) : null)
      setLoading(false)
    })
  }, [auditId])

  const saveAnswer = useCallback(async (itemId: string, answer: Answer) => {
    // Optimistic update — мгновенный отклик UI
    setAudit(prev => {
      if (!prev) return prev
      return {
        ...prev,
        answers: { ...prev.answers, [itemId]: answer },
        updated: new Date().toISOString(),
      }
    })
    await dbSaveAnswer(auditId, itemId, answer)
  }, [auditId])

  return { audit, loading, saveAnswer }
}
