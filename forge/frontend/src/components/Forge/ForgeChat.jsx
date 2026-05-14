import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForge } from '../../hooks/useForge'
import { usePurchases } from '../../hooks/usePurchases'
import { api } from '../../lib/api'
import TurnIndicator from './TurnIndicator'
import TurnWarning from './TurnWarning'

export default function ForgeChat({ session: initialSession, onComplete }) {
  const navigate = useNavigate()
  const forge = useForge()
  const [input, setInput] = useState(() => sessionStorage.getItem('crucible_input') || '')
  const [extending, setExtending] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (initialSession) {
      forge.loadSession(initialSession.session_id || initialSession.id)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [forge.messages])

  async function handleSend(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || forge.sending) return
    setInput('')
    sessionStorage.removeItem('crucible_input')
    try {
      await forge.sendMessage(text)
      inputRef.current?.focus()
    } catch (e) {
      console.error(e)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleExtend() {
    setExtending(true)
    try {
      const data = await api.extendSession(forge.session.session_id)
      window.location.href = data.checkout_url
    } catch (e) {
      setExtending(false)
      alert('Extension failed: ' + e.message)
    }
  }

  async function handleSaveDraft() {
    try {
      await forge.saveDraft()
      navigate('/drafts')
    } catch (e) {
      alert('Save failed: ' + e.message)
    }
  }

  async function handleConclude() {
    if (!forge.session) return
    try {
      await forge.sendMessage('Please help me conclude and synthesise the idea now.')
    } catch (e) {
      console.error(e)
    }
  }

  async function handlePost() {
    if (!forge.draft) return
    setPosting(true)
    setPostError('')
    try {
      const data = await forge.postIdea(forge.draft.title, forge.draft.summary, forge.draft.tags)
      navigate(`/idea/${data.idea_id}`)
    } catch (e) {
      setPostError(e.message)
      setPosting(false)
    }
  }

  const { purchases_enabled: purchasesEnabled } = usePurchases()
  const { session, messages, sending, forgeReady, draft, setDraft, warning, error } = forge
  const turnLimitReached = !forgeReady && session && (session.turns_used || 0) >= (session.max_turns || 5)

  if (!session) return null

  return (
    <div className="forge-chat">
      <TurnIndicator turnsUsed={session.turns_used || 0} maxTurns={session.max_turns || 5} />

      <div className="chat-messages">
        {messages.map((msg, i) => {
          const isStreamingPlaceholder = sending && i === messages.length - 1 && msg.role === 'assistant' && !msg.content
          if (isStreamingPlaceholder) return (
            <div key={i} className="chat-message assistant">
              <div className="avatar avatar-sm" style={{ background: '#C46000', flexShrink: 0 }}>✦</div>
              <div className="chat-bubble" style={{ color: 'var(--light-gray)' }}>
                Thinking<span className="loading-dots" />
              </div>
            </div>
          )
          if (!msg.content) return null
          return (
            <div key={i} className={`chat-message ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="avatar avatar-sm" style={{ background: '#C46000', flexShrink: 0 }}>
                  ✦
                </div>
              )}
              <div className="chat-bubble">
                {msg.content
                  .replace(/\*\*/g, '')
                  .replace(/\*/g, '')
                  .replace(/\n{3,}/g, '\n\n')
                  .split('\n\n')
                  .filter(p => p.trim())
                  .map((para, j) => (
                    <p key={j} style={{ margin: j === 0 ? 0 : '10px 0 0 0' }}>{para.trim()}</p>
                  ))}
                {sending && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span className="streaming-cursor" />
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="error-msg mb-2">{error}</div>}

      {forgeReady && draft ? (
        <div className="forge-ready">
          <h3>✦ Your idea is ready to post</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 16 }}>
            Edit any words before posting. These are your words — the Crucible just distilled them.
          </p>

          <div className="draft-field">
            <label>Title</label>
            <input
              value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
              placeholder="Your idea title..."
            />
          </div>

          <div className="draft-field">
            <label>Summary (3 sentences)</label>
            <textarea
              value={draft.summary}
              onChange={e => setDraft({ ...draft, summary: e.target.value })}
              rows={4}
              placeholder="Your idea summary..."
            />
          </div>

          <div className="draft-field">
            <label>Tags (comma separated)</label>
            <input
              className="draft-tags-input"
              value={draft.tags?.join(', ') || ''}
              onChange={e => setDraft({ ...draft, tags: e.target.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) })}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          {postError && <div className="error-msg mb-2">{postError}</div>}

          <div className="forge-ready-actions">
            <button
              className="btn btn-primary"
              onClick={handlePost}
              disabled={posting || !draft.title || !draft.summary}
            >
              {posting ? 'Posting...' : 'Post to Feed — 1 credit'}
            </button>
            <button className="btn btn-secondary" onClick={handleSaveDraft}>
              Keep Refining — Save Draft
            </button>
          </div>
        </div>
      ) : !forgeReady && (
        <>
          {warning && !turnLimitReached && (
            <TurnWarning
              turnsUsed={session.turns_used}
              maxTurns={session.max_turns}
              onConclude={handleConclude}
              onExtend={handleExtend}
              onSaveDraft={handleSaveDraft}
              extending={extending}
            />
          )}
          {turnLimitReached && (
            <div className="turn-warning">
              <h3>Turn limit reached — {session.turns_used} of {session.max_turns}</h3>
              <p>
                You've used all your turns.
                {purchasesEnabled ? ' Extend for 4 more turns, or save your draft and come back later.' : ' Save your draft and come back later.'}
              </p>
              <div className="turn-warning-actions">
                {purchasesEnabled && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleExtend}
                    disabled={extending}
                  >
                    {extending ? 'Redirecting...' : 'Buy 4 more turns — £2'}
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft}>
                  Save Draft
                </button>
              </div>
            </div>
          )}
        <form className="chat-input-area" onSubmit={handleSend}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => { setInput(e.target.value); sessionStorage.setItem('crucible_input', e.target.value) }}
              onKeyDown={handleKeyDown}
              placeholder={messages.length === 0
                ? "Describe your idea, as rough as you like..."
                : "Your answer..."
              }
              disabled={sending || turnLimitReached}
              rows={2}
            />
            {input.split(/\s+/).filter(Boolean).length > 450 && (
              <span style={{ fontSize: '0.75rem', color: input.split(/\s+/).filter(Boolean).length > 500 ? 'var(--error)' : 'var(--gray)' }}>
                {input.split(/\s+/).filter(Boolean).length}/500 words
              </span>
            )}
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={sending || !input.trim() || input.split(/\s+/).filter(Boolean).length > 500 || turnLimitReached}
            style={{ flexShrink: 0 }}
          >
            {sending ? '...' : 'Send →'}
          </button>
        </form>
        </>
      )}
    </div>
  )
}
