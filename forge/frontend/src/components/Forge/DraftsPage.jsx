import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../lib/api'

function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function DraftsPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    api.getDrafts()
      .then(data => setDrafts(data.drafts || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="loading">Loading drafts<span className="loading-dots" /></div>

  return (
    <div className="page">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24 }}>Saved Drafts</h1>

      {drafts.length === 0 ? (
        <div className="empty-state">
          <h3>No drafts yet</h3>
          <p>Start a Crucible session and save it as a draft to continue later.</p>
          <button className="btn btn-primary mt-2" onClick={() => navigate('/forge')}>
            Enter the Crucible
          </button>
        </div>
      ) : (
        drafts.map(draft => (
          <div
            key={draft.id}
            className="draft-card"
            onClick={() => navigate(`/forge?session_id=${draft.id}`)}
          >
            <div className="draft-card-meta">
              <span className="idea-domain-badge">{draft.domain}</span>
              <span className="idea-genre-badge">{draft.genre}</span>
              <span className="idea-timestamp" style={{ marginLeft: 'auto' }}>
                {timeAgo(draft.updated_at || draft.created_at)}
              </span>
            </div>
            {draft.draft_title ? (
              <div className="draft-card-title">{draft.draft_title}</div>
            ) : (
              <div className="draft-card-preview">
                {draft.messages?.length > 0
                  ? `${draft.messages.length} turn${draft.messages.length !== 1 ? 's' : ''} — continue forging`
                  : 'Not started yet'}
              </div>
            )}
            <div className="draft-card-preview">
              {draft.draft_summary
                ? draft.draft_summary.slice(0, 100) + (draft.draft_summary.length > 100 ? '...' : '')
                : `Turn ${draft.turns_used || 0} — tap to continue`}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
