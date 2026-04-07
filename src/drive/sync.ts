import * as XLSX from 'xlsx'
import { getFileMetadata, downloadFile } from './drive-api'
import { parseChecklistXlsx } from '../parser/xlsx-parser'
import { saveStructure, getStructure } from '../db/structures'

const MASTER_FILES: Record<string, { type: 'АСП' | 'НА'; fileId: string }> = {}

export function configureMasterFiles(config: { asp_file_id: string; na_file_id: string }) {
  MASTER_FILES['asp'] = { type: 'АСП', fileId: config.asp_file_id }
  MASTER_FILES['na'] = { type: 'НА', fileId: config.na_file_id }
}

export async function syncStructures(): Promise<{ updated: string[] }> {
  const updated: string[] = []

  for (const [_key, { type, fileId }] of Object.entries(MASTER_FILES)) {
    try {
      const meta = await getFileMetadata(fileId)
      const existing = await getStructure(type)

      if (existing && existing.version === meta.modifiedTime) continue

      const buffer = await downloadFile(fileId)
      const wb = XLSX.read(buffer, { type: 'array' })
      const structure = parseChecklistXlsx(wb, type, meta.modifiedTime, fileId)

      await saveStructure(structure)
      updated.push(type)
    } catch (e) {
      console.error(`Failed to sync ${type}:`, e)
    }
  }

  return { updated }
}
