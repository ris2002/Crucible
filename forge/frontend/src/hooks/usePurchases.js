import { useState, useEffect } from 'react'
import { api } from '../lib/api'

let _cache = null

export function usePurchases() {
  const [settings, setSettings] = useState(_cache ?? { purchases_enabled: true, upgrades_enabled: true })

  useEffect(() => {
    if (_cache !== null) return
    api.getPurchasesConfig()
      .then(data => { _cache = data; setSettings(data) })
      .catch(() => {})
  }, [])

  return settings
}
