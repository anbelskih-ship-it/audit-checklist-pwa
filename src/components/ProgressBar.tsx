interface Props {
  filled: number
  total: number
  hideLabel?: boolean
}

function tempColor(pct: number): string {
  // 0% = red, 50% = orange, 100% = green (temperature gradient)
  const r = pct < 50 ? 255 : Math.round(255 - (pct - 50) * 5.1)
  const g = pct < 50 ? Math.round(pct * 4.2) : Math.round(160 + (pct - 50) * 1.9)
  const b = pct < 50 ? 0 : 0
  return `rgb(${r},${g},${b})`
}

export default function ProgressBar({ filled, total, hideLabel }: Props) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0

  return (
    <div className="progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: tempColor(pct) }} />
      </div>
      {!hideLabel && <span className="progress-label">{pct}%</span>}
    </div>
  )
}
