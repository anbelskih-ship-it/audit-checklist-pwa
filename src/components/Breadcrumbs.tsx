interface Props {
  parts: string[]
  counter?: string
}

export default function Breadcrumbs({ parts, counter }: Props) {
  return (
    <div className="breadcrumbs">
      <span className="breadcrumbs-path">{parts.join(' > ')}</span>
      {counter && <span className="breadcrumbs-counter">{counter}</span>}
    </div>
  )
}
