import { useState, useEffect } from 'react'
import { adminApi } from '../../lib/adminApi'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ChatModal({ flagId, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    adminApi.getFlaggedSession(flagId).then(setData).catch(console.error)
  }, [flagId])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-card)', width: '90%', maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <strong>Crucible conversation</strong>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 20, flex: 1 }}>
          {!data ? <div>Loading...</div> : data.messages.length === 0 ? (
            <div style={{ color: 'var(--gray)' }}>No conversation found.</div>
          ) : data.messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: m.role === 'user' ? 'var(--dark)' : 'var(--orange)', textTransform: 'uppercase', marginBottom: 4 }}>
                {m.role === 'user' ? 'User' : 'Crucible AI'}
              </div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--dark)', background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfirmInline({ label, confirmLabel, danger = false, onConfirm, loading }) {
  const [open, setOpen] = useState(false)
  if (!open) return (
    <button
      className="btn btn-sm"
      style={danger
        ? { background: '#FFF0F0', color: '#C00', border: '1px solid #FFD0D0' }
        : { background: '#C00', color: '#fff', border: 'none' }}
      onClick={() => setOpen(true)}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF8F8', border: '1px solid #FFD0D0', borderRadius: 6, padding: '6px 10px' }}>
      <span style={{ fontSize: '0.78rem', color: '#C00' }}>Sure?</span>
      <button
        className="btn btn-sm"
        style={{ background: '#C00', color: '#fff', border: 'none', padding: '3px 10px' }}
        disabled={loading}
        onClick={() => { onConfirm(); setOpen(false) }}
      >
        {loading ? '...' : confirmLabel}
      </button>
      <button
        className="btn btn-sm"
        style={{ background: 'transparent', border: 'none', color: 'var(--gray)', padding: '3px 8px' }}
        onClick={() => setOpen(false)}
      >
        Cancel
      </button>
    </div>
  )
}

function FlagCard({ flag, onAction }) {
  const [showChat, setShowChat] = useState(false)
  const [acting, setActing] = useState('')
  const idea = flag.ideas || {}
  const reporter = flag.reporter

  async function doAction(type) {
    setActing(type)
    try { await onAction(type, flag.id) } finally { setActing('') }
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 20, marginBottom: 16 }}>
      {showChat && <ChatModal flagId={flag.id} onClose={() => setShowChat(false)} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <span className="idea-domain-badge">{idea.domain}</span>
        <span className="idea-genre-badge">{idea.genre}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--light-gray)' }}>{timeAgo(flag.created_at)}</span>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 6 }}>{idea.title}</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--gray)', marginBottom: 12, lineHeight: 1.6 }}>{idea.summary}</div>

      <div style={{ fontSize: '0.8rem', marginBottom: 14 }}>
        <span style={{ color: 'var(--gray)' }}>Author: </span>
        <strong>{(idea.profiles || {}).username || 'unknown'}</strong>
        <span style={{ color: 'var(--gray)', marginLeft: 16 }}>Reason: </span>
        <strong style={{ color: '#C46000' }}>{flag.reason}</strong>
        <span style={{ color: 'var(--gray)', marginLeft: 16 }}>Reported by: </span>
        <strong>{reporter ? reporter.username : 'Auto-detected'}</strong>
        {flag.reason_detail && <span style={{ color: 'var(--gray)', marginLeft: 8 }}>— {flag.reason_detail}</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowChat(true)}>View conversation</button>
        <button className="btn btn-secondary btn-sm" onClick={() => doAction('dismiss')} disabled={!!acting}>Dismiss</button>
        <ConfirmInline
          label="Delete post"
          confirmLabel="Yes, delete"
          danger
          loading={acting === 'delete'}
          onConfirm={() => doAction('delete')}
        />
        <ConfirmInline
          label="Ban user"
          confirmLabel="Yes, ban"
          loading={acting === 'ban'}
          onConfirm={() => doAction('ban')}
        />
      </div>
    </div>
  )
}

export default function AdminFlagged() {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    adminApi.getFlagged().then(d => setFlags(d.flagged || [])).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleAction(type, flagId) {
    if (type === 'dismiss') await adminApi.dismissFlag(flagId)
    if (type === 'delete') await adminApi.deleteFlaggedIdea(flagId)
    if (type === 'ban') await adminApi.banUserViaFlag(flagId)
    setFlags(prev => prev.filter(f => f.id !== flagId))
  }

  if (loading) return <div style={{ color: 'var(--gray)' }}>Loading...</div>

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>
        Flagged Content {flags.length > 0 && <span style={{ color: 'var(--orange)' }}>({flags.length})</span>}
      </h2>
      {flags.length === 0 ? (
        <div style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>No unreviewed flags.</div>
      ) : (
        flags.map(f => <FlagCard key={f.id} flag={f} onAction={handleAction} />)
      )}
    </div>
  )
}
