import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppUser } from '../App'

type LifecycleStatus =
  | 'draft'
  | 'pending_connect'
  | 'connected'
  | 'active'
  | 'paused'
  | 'archived'

type HealthStatus =
  | 'not_configured'
  | 'waiting_access'
  | 'ready'
  | 'running'
  | 'warning'
  | 'error'

type FollowupProjectDraft = {
  id: string
  clientName: string
  planUrl: string
  transportTgChannel: string
  regularMeetingAt: string
  scheduleMode: 'priority_mode' | 'deadline_mode'
  lifecycleStatus: LifecycleStatus
  botHealth: HealthStatus
}

const lifecycleChain: LifecycleStatus[] = [
  'draft',
  'pending_connect',
  'connected',
  'active',
  'paused',
  'archived',
]

const healthRows = [
  { label: 'Конфигурация создана', value: 'green' },
  { label: 'Transport TG channel задан', value: 'green' },
  { label: 'Доступ бота подтвержден', value: 'red' },
  { label: 'Weekly-расписание активно', value: 'gray' },
  { label: 'Последний weekly-run', value: 'gray' },
  { label: 'Зеркалирование в MAX', value: 'gray' },
]

const initialProjects: FollowupProjectDraft[] = [
  {
    id: 'atlanticpro',
    clientName: 'АтлантикPRO',
    planUrl: 'https://docs.google.com/spreadsheets/d/atlanticpro/edit',
    transportTgChannel: '@atlanticpro_transport',
    regularMeetingAt: '2026-04-24T11:00',
    scheduleMode: 'priority_mode',
    lifecycleStatus: 'pending_connect',
    botHealth: 'waiting_access',
  },
]

function statusTone(value: string) {
  if (value === 'green' || value === 'ready' || value === 'active' || value === 'connected') return 'followup-pill--green'
  if (value === 'red' || value === 'error' || value === 'archived') return 'followup-pill--red'
  if (value === 'warning' || value === 'pending_connect' || value === 'paused') return 'followup-pill--amber'
  return 'followup-pill--gray'
}

export default function AdminFollowupBotsPage() {
  const appUser = useAppUser()
  const navigate = useNavigate()
  const [projects, setProjects] = useState(initialProjects)
  const [clientName, setClientName] = useState('')
  const [planUrl, setPlanUrl] = useState('')
  const [transportTgChannel, setTransportTgChannel] = useState('')
  const [regularMeetingAt, setRegularMeetingAt] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'priority_mode' | 'deadline_mode'>('priority_mode')

  if (appUser.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const canCreate =
    clientName.trim() &&
    planUrl.trim() &&
    transportTgChannel.trim() &&
    regularMeetingAt.trim()

  const handleCreate = () => {
    if (!canCreate) return
    setProjects(current => [
      {
        id: `project-${current.length + 1}`,
        clientName: clientName.trim(),
        planUrl: planUrl.trim(),
        transportTgChannel: transportTgChannel.trim(),
        regularMeetingAt,
        scheduleMode,
        lifecycleStatus: 'draft',
        botHealth: 'not_configured',
      },
      ...current,
    ])
    setClientName('')
    setPlanUrl('')
    setTransportTgChannel('')
    setRegularMeetingAt('')
    setScheduleMode('priority_mode')
  }

  const handleLifecycleChange = (projectId: string, nextStatus: LifecycleStatus) => {
    setProjects(current =>
      current.map(project => (
        project.id === projectId
          ? { ...project, lifecycleStatus: nextStatus }
          : project
      )),
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/')}>← Назад</button>
        <h1 className="admin-title">Follow-up бот</h1>
        <div style={{ width: 60 }} />
      </div>

      <div className="info-block">
        Черновой экран управления follow-up ботом. Здесь настраивается проект сопровождения, жизненный цикл и готовность транспортного канала.
      </div>

      {projects.map(project => (
        <div key={project.id} className="card card--static">
          <div className="flex-between gap-sm">
            <div>
              <div className="card-title">{project.clientName}</div>
              <div className="card-subtitle">{project.transportTgChannel} · {project.scheduleMode}</div>
            </div>
            <span className={`followup-pill ${statusTone(project.botHealth)}`}>{project.botHealth}</span>
          </div>

          <div className="followup-meta">
            <div><strong>ПД:</strong> {project.planUrl}</div>
            <div><strong>Регулярка:</strong> {project.regularMeetingAt}</div>
          </div>

          <div className="followup-section">
            <div className="fill-section-name">Lifecycle проекта</div>
            <div className="followup-chain">
              {lifecycleChain.map(status => (
                <button
                  key={status}
                  type="button"
                  className={`followup-pill ${project.lifecycleStatus === status ? 'followup-pill--active' : statusTone(status)}`}
                  onClick={() => handleLifecycleChange(project.id, status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="followup-section">
            <div className="fill-section-name">Bot health</div>
            <div className="followup-health-table">
              {healthRows.map(row => (
                <div key={row.label} className="followup-health-row">
                  <span>{row.label}</span>
                  <span className={`followup-pill ${statusTone(row.value)}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="new-audit-form mt-md">
        <div className="fill-section-name mb-sm">Новый проект сопровождения</div>

        <div className="form-group">
          <label className="form-label" htmlFor="followup-client">Клиент</label>
          <input id="followup-client" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Напр. Башавтоком" />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="followup-plan">Ссылка на план действий</label>
          <input id="followup-plan" value={planUrl} onChange={e => setPlanUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/..." />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="followup-transport">Telegram-канал</label>
          <input id="followup-transport" value={transportTgChannel} onChange={e => setTransportTgChannel(e.target.value)} placeholder="@client_transport" />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="followup-regular">Регулярка</label>
          <input id="followup-regular" type="datetime-local" value={regularMeetingAt} onChange={e => setRegularMeetingAt(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="followup-mode">Режим отбора</label>
          <select id="followup-mode" value={scheduleMode} onChange={e => setScheduleMode(e.target.value as 'priority_mode' | 'deadline_mode')}>
            <option value="priority_mode">priority_mode</option>
            <option value="deadline_mode">deadline_mode</option>
          </select>
        </div>

        <button className="btn-primary btn-full" onClick={handleCreate} disabled={!canCreate}>
          Создать проект
        </button>
      </div>
    </div>
  )
}
