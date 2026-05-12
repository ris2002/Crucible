import { useState, useCallback, useEffect } from 'react'
import { api } from '../lib/api'

const STORAGE_KEY = 'forge_active_session_id'

export function useForge() {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [forgeReady, setForgeReady] = useState(false)
  const [draft, setDraft] = useState(null)
  const [warning, setWarning] = useState(false)
  const [error, setError] = useState(null)

  const loadSession = useCallback(async (sessionId) => {
    setLoading(true)
    try {
      const data = await api.getSession(sessionId)
      setSession({ ...data, session_id: data.id })
      setMessages(data.messages || [])
      if (data.draft_title) {
        setForgeReady(true)
        setDraft({ title: data.draft_title, summary: data.draft_summary, tags: data.draft_tags || [] })
      }
      localStorage.setItem(STORAGE_KEY, sessionId)
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY)
    if (savedId && !session) {
      loadSession(savedId)
    }
  }, [])

  const startSession = useCallback(async (domain, genre, builtOnIdeaId = null) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.startForge(domain, genre, builtOnIdeaId)
      setSession(data)
      setMessages([])
      setForgeReady(false)
      setDraft(null)
      setWarning(false)
      localStorage.setItem(STORAGE_KEY, data.session_id)
      return data
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (text) => {
    if (!session) return
    setSending(true)
    setError(null)

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    try {
      const data = await api.sendMessage(session.session_id, text)

      const assistantMsg = { role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, assistantMsg])

      setSession(prev => ({ ...prev, turns_used: data.turns_used, max_turns: data.max_turns }))

      if (data.forge_ready) {
        setForgeReady(true)
        setDraft({ title: data.draft_title, summary: data.draft_summary, tags: data.draft_tags })
        setWarning(false)
      } else if (data.warning) {
        setWarning(true)
      }

      return data
    } catch (e) {
      setMessages(prev => prev.filter(m => m !== userMsg))
      setError(e.message)
      throw e
    } finally {
      setSending(false)
    }
  }, [session])

  const postIdea = useCallback(async (title, summary, tags) => {
    if (!session) return
    const data = await api.postIdea(session.session_id, title, summary, tags)
    localStorage.removeItem(STORAGE_KEY)
    return data
  }, [session])

  const saveDraft = useCallback(async () => {
    if (!session) return
    await api.saveDraft(session.session_id)
  }, [session])

  const resetSession = useCallback(() => {
    setSession(null)
    setMessages([])
    setForgeReady(false)
    setDraft(null)
    setWarning(false)
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    session,
    messages,
    loading,
    sending,
    forgeReady,
    draft,
    setDraft,
    warning,
    error,
    startSession,
    sendMessage,
    loadSession,
    postIdea,
    saveDraft,
    resetSession,
  }
}
