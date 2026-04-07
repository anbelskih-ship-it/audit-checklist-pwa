interface Props {
  value: 0 | 1 | null
  onChange: (v: 0 | 1) => void
}

export default function ScoreToggle({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
      <button
        onClick={() => onChange(1)}
        style={{
          flex: 1, padding: 12, fontSize: 16, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: value === 1 ? '#4caf50' : '#e8e8e8',
          color: value === 1 ? '#fff' : '#333',
        }}
      >
        1 — Да
      </button>
      <button
        onClick={() => onChange(0)}
        style={{
          flex: 1, padding: 12, fontSize: 16, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: value === 0 ? '#f44336' : '#e8e8e8',
          color: value === 0 ? '#fff' : '#333',
        }}
      >
        0 — Нет
      </button>
    </div>
  )
}
