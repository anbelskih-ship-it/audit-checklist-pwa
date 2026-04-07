interface Props {
  parts: string[]
  counter?: string
}

export default function Breadcrumbs({ parts, counter }: Props) {
  return (
    <div style={{ fontSize: 12, color: '#888', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
      <span>{parts.join(' > ')}</span>
      {counter && <span style={{ fontWeight: 500 }}>{counter}</span>}
    </div>
  )
}
