import type { PdfIssue } from './pdf-report-data'

export interface PdfIssueBlock {
  text: string
  comment: string
  isContinuation: boolean
  density: 'normal' | 'compact'
}

const COMPACT_THRESHOLD = 260
const COMMENT_CHUNK_SIZE = 180
const COMMENT_COMPACT_CHUNK_SIZE = 300

function splitLongText(value: string, maxLength: number): string[] {
  const text = value.trim()
  if (!text) return ['']
  if (text.length <= maxLength) return [text]

  const words = text.split(/\s+/)
  const parts: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (current && next.length > maxLength) {
      parts.push(current)
      current = word
      continue
    }
    current = next
  }

  if (current) parts.push(current)
  return parts
}

export function buildPdfIssueBlocks(issue: PdfIssue): PdfIssueBlock[] {
  const totalLength = issue.text.trim().length + issue.comment.trim().length
  const density = totalLength > COMPACT_THRESHOLD ? 'compact' : 'normal'
  const chunkSize = density === 'compact' ? COMMENT_COMPACT_CHUNK_SIZE : COMMENT_CHUNK_SIZE
  const commentChunks = splitLongText(issue.comment, chunkSize)

  return commentChunks.map((comment, index) => ({
    text: index === 0 ? issue.text : 'Продолжение комментария',
    comment,
    isContinuation: index > 0,
    density,
  }))
}
