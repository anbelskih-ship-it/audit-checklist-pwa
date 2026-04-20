import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { updateAuditMeta } from '../db/audits'

export default function AuditSettingsPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const navigate = useNavigate()
  const { audit, loading } = useAudit(auditId!)
  const [dealership, setDealership] = useState('')
  const [city, setCity] = useState('')
  const [plannedEnd, setPlannedEnd] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!audit) return
    setDealership(audit.dealership)
    setCity(audit.city)
    setPlannedEnd(audit.plannedEnd)
    setComment(audit.comment)
  }, [audit])

  if (loading) return <div className="page center-content text-disabled">Загрузка...</div>
  if (!audit) return <div className="page center-content text-disabled">Аудит не найден</div>

  const handleSave = async () => {
    if (!dealership.trim()) return
    setSaving(true)
    await updateAuditMeta(audit.id, {
      dealership: dealership.trim(),
      city: city.trim(),
      plannedEnd,
      comment: comment.trim(),
    })
    setSaving(false)
    navigate(`/audit/${audit.id}`)
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(`/audit/${audit.id}`)}>← Назад</button>
        <h1 className="admin-title">Параметры аудита</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="new-audit-form audit-settings-form">
        <div className="form-group">
          <label className="form-label">Дилерский центр *</label>
          <input value={dealership} onChange={e => setDealership(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Город</label>
          <input value={city} onChange={e => setCity(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Плановая дата окончания</label>
          <input type="date" value={plannedEnd} onChange={e => setPlannedEnd(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Комментарий</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className="textarea-sm"
          />
        </div>

        <div className="btn-group">
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving || !dealership.trim()}>
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </button>
          <button className="flex-1" onClick={() => navigate(`/audit/${audit.id}`)}>Отмена</button>
        </div>
      </div>
    </div>
  )
}
