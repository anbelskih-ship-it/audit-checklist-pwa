import type { Audit, ChecklistStructure } from '../types'
import { calcMetrics } from '../utils/metrics'

/**
 * Универсальный промпт для любой LLM-модели (Gemini, Claude, GPT, Llama).
 * Собирает данные аудита и формирует бриф для генерации
 * дипломатичного, клиентоориентированного резюме зон роста.
 */
export function buildAuditPrompt(audit: Audit, structure: ChecklistStructure): string {
  // Общие метрики
  const allEvalItems = structure.sheets.flatMap(sh => sh.sections.flatMap(s => s.items.slice(1)))
  const { filled, total, yesCount } = calcMetrics(allEvalItems, audit.answers)
  const overallScore = filled > 0 ? Math.round((yesCount / filled) * 100) : 0

  // Зоны роста по листам
  const sheetBlocks: string[] = []
  for (const sheet of structure.sheets) {
    const evalItems = sheet.sections.flatMap(s => s.items.slice(1))
    const m = calcMetrics(evalItems, audit.answers)
    const sheetScore = m.filled > 0 ? Math.round((m.yesCount / m.filled) * 100) : 0

    const issues: string[] = []
    for (const section of sheet.sections) {
      for (const item of section.items.slice(1)) {
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

  const prompt = `Ты — старший консультант по эффективности автомобильного дилерского центра.

ЗАДАЧА: Напиши краткое резюме результатов аудита для руководства дилерского центра.

ПРАВИЛА:
- Пиши на русском языке
- Формулируй дипломатично и конструктивно — это документ для клиента
- Используй формулировки "зона развития", "потенциал роста", "рекомендация"
- НЕ используй: "проблема", "нарушение", "несоответствие", "ошибка", "провал"
- На каждый блок с зонами роста: 1-2 предложения с конкретной рекомендацией
- Если комментарий консультанта содержит детали — учти их в рекомендации
- В конце: общий вывод (2-3 предложения) с позитивным тоном и вектором развития
- Объём: не более 300 слов
- Формат: простой текст без markdown-разметки

ДАННЫЕ АУДИТА:
Тип: ${audit.type}
Дилерский центр: ${audit.dealership}
Город: ${audit.city}
Дата: ${new Date(audit.updated).toLocaleDateString('ru')}
Заполнено: ${filled}/${total} пунктов
Общий результат: ${overallScore}%

ЗОНЫ РОСТА ПО БЛОКАМ:
${sheetBlocks.length > 0 ? sheetBlocks.join('\n\n') : 'Зон роста не выявлено — все пункты выполнены.'}`

  return prompt
}
