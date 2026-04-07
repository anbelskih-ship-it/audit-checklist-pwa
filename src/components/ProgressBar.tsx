interface Props {
  filled: number
  total: number
}

export default function ProgressBar({ filled, total }: Props) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  const color = pct >= 80 ? '#4caf50' : pct >= 50 ? '#ff9800' : '#f44336'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e0e0e0', borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, color: '#666', minWidth: 36 }}>{pct}%</span>
    </div>
  )
}
