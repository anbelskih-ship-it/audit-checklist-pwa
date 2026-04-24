import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Audit, ChecklistStructure } from '../types'
import { buildPdfReportData } from './pdf-report-data'
import ysGeoRegular from '../assets/fonts/ys-geo-regular.ttf'
import ysGeoBold from '../assets/fonts/ys-geo-bold.ttf'

Font.register({
  family: 'YS Geo',
  fonts: [
    { src: ysGeoRegular, fontWeight: 400 },
    { src: ysGeoBold, fontWeight: 700 },
  ],
})

const colors = {
  ink: '#1f2937',
  muted: '#667085',
  soft: '#98a2b3',
  border: '#d0d5dd',
  surface: '#f8fafc',
  surfaceAlt: '#eef4ff',
  primary: '#2979FF',
  primarySoft: '#eaf2ff',
  warning: '#f59e0b',
  warningSoft: '#fff7e8',
  danger: '#d92d20',
  dangerSoft: '#fff0ee',
}

export const PDF_PAGINATION_GUARDS = {
  sheetMinPresenceAhead: 72,
  issueGroupMinPresenceAhead: 28,
} as const

export const PDF_LAYOUT_TOKENS = {
  heroPadding: 16,
  heroMarginBottom: 14,
  heroTitleMarginBottom: 8,
  metaItemMarginBottom: 6,
  metricsRowMarginBottom: 14,
  metricCardPadding: 12,
  metricLabelMarginBottom: 4,
  summaryPadding: 14,
  summaryMarginBottom: 14,
  sectionLeadMarginBottom: 10,
  sheetCardPadding: 14,
  sheetCardMarginBottom: 14,
  sheetHeaderMarginBottom: 10,
  issueGroupMarginBottom: 8,
  issueItemPadding: 9,
  issueItemMarginBottom: 6,
} as const

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 34,
    paddingBottom: 42,
    fontSize: 10,
    fontFamily: 'YS Geo',
    color: colors.ink,
    backgroundColor: '#ffffff',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 18,
    right: 34,
    fontSize: 9,
    color: colors.soft,
  },
  hero: {
    marginBottom: PDF_LAYOUT_TOKENS.heroMarginBottom,
    padding: PDF_LAYOUT_TOKENS.heroPadding,
    borderRadius: 14,
    backgroundColor: colors.surface,
    border: `1 solid ${colors.border}`,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: PDF_LAYOUT_TOKENS.heroTitleMarginBottom,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 4,
  },
  metaItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: PDF_LAYOUT_TOKENS.metaItemMarginBottom,
  },
  metaLabel: {
    fontSize: 8,
    color: colors.soft,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 9.5,
    color: colors.ink,
  },
  metricsRow: {
    flexDirection: 'row',
    marginHorizontal: -5,
    marginBottom: PDF_LAYOUT_TOKENS.metricsRowMarginBottom,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: PDF_LAYOUT_TOKENS.metricCardPadding,
    borderRadius: 14,
    border: `1 solid ${colors.border}`,
    backgroundColor: colors.surface,
  },
  metricCardPrimary: {
    backgroundColor: colors.primarySoft,
    border: `1 solid ${colors.primary}`,
  },
  metricCardWarning: {
    backgroundColor: colors.warningSoft,
    border: `1 solid ${colors.warning}`,
  },
  metricValue: {
    fontSize: 21,
    fontWeight: 700,
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: PDF_LAYOUT_TOKENS.metricLabelMarginBottom,
  },
  metricHint: {
    fontSize: 7.5,
    color: colors.soft,
    lineHeight: 1.35,
  },
  summaryBox: {
    marginBottom: PDF_LAYOUT_TOKENS.summaryMarginBottom,
    padding: PDF_LAYOUT_TOKENS.summaryPadding,
    borderRadius: 14,
    border: `1 solid ${colors.primary}`,
    backgroundColor: colors.surfaceAlt,
  },
  summaryHeader: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    color: colors.primary,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: colors.ink,
  },
  sectionLead: {
    marginBottom: PDF_LAYOUT_TOKENS.sectionLeadMarginBottom,
    fontSize: 8.5,
    lineHeight: 1.45,
    color: colors.muted,
  },
  sheetCard: {
    marginBottom: PDF_LAYOUT_TOKENS.sheetCardMarginBottom,
    padding: PDF_LAYOUT_TOKENS.sheetCardPadding,
    borderRadius: 14,
    border: `1 solid ${colors.border}`,
    backgroundColor: '#ffffff',
  },
  sheetHeader: {
    marginBottom: PDF_LAYOUT_TOKENS.sheetHeaderMarginBottom,
    paddingBottom: 8,
    borderBottom: `1 solid ${colors.border}`,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 3,
  },
  sheetMeta: {
    fontSize: 8.5,
    color: colors.muted,
    lineHeight: 1.4,
  },
  issueGroup: {
    marginBottom: PDF_LAYOUT_TOKENS.issueGroupMarginBottom,
    paddingTop: 2,
  },
  issueGroupTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: colors.ink,
    marginBottom: 5,
  },
  issueItem: {
    marginBottom: PDF_LAYOUT_TOKENS.issueItemMarginBottom,
    padding: PDF_LAYOUT_TOKENS.issueItemPadding,
    paddingLeft: 11,
    borderRadius: 10,
    borderLeft: `3 solid ${colors.danger}`,
    backgroundColor: '#fff5f3',
  },
  issueText: {
    fontSize: 9.5,
    lineHeight: 1.4,
    color: colors.ink,
    marginBottom: 3,
  },
  issueCommentLabel: {
    fontSize: 7.5,
    color: colors.soft,
    marginBottom: 1,
    textTransform: 'uppercase',
  },
  issueComment: {
    fontSize: 8.5,
    lineHeight: 1.35,
    color: colors.muted,
  },
})

interface Props {
  structure: ChecklistStructure
  audit: Audit
}

export function AuditPdfReport({ structure, audit }: Props) {
  const report = buildPdfReportData(structure, audit)

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.hero}>
          <Text style={styles.title}>{report.title}</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Тип аудита</Text>
              <Text style={styles.metaValue}>{report.meta.type}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Статус</Text>
              <Text style={styles.metaValue}>{report.meta.status}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Дилерский центр</Text>
              <Text style={styles.metaValue}>{report.meta.dealership}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Город</Text>
              <Text style={styles.metaValue}>{report.meta.city}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Обновлено</Text>
              <Text style={styles.metaValue}>{report.meta.updatedLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Ответственный</Text>
              <Text style={styles.metaValue}>{report.meta.authorName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardPrimary]}>
            <Text style={styles.metricValue}>{report.metrics.scorePct}%</Text>
            <Text style={styles.metricLabel}>Результат аудита</Text>
            <Text style={styles.metricHint}>Доля положительных ответов среди заполненных пунктов</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{report.metrics.filled}/{report.metrics.total}</Text>
            <Text style={styles.metricLabel}>Заполнено</Text>
            <Text style={styles.metricHint}>{report.metrics.completionPct}% общего покрытия чек-листа</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardWarning]}>
            <Text style={styles.metricValue}>{report.metrics.issueCount}</Text>
            <Text style={styles.metricLabel}>Зон роста</Text>
            <Text style={styles.metricHint}>Пункты с оценкой «0», требующие дальнейшей проработки</Text>
          </View>
        </View>

        {report.summary && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryHeader}>Аналитическая выжимка</Text>
            <Text style={styles.summaryText}>{report.summary}</Text>
          </View>
        )}

        <Text style={styles.sectionLead}>
          Ниже приведена детальная часть отчёта: проблемные пункты сгруппированы по чек-листам и секциям, чтобы их можно было быстро использовать в рабочем разборе и формировании плана действий.
        </Text>

        {report.sheets.map(sheet => (
          <View key={sheet.id} style={styles.sheetCard} minPresenceAhead={PDF_PAGINATION_GUARDS.sheetMinPresenceAhead}>
            <View style={styles.sheetHeader} wrap={false}>
              <Text style={styles.sheetTitle}>{sheet.name}</Text>
              <Text style={styles.sheetMeta}>
                Заполнено: {sheet.metrics.filled}/{sheet.metrics.total}
                {'  '}•{'  '}
                Результат: {sheet.metrics.scorePct ?? 0}%
                {'  '}•{'  '}
                Зон роста: {sheet.metrics.issueCount}
                {sheet.estimatedTime ? `  •  Тайминг: ${sheet.estimatedTime}` : ''}
              </Text>
            </View>

            {sheet.issuesBySection.map(group => (
              <View
                key={`${sheet.id}-${group.sectionName}`}
                style={styles.issueGroup}
                minPresenceAhead={PDF_PAGINATION_GUARDS.issueGroupMinPresenceAhead}
              >
                <Text style={styles.issueGroupTitle}>{group.sectionName}</Text>
                {group.issues.map((issue, index) => (
                  <View key={`${sheet.id}-${group.sectionName}-${index}`} style={styles.issueItem}>
                    <Text style={styles.issueText}>{issue.text}</Text>
                    {issue.comment ? (
                      <>
                        <Text style={styles.issueCommentLabel}>Комментарий консультанта</Text>
                        <Text style={styles.issueComment}>{issue.comment}</Text>
                      </>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
