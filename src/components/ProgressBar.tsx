import { tempColor } from '../utils/colors'

interface Props {
  filled: number
  total: number
  hideLabel?: boolean
}

export default function ProgressBar({ filled, total, hideLabel }: Props) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((filled / total) * 100))) : 0

  return (
    <div className="progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: tempColor(pct) }} />
      </div>
      {!hideLabel && <span className="progress-label">{pct}%</span>}
    </div>
  )
}
