import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import CreditDisplay from './CreditDisplay'

function NotifIndicator() {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    import('../../lib/api').then(({ api }) => {
      api.getNotifications().then(data => setUnread(data.unread_count || 0)).catch(() => {})
    })
  }, [user])

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      Notifications
      {unread > 0 && (
        <span style={{
          position: 'absolute',
          top: -6, right: -12,
          background: 'var(--orange)',
          color: '#fff',
          borderRadius: '50%',
          width: 16, height: 16,
          fontSize: '0.65rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
        }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </span>
  )
}

export default function Header() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path ? 'active' : ''

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <span className="spark-icon">✦</span>
          CRUCIBLE
        </Link>

        <nav className="header-nav">
          {user ? (
            <>
              <CreditDisplay />
              {profile?.tier !== 'admin' && (
                <Link to="/forge" className={`btn btn-primary btn-sm`}>
                  Enter the Crucible
                </Link>
              )}
              <Link to="/drafts" className={isActive('/drafts')}>Drafts</Link>
              <Link to="/notifications" className={isActive('/notifications')}>
                <NotifIndicator />
              </Link>
              {profile?.tier === 'admin' && (
                <Link to="/admin" className={isActive('/admin')} style={{ color: 'var(--orange)', fontWeight: 600 }}>Admin</Link>
              )}
              {profile?.username && (
                <Link to={`/profile/${profile.username}`} className={isActive(`/profile/${profile.username}`)}>
                  {profile.username}
                </Link>
              )}
              <button onClick={handleSignOut} className="btn-ghost">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')}>Sign in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Join Crucible</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
