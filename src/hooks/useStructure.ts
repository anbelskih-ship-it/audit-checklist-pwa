import { useState, useEffect } from 'react'
import { getStructure } from '../db/structures'
import { syncStructures } from '../drive/sync'
import type { ChecklistStructure } from '../types'

export async function loadStructureWithSync(
  type: 'АСП' | 'НА',
  canSync: boolean,
  options?: { expectedVersion?: string; onFresh?: (structure: ChecklistStructure) => void }
): Promise<ChecklistStructure | null> {
  const cached = await getStructure(type)
  const expectedVersion = options?.expectedVersion
  if (cached) {
    const versionMatches = !expectedVersion || cached.version === expectedVersion

    if (!versionMatches && canSync) {
      await syncStructures()
      const refreshed = await getStructure(type)
      if (refreshed) {
        options?.onFresh?.(refreshed)
      }
      return refreshed || cached
    }

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

export function useStructure(type: 'АСП' | 'НА', expectedVersion?: string) {
  const [state, setState] = useState<{
    type: 'АСП' | 'НА'
    expectedVersion?: string
    structure: ChecklistStructure | null
    loading: boolean
  }>({
    type,
    expectedVersion,
    structure: null,
    loading: true,
  })

  useEffect(() => {
    let active = true

    setState((current) => (
      current.type === type && current.expectedVersion === expectedVersion
        ? current
        : { type, expectedVersion, structure: null, loading: true }
    ))

    loadStructureWithSync(type, typeof navigator !== 'undefined' ? navigator.onLine : false, {
      expectedVersion,
      onFresh: (fresh) => {
        if (!active) return
        setState({ type, expectedVersion, structure: fresh, loading: false })
      },
    }).then(s => {
      if (!active) return
      setState({ type, expectedVersion, structure: s, loading: false })
    })

    return () => {
      active = false
    }
  }, [expectedVersion, type])

  return {
    structure: state.type === type && state.expectedVersion === expectedVersion ? state.structure : null,
    loading: state.type !== type || state.expectedVersion !== expectedVersion || state.loading,
  }
}
