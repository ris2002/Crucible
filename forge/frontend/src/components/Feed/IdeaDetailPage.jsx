import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import SparkButton from './SparkButton'
import CommentSection from '../Comments/CommentSection'
import { Avatar } from './IdeaCard'

const REPORT_REASONS = ['spam', 'misinformation', 'harassment', 'off-topic', 'other']

function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function IdeaDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [idea, setIdea] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDetail, setReportDetail] = useState('')
  const [reportSent, setReportSent] = useState(false)

  async function handleReport() {
    await api.reportIdea(id, reportReason, reportDetail)
    setReportSent(true)
    setShowReport(false)
  }

  useEffect(() => {
    api.getIdea(id)
      .then(setIdea)
      .catch(() => setIdea(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Loading<span className="loading-dots" /></div>
  if (!idea) return (
    <div className="page">
      <div className="empty-state">
        <h3>Idea not found</h3>
        <p><Link to="/">Back to feed</Link></p>
      </div>
    </div>
  )

  return (
    <div className="idea-detail">
      {idea.built_on && (
        <div className="built-on-banner">
          Built on{' '}
          <Link to={`/idea/${idea.built_on.id}`}>"{idea.built_on.title}"</Link>
          {' '}by{' '}
          <Link to={`/profile/${idea.built_on.author_username}`}>{idea.built_on.author_username}</Link>
        </div>
      )}

      <div className="idea-detail-header">
        <div className="idea-meta" style={{ marginBottom: 12 }}>
          <span className="idea-domain-badge">{idea.domain}</span>
          <span className="idea-genre-badge">{idea.genre}</span>
        </div>

        <h1 className="idea-detail-title">{idea.title}</h1>
        <p className="idea-detail-summary">{idea.summary}</p>

        {idea.tags?.length > 0 && (
          <div className="idea-tags">
            {idea.tags.map(tag => <span key={tag} className="idea-tag">#{tag}</span>)}
          </div>
        )}

        <div className="idea-detail-meta">
          <div className="idea-author">
            <Avatar username={idea.author_username} />
            <div>
              <Link to={`/profile/${idea.author_username}`} className="idea-author-name">
                {idea.author_username}
              </Link>
              <div className="idea-timestamp">{timeAgo(idea.created_at)}</div>
            </div>
          </div>

          <div className="idea-actions">
            <SparkButton
              ideaId={idea.id}
              initialCount={idea.spark_count}
              initialSparked={idea.user_has_sparked}
            />
            <button
              className="build-btn"
              onClick={() => {
                if (!user) { navigate('/login'); return }
                navigate(`/forge?build_on=${idea.id}`)
              }}
            >
              Build on this
            </button>
            {user && !reportSent && (
              <button
                className="btn-ghost"
                style={{ fontSize: '0.8rem', color: 'var(--light-gray)' }}
                onClick={() => setShowReport(v => !v)}
              >
                Report
              </button>
            )}
            {reportSent && <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Reported</span>}
          </div>

          {showReport && (
            <div style={{ marginTop: 12, padding: '16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 10 }}>Report this post</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {REPORT_REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setReportReason(r)}
                    style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
                      border: `1px solid ${reportReason === r ? 'var(--orange)' : 'var(--border)'}`,
                      background: reportReason === r ? 'var(--orange-light)' : 'transparent',
                      color: reportReason === r ? 'var(--orange)' : 'var(--gray)',
                    }}
                  >{r}</button>
                ))}
              </div>
              <input
                className="form-input"
                style={{ marginBottom: 10, fontSize: '0.8rem' }}
                placeholder="Add detail (optional)"
                value={reportDetail}
                onChange={e => setReportDetail(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" style={{ background: '#C00', color: '#fff', border: 'none' }} onClick={handleReport}>Submit report</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReport(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CommentSection ideaId={id} />
    </div>
  )
}
