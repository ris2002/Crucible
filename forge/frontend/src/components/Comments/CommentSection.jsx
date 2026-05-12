import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../Feed/IdeaCard'
import CommentForm from './CommentForm'

function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function CommentCard({ comment, ideaId, onReply }) {
  const { user } = useAuth()
  const [showReply, setShowReply] = useState(false)

  const author = comment.profiles || {}

  return (
    <div className="comment-card">
      <div className="comment-header">
        <Avatar username={author.username} size="avatar-sm" />
        <Link to={`/profile/${author.username}`} className="comment-author">
          {author.username}
        </Link>
        <span className="comment-time">{timeAgo(comment.created_at)}</span>
      </div>

      <div className="comment-content">{comment.content}</div>

      <div className="comment-actions">
        {user && !comment.parent_id && (
          <button className="reply-btn" onClick={() => setShowReply(!showReply)}>
            {showReply ? 'Cancel' : 'Reply'}
          </button>
        )}
        <button
          className="comment-spark"
          onClick={() => api.sparkIdea && null}
          title="Spark this comment"
        >
          ✦ {comment.spark_count || 0}
        </button>
        <button
          className="reply-btn"
          style={{ color: '#ccc' }}
          title="Report this comment"
          onClick={() => {
            if (window.confirm('Report this comment as abusive?')) {
              fetch(`/comments/${comment.id}/report`, { method: 'POST' })
            }
          }}
        >
          Report
        </button>
      </div>

      {showReply && (
        <div style={{ marginTop: 12 }}>
          <CommentForm
            ideaId={ideaId}
            parentId={comment.id}
            onSubmit={(c) => { onReply?.(c); setShowReply(false) }}
            onCancel={() => setShowReply(false)}
          />
        </div>
      )}

      {comment.replies?.length > 0 && (
        <div className="replies">
          {comment.replies.map(reply => (
            <div key={reply.id} className="comment-card" style={{ border: 'none', padding: '12px 0', boxShadow: 'none' }}>
              <div className="comment-header">
                <Avatar username={(reply.profiles || {}).username} size="avatar-sm" />
                <Link to={`/profile/${(reply.profiles || {}).username}`} className="comment-author">
                  {(reply.profiles || {}).username}
                </Link>
                <span className="comment-time">{timeAgo(reply.created_at)}</span>
              </div>
              <div className="comment-content">{reply.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ ideaId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadComments()
  }, [ideaId, page])

  async function loadComments() {
    setLoading(true)
    try {
      const data = await api.getComments(ideaId, page)
      setComments(data.comments || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleNewComment(comment) {
    setComments(prev => [...prev, { ...comment, replies: [] }])
  }

  function handleReply(parentId, reply) {
    setComments(prev => prev.map(c =>
      c.id === parentId ? { ...c, replies: [...(c.replies || []), reply] } : c
    ))
  }

  return (
    <div className="comments-section">
      <h2 className="comments-title">
        Comments ({comments.length})
      </h2>

      <CommentForm ideaId={ideaId} onSubmit={handleNewComment} />

      {loading ? (
        <div className="loading">Loading comments<span className="loading-dots" /></div>
      ) : comments.length === 0 ? (
        <div className="empty-state">
          <p>No comments yet. Be the first to add something substantive.</p>
        </div>
      ) : (
        comments.map(comment => (
          <CommentCard
            key={comment.id}
            comment={comment}
            ideaId={ideaId}
            onReply={(reply) => handleReply(comment.id, reply)}
          />
        ))
      )}
    </div>
  )
}
