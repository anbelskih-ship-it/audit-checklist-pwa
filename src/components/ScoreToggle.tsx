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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Да
      </button>
      <button
        className={`score-btn score-btn--no ${value === 0 ? 'active' : ''}`}
        onClick={() => onChange(0)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Нет
      </button>
    </div>
  )
}
