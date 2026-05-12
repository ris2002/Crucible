import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import SparkButton from './SparkButton'

function getAvatarColor(username = '') {
  const colors = ['#C46000','#2E6B9E','#5B7E4B','#8B4F9E','#9E4B4B','#4B7E8B','#7E6B2E']
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function Avatar({ username, size = '' }) {
  const initials = (username || '?').slice(0, 2).toUpperCase()
  const color = getAvatarColor(username)
  return (
    <div className={`avatar ${size}`} style={{ background: color }}>
      {initials}
    </div>
  )
}

export { Avatar }

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

export default function IdeaCard({ idea }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  function handleBuildOnThis() {
    if (!user) {
      navigate('/login')
      return
    }
    navigate(`/forge?build_on=${idea.id}`)
  }

  return (
    <article className="idea-card">
      <div className="idea-meta">
        <span className="idea-domain-badge">{idea.domain}</span>
        <span className="idea-genre-badge">{idea.genre}</span>
      </div>

      <h2 className="idea-title">
        <Link to={`/idea/${idea.id}`}>{idea.title}</Link>
      </h2>

      <p className="idea-summary">{idea.summary}</p>

      {idea.tags?.length > 0 && (
        <div className="idea-tags">
          {idea.tags.map(tag => (
            <span key={tag} className="idea-tag">#{tag}</span>
          ))}
        </div>
      )}

      <div className="idea-footer">
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

          <Link to={`/idea/${idea.id}`} className="comment-count" title="Comments">
            ◯ {idea.comment_count}
          </Link>

          <button className="build-btn" onClick={handleBuildOnThis} title="Build on this idea">
            Build on this
          </button>
        </div>
      </div>
    </article>
  )
}
