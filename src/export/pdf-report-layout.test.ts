import { describe, expect, it } from 'vitest'
import { buildPdfIssueBlocks } from './pdf-report-layout'

describe('buildPdfIssueBlocks', () => {
  it('keeps short issues as a single full block', () => {
    const blocks = buildPdfIssueBlocks({
      text: 'Есть сценарий поиска кандидатов',
      comment: 'Нет единого сценария',
    })

    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      text: 'Есть сценарий поиска кандидатов',
      comment: 'Нет единого сценария',
      isContinuation: false,
      density: 'normal',
    })
  })

  it('splits long comments into continuation blocks with compact density', () => {
    const comment = [
      'Первый длинный абзац с деталями процесса, пробелами в регламентах и отсутствием явного SLA для подготовки автомобиля.',
      'Второй длинный абзац с уточнением по ролям, точкам контроля и разрыву между диагностикой, постановкой задач и фактическим завершением работ.',
      'Третий длинный абзац с последствиями для клиента, цикла сделки и операционной эффективности команды.',
    ].join(' ')

    const blocks = buildPdfIssueBlocks({
      text: 'Диагностика представлена в формате: дефекты - рекомендации - срочность работ - калькуляция',
      comment,
    })

    expect(blocks.length).toBeGreaterThan(1)
    expect(blocks[0]).toMatchObject({
      isContinuation: false,
      density: 'compact',
    })
    expect(blocks[1]).toMatchObject({
      text: 'Продолжение комментария',
      isContinuation: true,
      density: 'compact',
    })
    expect(blocks.map((block) => block.comment).join(' ')).toContain('операционной эффективности команды')
  })
})
