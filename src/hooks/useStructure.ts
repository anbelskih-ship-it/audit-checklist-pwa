import { useState, useEffect } from 'react'
import { getStructure } from '../db/structures'
import { syncStructures } from '../drive/sync'
import type { ChecklistStructure } from '../types'

export async function loadStructureWithSync(
  type: 'АСП' | 'НА',
  canSync: boolean,
  options?: { onFresh?: (structure: ChecklistStructure) => void }
): Promise<ChecklistStructure | null> {
  const cached = await getStructure(type)
  if (cached) {
    if (canSync) {
      void syncStructures()
        .then(async () => {
          const refreshed = await getStructure(type)
          if (refreshed) {
            options?.onFresh?.(refreshed)
          }
        })
        .catch(() => undefined)
    }
    return cached
  }

  if (!canSync) return cached || null

  await syncStructures()
  const refreshed = await getStructure(type)
  if (refreshed) {
    options?.onFresh?.(refreshed)
  }
  return refreshed || cached || null
}

export function useStructure(type: 'АСП' | 'НА') {
  const [state, setState] = useState<{
    type: 'АСП' | 'НА'
    structure: ChecklistStructure | null
    loading: boolean
  }>({
    type,
    structure: null,
    loading: true,
  })

  useEffect(() => {
    let active = true

    loadStructureWithSync(type, typeof navigator !== 'undefined' ? navigator.onLine : false, {
      onFresh: (fresh) => {
        if (!active) return
        setState({ type, structure: fresh, loading: false })
      },
    }).then(s => {
      if (!active) return
      setState({ type, structure: s, loading: false })
    })

    return () => {
      active = false
    }
  }, [type])

  return {
    structure: state.type === type ? state.structure : null,
    loading: state.type !== type || state.loading,
  }
}
