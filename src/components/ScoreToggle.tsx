interface Props {
  value: 0 | 1 | null
  onChange: (v: 0 | 1) => void
}

export default function ScoreToggle({ value, onChange }: Props) {
  return (
    <div className="score-toggle">
      <button
        className={`score-btn score-btn--yes ${value === 1 ? 'active' : ''}`}
        onClick={() => onChange(1)}
      >
        1 — Да
      </button>
      <button
        className={`score-btn score-btn--no ${value === 0 ? 'active' : ''}`}
        onClick={() => onChange(0)}
      >
        0 — Нет
      </button>
    </div>
  )
}
