interface Props {
  filled: number
  total: number
}

export default function ProgressBar({ filled, total }: Props) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  const color = pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'

  return (
    <div className="progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="progress-label">{pct}%</span>
    </div>
  )
}
