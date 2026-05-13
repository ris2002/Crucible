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

    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }])

    try {
      const response = await api.streamMessage(session.session_id, text)

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Request failed' }))
        throw new Error(err.detail || 'Request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let data
          try { data = JSON.parse(line.slice(6)) } catch { continue }

          if (data.error) throw new Error(data.error)

          if (data.text) {
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: last.content + data.text }
              }
              return updated
            })
          }

          if (data.done) {
            setSession(prev => ({ ...prev, turns_used: data.turns_used, max_turns: data.max_turns }))
            if (data.forge_ready) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  const content = last.content.split('---CRUCIBLE_READY---')[0].trim()
                  updated[updated.length - 1] = { ...last, content }
                }
                return updated
              })
              setForgeReady(true)
              setDraft({ title: data.draft_title, summary: data.draft_summary, tags: data.draft_tags })
              setWarning(false)
            } else if (data.warning) {
              setWarning(true)
            }
          }
        }
      }
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev]
        if (updated[updated.length - 1]?.role === 'assistant') updated.pop()
        if (updated[updated.length - 1]?.role === 'user') updated.pop()
        return updated
      })
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
