import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import type { Audit, ChecklistStructure, Answer } from '../types'

interface AuditRouteDataValue {
  audit: Audit | null
  auditLoading: boolean
  structure: ChecklistStructure | null
  structureLoading: boolean
  saveAnswer: (itemId: string, answer: Answer) => Promise<void>
}

const AuditRouteDataContext = createContext<AuditRouteDataValue | null>(null)

export function AuditRouteDataProvider({ children }: { children?: ReactNode }) {
  const { auditId } = useParams<{ auditId: string }>()
  const { audit, loading: auditLoading, saveAnswer } = useAudit(auditId!)
  const { structure, loading: structureLoading } = useStructure(audit?.type || 'АСП', audit?.structureVersion)

  const value = useMemo(() => ({
    audit,
    auditLoading,
    structure,
    structureLoading,
    saveAnswer,
  }), [audit, auditLoading, saveAnswer, structure, structureLoading])

  return (
    <AuditRouteDataContext.Provider value={value}>
      {children ?? <Outlet />}
    </AuditRouteDataContext.Provider>
  )
}

export function useAuditRouteData() {
  const value = useContext(AuditRouteDataContext)
  if (!value) {
    throw new Error('useAuditRouteData must be used within AuditRouteDataProvider')
  }
  return value
}
