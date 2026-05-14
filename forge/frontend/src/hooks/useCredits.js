import { useState, useEffect, useContext, createContext, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

const CreditsContext = createContext(null)

export function CreditsProvider({ children }) {
  const { user, profile } = useAuth()
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
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
  }, [user])

  useEffect(() => {
    if (user) refresh()
    else setCredits(null)
  }, [user])

  return (
    <CreditsContext.Provider value={{
      credits: credits?.credits_remaining ?? profile?.credits_remaining ?? 0,
      tier: credits?.tier ?? profile?.tier ?? 'free',
      loading,
      refresh,
      creditsData: credits,
    }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  return useContext(CreditsContext)
}
