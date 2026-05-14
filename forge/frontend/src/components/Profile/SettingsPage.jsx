import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCredits } from '../../hooks/useCredits'
import { usePurchases } from '../../hooks/usePurchases'
import { api } from '../../lib/api'

const TIERS = [
  { id: 'free', name: 'Free', price: '£0', sessions: '3 lifetime', turns: '5 turns/session', note: 'Enough to experience Crucible' },
  { id: 'thinker', name: 'Thinker', price: '£4/month', sessions: '10/month', turns: '8 turns/session', note: 'Unused credits roll over (max 20)' },
  { id: 'scholar', name: 'Scholar', price: '£9/month', sessions: '25/month', turns: '8 turns/session', note: 'Unused credits roll over (max 50)' },
]

export default function SettingsPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const { credits, tier, refresh: refreshCredits } = useCredits()
  const { upgrades_enabled: upgradesEnabled } = usePurchases()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [subscribing, setSubscribing] = useState('')

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (profile) setBio(profile.bio || '')
  }, [profile])

  useEffect(() => {
    const sub = searchParams.get('subscription')
    if (sub === 'success') {
      api.syncSubscription().then(() => {
        refreshCredits()
        refreshProfile()
      }).catch(() => {
        refreshCredits()
        refreshProfile()
      })
    }
  }, [searchParams])

  async function handleSaveBio(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    try {
      await api.updateProfile(bio)
      setSaveMsg('Profile updated')
      refreshProfile()
    } catch (e) {
      setSaveMsg('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubscribe(tierName) {
    setSubscribing(tierName)
    try {
      const data = await api.subscribe(tierName)
      window.location.href = data.checkout_url
    } catch (e) {
      alert('Error: ' + e.message)
      setSubscribing('')
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel your subscription? Your tier drops to free immediately but all your banked credits stay.')) return
    try {
      await api.cancelSubscription()
      alert('Subscription will cancel at end of billing period.')
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  if (authLoading) return <div className="loading">Loading<span className="loading-dots" /></div>

  return (
    <div className="page">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      <div className="settings-section">
        <h3>Profile</h3>
        <form onSubmit={handleSaveBio}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Username</label>
            <div style={{ fontSize: '0.9rem', color: 'var(--gray)', padding: '10px 0' }}>{profile?.username}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Bio <span style={{ color: 'var(--light-gray)', fontWeight: 400 }}>({160 - bio.length} chars remaining)</span></label>
            <textarea
              className="form-textarea"
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 160))}
              placeholder="A short bio — what do you think about?"
              rows={3}
            />
          </div>
          <button className="btn btn-secondary btn-sm" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save bio'}
          </button>
          {saveMsg && <span style={{ marginLeft: 12, fontSize: '0.875rem', color: 'var(--gray)' }}>{saveMsg}</span>}
        </form>
      </div>

      <div className="settings-section">
        <h3>Credits &amp; Tier</h3>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--orange)' }}>
            ✦ {credits} credit{credits !== 1 ? 's' : ''} remaining
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray)', marginTop: 4 }}>
            Current tier: <strong>{profile?.tier || 'free'}</strong>
          </div>
        </div>

        {TIERS.map(t => (
          <div key={t.id} className={`tier-card ${(profile?.tier || 'free') === t.id ? 'current' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="tier-name">{t.name}</div>
                <div className="tier-price">{t.price} · {t.sessions} · {t.turns}</div>
                <div className="tier-features">{t.note}</div>
              </div>
              <div>
                {(profile?.tier || 'free') === t.id ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--orange)', fontWeight: 600 }}>Current</span>
                ) : t.id !== 'free' && t.id !== 'admin' && upgradesEnabled ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSubscribe(t.id)}
                    disabled={subscribing === t.id}
                  >
                    {subscribing === t.id ? 'Redirecting...' : 'Upgrade'}
                  </button>
                ) : t.id !== 'free' && t.id !== 'admin' && !upgradesEnabled ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--light-gray)' }}>Unavailable</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {(profile?.tier === 'thinker' || profile?.tier === 'scholar') && (
          <button className="btn btn-ghost" onClick={handleCancel} style={{ marginTop: 12, color: 'var(--gray)' }}>
            Cancel subscription
          </button>
        )}
      </div>
    </div>
  )
}
