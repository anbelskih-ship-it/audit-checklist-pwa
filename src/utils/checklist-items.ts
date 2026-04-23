import type { CheckItem, Section, SheetBlock } from '../types'

export function getSectionEvalItems(section: Section): CheckItem[] {
  return section.items
}

export function getSheetEvalItems(sheet: SheetBlock): CheckItem[] {
  return sheet.sections.flatMap(getSectionEvalItems)
}
