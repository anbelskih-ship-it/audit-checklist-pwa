import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAudits, createAudit } from '../db/audits'
import { getStructure } from '../db/structures'
import type { Audit } from '../types'
import ProgressBar from '../components/ProgressBar'

export default function AuditListPage() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'АСП' | 'НА'>('АСП')
  const navigate = useNavigate()

  useEffect(() => {
    listAudits().then(setAudits)
  }, [])

  const countProgress = (audit: Audit) => {
    const answers = Object.values(audit.answers)
    const filled = answers.filter(a => a.value !== null).length
    const total = answers.length
    return { filled, total: Math.max(total, 1) }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    const structure = await getStructure(newType)
    const version = structure?.version || 'unknown'
    const audit = await createAudit(newName.trim(), newType, 'local', version)
    navigate(`/audit/${audit.id}`)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 20 }}>Аудиты</h1>

      {audits.map(a => {
        const { filled, total } = countProgress(a)
        return (
          <div key={a.id} onClick={() => navigate(`/audit/${a.id}`)}
            style={{ padding: 12, borderBottom: '1px solid #eee', cursor: 'pointer' }}>
            <div style={{ fontWeight: 500 }}>{a.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {a.type} · {new Date(a.updated).toLocaleDateString('ru')} · {a.status === 'completed' ? 'Завершён' : 'Черновик'}
            </div>
            <ProgressBar filled={filled} total={total} />
          </div>
        )
      })}

      {!showNew ? (
        <button onClick={() => setShowNew(true)} style={{ marginTop: 16, padding: '12px 24px', fontSize: 16 }}>
          + Новый аудит
        </button>
      ) : (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <select value={newType} onChange={e => setNewType(e.target.value as 'АСП' | 'НА')} style={{ width: '100%', padding: 8, marginBottom: 8 }}>
            <option value="АСП">АСП (авто с пробегом)</option>
            <option value="НА">НА (новые авто)</option>
          </select>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Название аудита (напр. Башавтоком — июнь 2026)"
            style={{ width: '100%', padding: 8, marginBottom: 8 }} />
          <button onClick={handleCreate} style={{ padding: '8px 16px' }}>Создать</button>
          <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', marginLeft: 8 }}>Отмена</button>
        </div>
      )}
    </div>
  )
}
