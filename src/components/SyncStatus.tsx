import { useOnline } from '../hooks/useOnline'

export default function SyncStatus() {
  const online = useOnline()
  return (
    <div className={`sync-badge ${online ? 'sync-badge--online' : 'sync-badge--offline'}`}>
      {online ? 'Онлайн' : 'Офлайн'}
    </div>
  )
}
