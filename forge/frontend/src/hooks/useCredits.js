import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

export function useCredits() {
  const { user, profile } = useAuth()
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) refresh()
  }, [user])

  async function refresh() {
    if (!user) return
    setLoading(true)
    try {
      const data = await api.getCredits()
      setCredits(data)
    } catch (e) {
      console.error('Credits error:', e)
    } finally {
      setLoading(false)
    }
  }

  return {
    credits: credits?.credits_remaining ?? profile?.credits_remaining ?? 0,
    tier: credits?.tier ?? profile?.tier ?? 'free',
    loading,
    refresh,
    creditsData: credits,
  }
}
