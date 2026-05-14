import { useState, useEffect } from 'react'
import { adminApi } from '../../lib/adminApi'

function ToggleRow({ label, description, enabled, onToggle, saving }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '20px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <p style={{ fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--gray)', margin: '4px 0 0' }}>{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={saving}
        style={{
          flexShrink: 0, padding: '8px 18px', borderRadius: 6, border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem',
          background: enabled ? 'var(--error, #e53e3e)' : 'var(--orange)',
          color: '#fff', opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  )
}

export default function AdminSettings() {
  const [settings, setSettings] = useState({ purchases_enabled: true, upgrades_enabled: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminApi.getSettings()
      .then(data => setSettings(data))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(key) {
    setSaving(key)
    setSaved(false)
    try {
      const data = await adminApi.setSettings({ [key]: !settings[key] })
      setSettings(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving('')
    }
  }

  if (loading) return <p style={{ color: 'var(--gray)' }}>Loading...</p>

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>Settings</h2>
      <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: 24 }}>
        Changes take effect immediately for all users.
      </p>

      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '0 24px', maxWidth: 560,
      }}>
        <ToggleRow
          label="Tier Upgrades"
          description={settings.upgrades_enabled
            ? 'Free users can subscribe to Thinker or Scholar. Existing subscribers are unaffected if disabled.'
            : 'New subscriptions are blocked. Existing Thinker/Scholar users keep their tier and credits.'}
          enabled={settings.upgrades_enabled}
          onToggle={() => handleToggle('upgrades_enabled')}
          saving={saving === 'upgrades_enabled'}
        />
        <ToggleRow
          label="Turn Extensions"
          description={settings.purchases_enabled
            ? 'Users can buy 4 extra turns for £2 when their session runs out.'
            : 'Turn extension purchases are blocked. Existing sessions are unaffected.'}
          enabled={settings.purchases_enabled}
          onToggle={() => handleToggle('purchases_enabled')}
          saving={saving === 'purchases_enabled'}
        />
        {saved && (
          <p style={{ padding: '12px 0', fontSize: '0.85rem', color: 'var(--orange)', margin: 0 }}>
            ✓ Saved
          </p>
        )}
      </div>
    </div>
  )
}
