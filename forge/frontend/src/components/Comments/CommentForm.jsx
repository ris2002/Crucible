import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../lib/api'

const MIN_WORDS = 50

export default function CommentForm({ ideaId, parentId = null, onSubmit, onCancel }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const ready = wordCount >= MIN_WORDS

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    if (!ready) return

    setLoading(true)
    setError('')
    try {
      const comment = await api.postComment(ideaId, content, parentId)
      setContent('')
      onSubmit?.(comment)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="comment-form-wrapper">
        <p style={{ fontSize: '0.875rem', color: 'var(--gray)', textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--orange)', fontWeight: 600 }}>Sign in</a> to leave a substantive comment (50 words minimum).
        </p>
      </div>
    )
  }

  return (
    <div className="comment-form-wrapper">
      <p className="comment-form-hint">
        Comments must be substantive — minimum 50 words. Be curious, not combative.
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          className="form-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write a substantive comment..."
          rows={5}
          disabled={loading}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div className={`word-counter ${ready ? 'ready' : 'short'}`}>
            {wordCount} / {MIN_WORDS} words {ready ? '✓' : 'minimum'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onCancel && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!ready || loading}
            >
              {loading ? 'Posting...' : 'Post comment'}
            </button>
          </div>
        </div>
        {error && <div className="error-msg mt-1">{error}</div>}
      </form>
    </div>
  )
}
