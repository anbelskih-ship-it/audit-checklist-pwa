// Структура чек-листа (из мастер-файла)
export interface ChecklistStructure {
  type: 'АСП' | 'НА'
  version: string // ISO date of master file modification
  driveFileId: string
  sheets: SheetBlock[]
}

export interface SheetBlock {
  id: string           // "01", "02", etc.
  name: string         // "Использование платформы"
  estimatedTime: string // "1 час"
  sections: Section[]
}

export interface Section {
  id: string           // "01.1"
  name: string         // "Тактика закупки"
  items: CheckItem[]
}

export interface CheckItem {
  id: string           // "01.1.1"
  text: string         // "Работа с разделом «закупка»"
  criteria: string     // Критерий выполнения
}

// Заполненный аудит
export interface Audit {
  id: string           // uuid
  name: string         // "Башавтоком — июнь 2026"
  type: 'АСП' | 'НА'
  author: string       // email
  created: string      // ISO date
  updated: string      // ISO date
  structureVersion: string
  answers: Record<string, Answer>
  status: 'draft' | 'completed'
  synced: boolean
}

export interface Answer {
  value: 0 | 1 | null  // null = not answered yet
  comment: string
}

// Навигация
export interface NavPosition {
  sheetIndex: number
  sectionIndex: number
  itemIndex: number
}
