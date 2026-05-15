import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCredits } from '../../hooks/useCredits'
import { usePurchases } from '../../hooks/usePurchases'
import { api } from '../../lib/api'

const TIERS = [
  { id: 'free', name: 'Free', price: '£0', sessions: '3 lifetime', turns: '7 turns/session', note: 'Enough to experience Crucible' },
  { id: 'thinker', name: 'Thinker', price: '£4/month', sessions: '10/month', turns: '10 turns/session', note: 'Unused credits roll over (max 20)' },
  { id: 'scholar', name: 'Scholar', price: '£9/month', sessions: '25/month', turns: '12 turns/session', note: 'Unused credits roll over (max 50)' },
  { id: 'alchemist', name: 'Alchemist', price: '£7/month', sessions: '10/month', turns: 'Unlimited turns', note: 'Bring your own API key — choose Claude, ChatGPT, or Gemini. Your quota, your model.' },
]

const PROVIDERS = {
  anthropic: {
    label: 'Anthropic (Claude)',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com',
    models: [
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 — most powerful' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — balanced' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fast' },
    ],
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o — most capable' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini — fast & cheap' },
    ],
  },
  google: {
    label: 'Google (Gemini)',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — fast' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — powerful' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash — balanced' },
    ],
  },
}

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
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [hasKey, setHasKey] = useState(false)
  const [currentProvider, setCurrentProvider] = useState(null)
  const [currentModel, setCurrentModel] = useState(null)
  const [savingKey, setSavingKey] = useState(false)
  const [keyMsg, setKeyMsg] = useState('')

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (profile) setBio(profile.bio || '')
  }, [profile])

  useEffect(() => {
    if (tier === 'alchemist') {
      api.getApiKeyStatus().then(d => {
        setHasKey(d.has_key)
        if (d.provider) { setCurrentProvider(d.provider); setProvider(d.provider) }
        if (d.model) { setCurrentModel(d.model); setModel(d.model) }
      }).catch(() => {})
    }
  }, [tier])

  useEffect(() => {
    setModel(PROVIDERS[provider]?.models[0]?.id || '')
  }, [provider])

  async function handleSaveKey(e) {
    e.preventDefault()
    if (!apiKey.trim()) return
    setSavingKey(true)
    setKeyMsg('')
    try {
      await api.saveApiKey(apiKey.trim(), provider, model)
      setHasKey(true)
      setCurrentProvider(provider)
      setCurrentModel(model)
      setApiKey('')
      setKeyMsg('✓ Config saved')
    } catch (e) {
      setKeyMsg('Error: ' + e.message)
    } finally {
      setSavingKey(false)
    }
  }

  async function handleDeleteKey() {
    setSavingKey(true)
    try {
      await api.deleteApiKey()
      setHasKey(false)
      setCurrentProvider(null)
      setCurrentModel(null)
      setKeyMsg('Key removed')
    } catch (e) {
      setKeyMsg('Error: ' + e.message)
    } finally {
      setSavingKey(false)
    }
  }

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
    const msg = tier === 'alchemist'
      ? 'Cancel your subscription? Your tier drops to free, your stored API key will be permanently deleted, and your banked credits stay.'
      : 'Cancel your subscription? Your tier drops to free immediately but all your banked credits stay.'
    if (!window.confirm(msg)) return
    try {
      await api.cancelSubscription()
      if (tier === 'alchemist') setHasKey(false)
      alert('Subscription cancelled.')
      refreshProfile()
      refreshCredits()
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

        {(profile?.tier === 'thinker' || profile?.tier === 'scholar' || profile?.tier === 'alchemist') && (
          <button className="btn btn-ghost" onClick={handleCancel} style={{ marginTop: 12, color: 'var(--gray)' }}>
            Cancel subscription
          </button>
        )}
      </div>

      {tier === 'alchemist' && (
        <div className="settings-section">
          <h3>AI Model</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray)', marginBottom: 20 }}>
            Your sessions run on your own quota. Choose any provider and model — your key is stored securely and never exposed.
          </p>

          {hasKey && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.875rem', color: '#276749', fontWeight: 600 }}>✓ Active: </span>
                <span style={{ fontSize: '0.875rem' }}>
                  {PROVIDERS[currentProvider]?.label || currentProvider} — {
                    PROVIDERS[currentProvider]?.models.find(m => m.id === currentModel)?.label || currentModel
                  }
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleDeleteKey} disabled={savingKey}>
                {savingKey ? '...' : 'Remove'}
              </button>
            </div>
          )}

          <form onSubmit={handleSaveKey}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select className="form-select" value={provider} onChange={e => setProvider(e.target.value)}>
                  {Object.entries(PROVIDERS).map(([id, p]) => (
                    <option key={id} value={id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Model</label>
                <select className="form-select" value={model} onChange={e => setModel(e.target.value)}>
                  {PROVIDERS[provider]?.models.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">
                API Key
                <a href={PROVIDERS[provider]?.docsUrl} target="_blank" rel="noopener noreferrer"
                   style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--orange)', fontWeight: 400 }}>
                  Get key →
                </a>
              </label>
              <input
                type="password"
                className="form-input"
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={PROVIDERS[provider]?.placeholder}
                autoComplete="off"
              />
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={savingKey || !apiKey.trim()}>
              {savingKey ? 'Saving...' : hasKey ? 'Update config' : 'Save config'}
            </button>
          </form>

          {keyMsg && (
            <p style={{ fontSize: '0.875rem', marginTop: 12, color: keyMsg.startsWith('✓') ? '#276749' : '#C00' }}>
              {keyMsg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
