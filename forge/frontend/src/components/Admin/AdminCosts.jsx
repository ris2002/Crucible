import { useState, useEffect } from 'react'
import { adminApi } from '../../lib/adminApi'

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.cost), 0.0001)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, marginTop: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            width: '100%', background: d.cost > 0 ? 'var(--orange)' : 'var(--border)',
            height: `${(d.cost / max) * 70}px`, minHeight: d.cost > 0 ? 2 : 0,
            borderRadius: 2, transition: 'height 0.3s',
          }} title={`£${d.cost}`} />
          {i % 4 === 0 && <div style={{ fontSize: '0.6rem', color: 'var(--light-gray)', transform: 'rotate(-45deg)' }}>{d.hour}</div>}
        </div>
      ))}
    </div>
  )
}

function CapBar({ percent }) {
  const color = percent >= 90 ? '#C00' : percent >= 70 ? '#E6A817' : '#276749'
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(percent, 100)}%`, background: color, height: '100%', transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '0.75rem', color, marginTop: 4 }}>{percent}% of cap used since last top-up</div>
    </div>
  )
}

export default function AdminCosts() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  function load() {
    adminApi.getCosts().then(setData).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleReset() {
    if (!window.confirm('Reset cost counter? Do this after topping up your Anthropic balance.')) return
    setResetting(true)
    try {
      await adminApi.resetCosts()
      await adminApi.getCosts().then(setData)
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--gray)' }}>Loading...</div>
  if (!data) return <div style={{ color: '#C00' }}>Failed to load</div>

  const alertColor = data.cap_percent >= 90 ? '#C00' : data.cap_percent >= 70 ? '#E6A817' : '#276749'
  const resetDate = data.cost_reset_at
    ? new Date(data.cost_reset_at).toLocaleString()
    : 'Never reset'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>API Cost Monitor</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray)', margin: '4px 0 0' }}>
            Last reset: {resetDate}
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          style={{
            padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--white)', cursor: resetting ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem', fontWeight: 600, color: 'var(--dark)',
            opacity: resetting ? 0.6 : 1,
          }}
        >
          {resetting ? 'Resetting...' : '↺ Reset Counter'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 20 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 6 }}>Spend today</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>£{data.spend_today_gbp}</div>
        </div>
        <div style={{ background: 'var(--white)', border: `1px solid ${alertColor}`, borderRadius: 'var(--radius-card)', padding: 20 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 6 }}>Spend since last top-up</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: alertColor }}>£{data.spend_since_reset_gbp}</div>
          <CapBar percent={data.cap_percent} />
        </div>
      </div>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>Hourly spend today</div>
        <div style={{ display: 'flex', gap: 24, fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 8 }}>
          <span>Sessions: {data.sessions_today}</span>
          <span>Avg tokens/session: {data.avg_tokens_per_session.toLocaleString()}</span>
        </div>
        <BarChart data={data.hourly} />
      </div>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 20 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12 }}>Top 10 sessions today by cost</div>
        {data.top_sessions.length === 0 ? (
          <div style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>No sessions today.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['User', 'Input tokens', 'Output tokens', 'Cost'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--gray)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.top_sessions.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}>{s.username}</td>
                  <td style={{ padding: '8px' }}>{s.input_tokens.toLocaleString()}</td>
                  <td style={{ padding: '8px' }}>{s.output_tokens.toLocaleString()}</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>£{s.cost_gbp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
