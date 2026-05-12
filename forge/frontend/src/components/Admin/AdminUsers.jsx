import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../lib/adminApi'

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}

function UserDetail({ userId, onClose }) {
  const [data, setData] = useState(null)
  const [credits, setCredits] = useState('')
  const [tier, setTier] = useState('')
  const [confirmSoft, setConfirmSoft] = useState(false)
  const [hardConfirm, setHardConfirm] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    adminApi.getUserDetail(userId).then(d => {
      setData(d)
      setCredits(d.profile.credits_remaining)
      setTier(d.profile.tier)
    }).catch(console.error)
  }, [userId])

  if (!data) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--white)', padding: 40, borderRadius: 'var(--radius-card)' }}>Loading...</div>
    </div>
  )

  const p = data.profile

  async function action(fn, successMsg) {
    try { await fn(); setMsg(successMsg) } catch (e) { setMsg('Error: ' + e.message) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
      <div style={{ background: 'var(--white)', width: '55%', height: '100vh', overflowY: 'auto', padding: 32, borderLeft: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <strong style={{ fontSize: '1rem' }}>{p.username}</strong>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>

        {msg && <div className="success-msg mb-2">{msg}</div>}

        <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 20, lineHeight: 2 }}>
          <div><strong>Email:</strong> {p.email || '—'}</div>
          <div><strong>Tier:</strong> {p.tier} {p.banned && <span style={{ color: '#C00' }}>· BANNED</span>}</div>
          <div><strong>Credits:</strong> {p.credits_remaining}</div>
          <div><strong>Sessions:</strong> {data.sessions_count}</div>
          <div><strong>Joined:</strong> {new Date(p.created_at).toLocaleDateString()}</div>
          {p.bio && <div><strong>Bio:</strong> {p.bio}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 4 }}>Adjust credits</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={credits} onChange={e => setCredits(e.target.value)} style={{ width: 80, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }} />
              <button className="btn btn-secondary btn-sm" onClick={() => action(() => adminApi.adjustCredits(p.id, parseInt(credits)), 'Credits updated')}>Save</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 4 }}>Change tier</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={tier} onChange={e => setTier(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }}>
                {['free', 'thinker', 'scholar', 'admin'].map(t => <option key={t}>{t}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => action(() => adminApi.changeTier(p.id, tier), 'Tier updated')}>Save</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {p.banned ? (
            <button className="btn btn-secondary btn-sm" onClick={() => action(() => adminApi.unbanUser(p.id), 'User unbanned')}>Unban</button>
          ) : (
            <>
              {!confirmSoft ? (
                <button className="btn btn-sm" style={{ background: '#FFF0F0', color: '#C00', border: '1px solid #FFD0D0' }} onClick={() => setConfirmSoft(true)}>Soft delete</button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#C00' }}>Ban + hide all content?</span>
                  <button className="btn btn-sm" style={{ background: '#C00', color: '#fff', border: 'none' }} onClick={() => { action(() => adminApi.softDeleteUser(p.id), 'User soft deleted'); setConfirmSoft(false) }}>Confirm</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setConfirmSoft(false)}>Cancel</button>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', color: '#C00', fontWeight: 600, marginBottom: 8 }}>Hard delete (irreversible)</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder={`type "${p.username}" to confirm`} value={hardConfirm} onChange={e => setHardConfirm(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #FFD0D0', borderRadius: 6, fontSize: '0.8rem', width: 200 }} />
            <button className="btn btn-sm" style={{ background: '#C00', color: '#fff', border: 'none' }} disabled={hardConfirm !== p.username} onClick={() => action(() => adminApi.hardDeleteUser(p.id, hardConfirm), 'User permanently deleted')}>Delete permanently</button>
          </div>
        </div>

        {data.ideas.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Ideas ({data.ideas.length})</div>
            {data.ideas.map(idea => (
              <div key={idea.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
                <div style={{ fontSize: '0.8rem', flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{idea.title}</div>
                  <div style={{ color: 'var(--gray)' }}>{idea.status} · {new Date(idea.created_at).toLocaleDateString()}</div>
                </div>
                {idea.status === 'published' && (
                  <button className="btn btn-sm" style={{ background: '#FFF0F0', color: '#C00', border: '1px solid #FFD0D0', flexShrink: 0 }} onClick={() => action(() => adminApi.deleteUserIdea(p.id, idea.id), 'Removed from feed')}>Remove</button>
                )}
              </div>
            ))}
          </div>
        )}

        {data.transactions.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Credit history</div>
            {data.transactions.map(t => (
              <div key={t.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', color: 'var(--gray)' }}>
                <span>{t.description || t.type}</span>
                <span style={{ fontWeight: 600, color: t.amount > 0 ? '#276749' : '#C00' }}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    adminApi.listUsers(search).then(d => setUsers(d.users || [])).catch(console.error).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [])

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>Users</h2>

      {selectedUser && <UserDetail userId={selectedUser} onClose={() => { setSelectedUser(null); load() }} />}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input className="form-input" style={{ maxWidth: 320 }} placeholder="Search username or email..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <button className="btn btn-secondary btn-sm" onClick={load}>Search</button>
      </div>

      {loading ? <div style={{ color: 'var(--gray)' }}>Loading...</div> : (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                {['Username', 'Email', 'Tier', 'Credits', 'Ideas', 'Joined', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} onClick={() => setSelectedUser(u.id)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-light)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{u.username}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--gray)' }}>{u.email || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{u.tier}</td>
                  <td style={{ padding: '10px 12px' }}>{u.credits_remaining}</td>
                  <td style={{ padding: '10px 12px' }}>{u.ideas_count}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--gray)' }}>{timeAgo(u.created_at)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {u.banned ? <span style={{ color: '#C00', fontWeight: 600 }}>Banned</span> : <span style={{ color: '#276749' }}>Active</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div style={{ padding: 20, color: 'var(--gray)', fontSize: '0.875rem' }}>No users found.</div>}
        </div>
      )}
    </div>
  )
}
