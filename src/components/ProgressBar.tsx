interface Props {
  filled: number
  total: number
}

export default function ProgressBar({ filled, total }: Props) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  const color = pct >= 80 ? '#4caf50' : pct >= 50 ? '#ff9800' : '#f44336'

  return (
    <div className="progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="progress-label">{pct}%</span>
    </div>
  )
}
