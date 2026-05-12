import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { adminApi } from '../../lib/adminApi'
import AdminDashboard from './AdminDashboard'
import AdminFlagged from './AdminFlagged'
import AdminCosts from './AdminCosts'
import AdminSeedGenerator from './AdminSeedGenerator'
import AdminUsers from './AdminUsers'

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'flagged', label: 'Flagged Content' },
  { key: 'costs', label: 'API Costs' },
  { key: 'seed', label: 'Seed Generator' },
  { key: 'users', label: 'Users' },
]

export default function AdminPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('dashboard')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/'); return }
    adminApi.getDashboard()
      .then(() => setChecking(false))
      .catch(() => navigate('/'))
  }, [user, loading])

  if (loading || !user || checking) return null

  const sectionMap = {
    dashboard: <AdminDashboard />,
    flagged: <AdminFlagged />,
    costs: <AdminCosts />,
    seed: <AdminSeedGenerator />,
    users: <AdminUsers />,
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: 'var(--bg)' }}>
      <aside style={{
        width: 200, flexShrink: 0, background: 'var(--white)',
        borderRight: '1px solid var(--border)', padding: '24px 0',
      }}>
        <div style={{ padding: '0 20px 20px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--light-gray)', textTransform: 'uppercase' }}>
          Admin
        </div>
        {NAV.map(n => (
          <button
            key={n.key}
            onClick={() => setSection(n.key)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: section === n.key ? 600 : 400,
              background: section === n.key ? 'var(--orange-light)' : 'transparent',
              color: section === n.key ? 'var(--orange)' : 'var(--dark)',
              borderLeft: section === n.key ? '3px solid var(--orange)' : '3px solid transparent',
            }}
          >
            {n.label}
          </button>
        ))}
      </aside>

      <main style={{ flex: 1, padding: '32px', maxWidth: 1100, overflowX: 'hidden' }}>
        {sectionMap[section]}
      </main>
    </div>
  )
}
