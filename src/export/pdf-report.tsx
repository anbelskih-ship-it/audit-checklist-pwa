import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { calcMetrics } from '../utils/metrics'
import type { ChecklistStructure, Audit } from '../types'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 20, marginBottom: 8, fontWeight: 'bold' },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  summaryCard: { flex: 1, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4, textAlign: 'center' },
  summaryValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  summaryLabel: { fontSize: 8, color: '#888' },
  aiSummaryBox: { marginBottom: 20, padding: 12, backgroundColor: '#f0f7ff', borderRadius: 4, borderLeft: '3 solid #2979FF' },
  aiSummaryTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: '#2979FF' },
  aiSummaryText: { fontSize: 9, lineHeight: 1.5, color: '#333' },
  blockTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 16, marginBottom: 4 },
  progressText: { fontSize: 9, color: '#888', marginBottom: 8 },
  issueRow: { flexDirection: 'row', marginBottom: 4, paddingLeft: 8, borderLeft: '2 solid #f44336' },
  issueText: { fontSize: 9, flex: 1 },
  issueComment: { fontSize: 8, color: '#666', fontStyle: 'italic', paddingLeft: 8 },
  sectionLabel: { fontSize: 8, color: '#999', marginTop: 6, marginBottom: 2 },
})

interface Props {
  structure: ChecklistStructure
  audit: Audit
}

export function AuditPdfReport({ structure, audit }: Props) {
  const allEvalItems = structure.sheets.flatMap(sh => sh.sections.flatMap(s => s.items.slice(1)))
  const { filled: totalFilled, total: totalItems, yesCount: totalPassed } = calcMetrics(allEvalItems, audit.answers)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{audit.name}</Text>
        <Text style={styles.subtitle}>
          {audit.type} · {new Date(audit.updated).toLocaleDateString('ru')}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalFilled > 0 ? Math.round(totalPassed / totalFilled * 100) : 0}%</Text>
            <Text style={styles.summaryLabel}>Общий результат</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalFilled}/{totalItems}</Text>
            <Text style={styles.summaryLabel}>Заполнено</Text>
          </View>
          <View style={{ ...styles.summaryCard, backgroundColor: '#fff3e0' }}>
            <Text style={{ ...styles.summaryValue, color: '#f44336' }}>{totalFilled - totalPassed}</Text>
            <Text style={styles.summaryLabel}>Зон роста</Text>
          </View>
        </View>

        {audit.summary && (
          <View style={styles.aiSummaryBox}>
            <Text style={styles.aiSummaryTitle}>Резюме аудита</Text>
            <Text style={styles.aiSummaryText}>{audit.summary}</Text>
          </View>
        )}

        {structure.sheets.map(sheet => {
          const issues: { text: string; comment: string; section: string }[] = []
          const sheetEval = sheet.sections.flatMap(s => s.items.slice(1))
          const sm = calcMetrics(sheetEval, audit.answers)
          for (const sec of sheet.sections) {
            for (const item of sec.items.slice(1)) {
              const a = audit.answers[item.id]
              if (a?.value === 0) issues.push({ text: item.text, comment: a.comment, section: sec.name })
            }
          }

          if (issues.length === 0) return null

          return (
            <View key={sheet.id} wrap={false}>
              <Text style={styles.blockTitle}>{sheet.name}</Text>
              <Text style={styles.progressText}>{sm.yesCount}/{sm.total} выполнено · {issues.length} зон роста</Text>
              {issues.map((issue, i) => (
                <View key={i}>
                  {(i === 0 || issues[i - 1].section !== issue.section) && (
                    <Text style={styles.sectionLabel}>{issue.section}</Text>
                  )}
                  <View style={styles.issueRow}>
                    <Text style={styles.issueText}>{issue.text}</Text>
                  </View>
                  {issue.comment && <Text style={styles.issueComment}>{issue.comment}</Text>}
                </View>
              ))}
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
