import { useState, useEffect } from 'react'
import { adminApi } from '../../lib/adminApi'

function StatCard({ label, value, large, accent }) {
  return (
    <div style={{
      background: 'var(--white)', border: `1px solid ${accent ? 'var(--orange)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-card)', padding: '20px 24px',
    }}>
      <div style={{ fontSize: large ? '2rem' : '1.5rem', fontWeight: 700, color: accent ? 'var(--orange)' : 'var(--dark)' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: 'var(--gray)' }}>Loading...</div>
  if (!data) return <div style={{ color: '#C00' }}>Failed to load</div>

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard label="Unreviewed flags" value={data.flagged_count} large accent={data.flagged_count > 0} />
        <StatCard label="API spend today" value={`£${data.spend_today_gbp}`} large />
        <StatCard label="API spend this month" value={`£${data.spend_month_gbp}`} large />
        <StatCard label="Active users today" value={data.active_users_today} large />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Total users" value={data.total_users.toLocaleString()} />
        <StatCard label="New users today" value={data.new_users_today} />
        <StatCard label="Active subscriptions" value={data.active_subscriptions} />
        <StatCard label="Total ideas published" value={data.total_ideas.toLocaleString()} />
        <StatCard label="Ideas posted today" value={data.ideas_today} />
        <StatCard label="Crucible sessions today" value={data.sessions_today} />
      </div>
    </div>
  )
}
