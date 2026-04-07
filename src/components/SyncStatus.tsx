import { useOnline } from '../hooks/useOnline'

export default function SyncStatus() {
  const online = useOnline()
  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, padding: '6px 12px', borderRadius: 20, fontSize: 12,
      background: online ? '#e8f5e9' : '#ffebee', color: online ? '#2e7d32' : '#c62828',
    }}>
      {online ? 'Онлайн' : 'Офлайн'}
    </div>
  )
}
