import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { saveAnswer as dbSaveAnswer } from '../db/audits'
import type { Audit, Answer } from '../types'

export function useAudit(auditId: string) {
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)
  const pendingAnswers = useRef<Record<string, Answer>>({})

  useEffect(() => {
    return onSnapshot(doc(db, 'audits', auditId), (snap) => {
      if (!snap.exists()) {
        setAudit(null)
        setLoading(false)
        return
      }
      const data = snap.data() as Audit

      // Merge pending optimistic answers over server data
      const pending = pendingAnswers.current
      if (Object.keys(pending).length > 0) {
        data.answers = { ...data.answers, ...pending }
      }

      // Clear confirmed pending answers when server data arrives
      if (!snap.metadata.hasPendingWrites) {
        const serverAnswers = (snap.data() as Audit).answers
        const stillPending: Record<string, Answer> = {}
        for (const [key, val] of Object.entries(pending)) {
          if (serverAnswers[key]?.value !== val.value) {
            stillPending[key] = val
          }
        }
        pendingAnswers.current = stillPending
      }

      setAudit(data)
      setLoading(false)
    })
  }, [auditId])

  const saveAnswer = useCallback(async (itemId: string, answer: Answer) => {
    // Track as pending optimistic answer
    pendingAnswers.current = { ...pendingAnswers.current, [itemId]: answer }

    // Optimistic UI update
    setAudit(prev => {
      if (!prev) return prev
      return {
        ...prev,
        answers: { ...prev.answers, [itemId]: answer },
        updated: new Date().toISOString(),
      }
    })

    try {
      await dbSaveAnswer(auditId, itemId, answer)
    } catch {
      // Revert on error — remove from pending, let next onSnapshot correct state
      const nextPending = { ...pendingAnswers.current }
      delete nextPending[itemId]
      pendingAnswers.current = nextPending
    }
  }, [auditId])

  return { audit, loading, saveAnswer }
}
