import { useState, useEffect } from 'react'
import { getStructure } from '../db/structures'
import { syncStructures } from '../drive/sync'
import type { ChecklistStructure } from '../types'

export async function loadStructureWithSync(
  type: 'АСП' | 'НА',
  canSync: boolean
): Promise<ChecklistStructure | null> {
  const cached = await getStructure(type)
  if (cached) {
    if (canSync) {
      void syncStructures().catch(() => undefined)
    }
    return cached
  }

  if (!canSync) return cached || null

  await syncStructures()
  const refreshed = await getStructure(type)
  return refreshed || cached || null
}

export function useStructure(type: 'АСП' | 'НА') {
  const [structure, setStructure] = useState<ChecklistStructure | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    setLoading(true)
    loadStructureWithSync(type, typeof navigator !== 'undefined' ? navigator.onLine : false).then(s => {
      if (!active) return
      setStructure(s)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [type])

  return { structure, loading }
}
