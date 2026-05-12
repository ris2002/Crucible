import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../lib/api'

function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function notificationText(n) {
  const actor = n.actor?.username || 'Someone'
  const ideaTitle = n.ideas?.title

  switch (n.type) {
    case 'spark':
      return { text: <><strong>{actor}</strong> sparked your idea{ideaTitle ? ` "${ideaTitle}"` : ''}</>, link: n.idea_id ? `/idea/${n.idea_id}` : null }
    case 'comment':
      return { text: <><strong>{actor}</strong> commented on{ideaTitle ? ` "${ideaTitle}"` : ' your idea'}</>, link: n.idea_id ? `/idea/${n.idea_id}` : null }
    case 'follow':
      return { text: <><strong>{actor}</strong> started following you</>, link: `/profile/${actor}` }
    case 'build':
      return { text: <><strong>{actor}</strong> built on your idea{ideaTitle ? ` "${ideaTitle}"` : ''}</>, link: n.idea_id ? `/idea/${n.idea_id}` : null }
    case 'new_idea_from_follow':
      return { text: <><strong>{actor}</strong> posted a new idea{ideaTitle ? `: "${ideaTitle}"` : ''}</>, link: n.idea_id ? `/idea/${n.idea_id}` : null }
    default:
      return { text: 'New notification', link: null }
  }
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    api.getNotifications()
      .then(data => {
        setNotifications(data.notifications || [])
        const unreadIds = (data.notifications || []).filter(n => !n.read).map(n => n.id)
        if (unreadIds.length) api.markNotificationsRead(unreadIds)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="loading">Loading<span className="loading-dots" /></div>

  return (
    <div className="page">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24 }}>Notifications</h1>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <h3>No notifications yet</h3>
          <p>When someone sparks your idea, comments, or follows you — it appears here.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
          {notifications.map(n => {
            const { text, link } = notificationText(n)
            const Wrapper = link ? Link : 'div'
            return (
              <Wrapper
                key={n.id}
                to={link}
                className={`notification-item ${!n.read ? 'unread' : ''}`}
              >
                {!n.read && <div className="unread-dot" />}
                <div className="notification-content">{text}</div>
                <div className="notification-time">{timeAgo(n.created_at)}</div>
              </Wrapper>
            )
          })}
        </div>
      )}
    </div>
  )
}
