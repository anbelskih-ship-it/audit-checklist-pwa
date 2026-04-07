import { useState, useEffect, useCallback } from 'react'
import { getAudit, saveAnswer as dbSaveAnswer } from '../db/audits'
import type { Audit, Answer } from '../types'

export function useAudit(auditId: string) {
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAudit(auditId).then(a => {
      setAudit(a || null)
      setLoading(false)
    })
  }, [auditId])

  const saveAnswer = useCallback(async (itemId: string, answer: Answer) => {
    await dbSaveAnswer(auditId, itemId, answer)
    setAudit(prev => prev ? { ...prev, answers: { ...prev.answers, [itemId]: answer } } : null)
  }, [auditId])

  return { audit, loading, saveAnswer }
}
