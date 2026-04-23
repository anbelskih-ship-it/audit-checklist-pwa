import type { Audit, ChecklistStructure } from '../types'
import { calcMetrics } from '../utils/metrics'
import { getSectionEvalItems, getSheetEvalItems } from '../utils/checklist-items'

/**
 * Универсальный промпт для любой LLM-модели (Gemini, Claude, GPT, Llama).
 * Собирает данные аудита и формирует бриф для генерации
 * дипломатичного, клиентоориентированного резюме зон роста.
 */
export function buildAuditPrompt(audit: Audit, structure: ChecklistStructure): string {
  // Общие метрики
  const allEvalItems = structure.sheets.flatMap(getSheetEvalItems)
  const { filled, total, yesCount } = calcMetrics(allEvalItems, audit.answers)
  const overallScore = filled > 0 ? Math.round((yesCount / filled) * 100) : 0

  // Зоны роста по листам
  const sheetBlocks: string[] = []
  for (const sheet of structure.sheets) {
    const evalItems = getSheetEvalItems(sheet)
    const m = calcMetrics(evalItems, audit.answers)
    const sheetScore = m.filled > 0 ? Math.round((m.yesCount / m.filled) * 100) : 0

    const issues: string[] = []
    for (const section of sheet.sections) {
      for (const item of getSectionEvalItems(section)) {
        const a = audit.answers[item.id]
        if (a?.value === 0) {
          let line = `- ${item.text}`
          if (a.comment) line += `\n  Комментарий консультанта: ${a.comment}`
          issues.push(line)
        }
      }
    }

    if (issues.length > 0) {
      sheetBlocks.push(
        `## ${sheet.name} — результат ${sheetScore}%\n${issues.join('\n')}`
      )
    }
  }

  const prompt = `Ты — старший консультант по операционной эффективности автомобильного дилерского центра. Тебе дан результат аудита. Сформируй выжимку.

ФОРМАТ ОТВЕТА (строго):

Первая часть — ВЫЖИМКА ПО БЛОКАМ:
По каждому блоку с зонами роста — одна строка в формате:
"{Название блока} ({score}%): {перечисление конкретных невыполненных пунктов через запятую — кратко, без воды}"

Вторая часть — РЕКОМЕНДАЦИИ:
По каждому блоку — 1 конкретное действие, которое закроет максимум зон роста в этом блоке. Формат:
"{Название блока}: {конкретное действие}"

Третья часть — ИТОГ:
2 предложения. Общий результат, главный вектор развития.

ЗАПРЕТЫ:
- НЕ пиши приветствие, преамбулу, обращение ("Уважаемые", "По итогам" и т.д.)
- НЕ пиши "проблема", "нарушение", "несоответствие", "ошибка"
- НЕ пересказывай данные, которые и так видны в цифрах — только конкретика
- НЕ хвали за то, что уже сделано — только зоны роста и действия
- НЕ используй markdown-разметку
- Объём: не более 250 слов
- Язык: русский

ДАННЫЕ АУДИТА:
Тип: ${audit.type}
ДЦ: ${audit.dealership}, ${audit.city}
Дата: ${new Date(audit.updated).toLocaleDateString('ru')}
Заполнено: ${filled}/${total}
Общий результат: ${overallScore}%

ЗОНЫ РОСТА:
${sheetBlocks.length > 0 ? sheetBlocks.join('\n\n') : 'Зон роста не выявлено.'}`

  return prompt
}
