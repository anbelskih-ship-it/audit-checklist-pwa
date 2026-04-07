import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './schema'
import { createAudit, getAudit, listAudits, saveAnswer, deleteAudit } from './audits'
import { saveStructure, getStructure } from './structures'

beforeEach(async () => {
  await db.audits.clear()
  await db.structures.clear()
})

describe('audits', () => {
  it('creates and retrieves an audit', async () => {
    const audit = await createAudit('Test', 'АСП', 'test@email.com', 'v1')
    const fetched = await getAudit(audit.id)
    expect(fetched?.name).toBe('Test')
    expect(fetched?.status).toBe('draft')
  })

  it('saves and retrieves answers', async () => {
    const audit = await createAudit('Test', 'АСП', 'test@email.com', 'v1')
    await saveAnswer(audit.id, '01.1.1', { value: 1, comment: '' })
    await saveAnswer(audit.id, '01.1.2', { value: 0, comment: 'Проблема' })
    const fetched = await getAudit(audit.id)
    expect(fetched?.answers['01.1.1'].value).toBe(1)
    expect(fetched?.answers['01.1.2'].comment).toBe('Проблема')
  })

  it('lists audits sorted by updated desc', async () => {
    await createAudit('First', 'АСП', 'a@b.com', 'v1')
    await createAudit('Second', 'НА', 'a@b.com', 'v1')
    const list = await listAudits()
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('Second')
  })

  it('deletes an audit', async () => {
    const audit = await createAudit('ToDelete', 'АСП', 'a@b.com', 'v1')
    await deleteAudit(audit.id)
    expect(await getAudit(audit.id)).toBeUndefined()
  })
})

describe('structures', () => {
  it('saves and retrieves structure', async () => {
    await saveStructure({ type: 'АСП', version: 'v1', driveFileId: 'f1', sheets: [] })
    const s = await getStructure('АСП')
    expect(s?.version).toBe('v1')
  })
})
