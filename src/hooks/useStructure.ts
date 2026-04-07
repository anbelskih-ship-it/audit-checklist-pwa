import { useState, useEffect } from 'react'
import { getStructure } from '../db/structures'
import type { ChecklistStructure } from '../types'

export function useStructure(type: 'АСП' | 'НА') {
  const [structure, setStructure] = useState<ChecklistStructure | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStructure(type).then(s => {
      setStructure(s || null)
      setLoading(false)
    })
  }, [type])

  return { structure, loading }
}
