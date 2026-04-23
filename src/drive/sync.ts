import * as XLSX from 'xlsx'
import { getFileMetadata, downloadFile } from './drive-api'
import { parseChecklistXlsx } from '../parser/xlsx-parser'
import { saveStructure, getStructure } from '../db/structures'
import { ASP_FALLBACK, NA_FALLBACK } from '../data/checklist-fallbacks'

export const PARSER_SCHEMA_VERSION = '2026-04-23-kpi-id-stability'

const MASTER_FILES: Record<string, { type: 'АСП' | 'НА'; fileId: string }> = {}
const FALLBACKS = {
  АСП: ASP_FALLBACK,
  НА: NA_FALLBACK,
} as const

function buildStructureVersion(modifiedTime: string): string {
  return `${modifiedTime}::${PARSER_SCHEMA_VERSION}`
}

export function configureMasterFiles(config: { asp_file_id: string; na_file_id: string }) {
  MASTER_FILES['asp'] = { type: 'АСП', fileId: config.asp_file_id }
  MASTER_FILES['na'] = { type: 'НА', fileId: config.na_file_id }
}

export async function syncStructures(): Promise<{ updated: string[] }> {
  const updated: string[] = []

  for (const { type, fileId } of Object.values(MASTER_FILES)) {
    try {
      const meta = await getFileMetadata(fileId)
      const existing = await getStructure(type)
      const nextVersion = buildStructureVersion(meta.modifiedTime)

      if (existing && existing.version === nextVersion) continue

      const buffer = await downloadFile(fileId)
      const wb = XLSX.read(buffer, { type: 'array' })
      const structure = parseChecklistXlsx(wb, type, nextVersion, fileId)

      await saveStructure(structure)
      updated.push(type)
    } catch (e) {
      console.error(`Failed to sync ${type}:`, e)
      const existing = await getStructure(type)
      if (!existing) {
        await saveStructure(FALLBACKS[type])
        updated.push(type)
      }
    }
  }

  return { updated }
}
