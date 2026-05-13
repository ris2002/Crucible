import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCredits } from '../../hooks/useCredits'
import { useForge } from '../../hooks/useForge'
import { api } from '../../lib/api'
import ForgeBanner from './ForgeBanner'
import ForgeChat from './ForgeChat'

const DOMAINS = [
  'Technology', 'Science & Nature', 'Society & Culture', 'Philosophy & Ethics',
  'Business & Economy', 'Arts & Creativity', 'Politics & Power', 'Education & Learning',
  'Health & Mind', 'Environment & Future', 'Sports & Games', 'History & Civilisation',
]

const GENRES = ['Problem', 'Solution', 'Observation', 'Question', 'Prediction', 'Contradiction', 'Concept', 'Challenge']

const GENRE_DESCRIPTIONS = {
  Problem: 'Something is broken — the Forge diagnoses root cause',
  Solution: 'A fix — the Forge stress-tests feasibility',
  Observation: 'Something you noticed — the Forge asks what it implies',
  Question: 'Something you cannot figure out — the Forge probes it',
  Prediction: 'What happens next — the Forge demands evidence',
  Contradiction: "Something that doesn't add up — the Forge verifies it",
  Concept: 'A new way to think — the Forge tests its usefulness',
  Challenge: 'Conventional wisdom questioned — the Forge plays devil\'s advocate',
}

export default function ForgePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { credits, loading: creditsLoading } = useCredits()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const forge = useForge()

  const [domain, setDomain] = useState(DOMAINS[0])
  const [genre, setGenre] = useState(GENRES[0])
  const [sessionStarted, setSessionStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')

  const builtOnId = searchParams.get('build_on')
  const resumeSessionId = searchParams.get('session_id')
  const extended = searchParams.get('extended') === 'true'

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading])

  useEffect(() => {
    if (resumeSessionId && user) {
      forge.loadSession(resumeSessionId).then(() => setSessionStarted(true))
    }
  }, [resumeSessionId, user])

  useEffect(() => {
    if (extended && resumeSessionId) {
      const checkoutId = searchParams.get('checkout_id')
      api.syncTurns(resumeSessionId, checkoutId).catch(() => {}).finally(() => {
        forge.loadSession(resumeSessionId).then(() => setSessionStarted(true))
      })
    }
  }, [extended])

  async function handleStart() {
    if (!domain || !genre) return
    setStartError('')
    setStarting(true)
    try {
      await forge.startSession(domain, genre, builtOnId || null)
      setSessionStarted(true)
    } catch (e) {
      if (e.message.includes('No credits')) {
        setStartError('You have no credits remaining. Upgrade to continue forging.')
      } else {
        setStartError(e.message)
      }
    } finally {
      setStarting(false)
    }
  }

  if (authLoading || creditsLoading) return <div className="loading">Loading<span className="loading-dots" /></div>
  if (!user) return null

  if (profile?.tier === 'admin') {
    return (
      <div className="forge-page">
        <ForgeBanner />
        <div className="upgrade-prompt">
          <h3>Crucible is for users</h3>
          <p>Admin accounts cannot use the Crucible. Use the Seed Generator in the admin panel to post ideas.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/admin')}>Go to admin panel</button>
        </div>
      </div>
    )
  }

  if (credits === 0 && !sessionStarted) {
    return (
      <div className="forge-page">
        <ForgeBanner />
        <div className="upgrade-prompt">
          <h3>No credits remaining</h3>
          <p>You've used all your free sessions. Upgrade to keep forging.</p>
          <button className="btn btn-primary" onClick={() => navigate('/settings')}>
            View upgrade options
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="forge-page">
      {!sessionStarted ? (
        <>
          <ForgeBanner />

          {builtOnId && (
            <div className="built-on-banner" style={{ marginBottom: 20 }}>
              Building on an existing idea. The Crucible will frame questions around the original idea.
            </div>
          )}

          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '24px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>
              Choose your domain and genre
            </h2>

            <div className="domain-genre-selector">
              <div className="form-group">
                <label className="form-label">Domain</label>
                <select
                  className="form-select"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                >
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Genre</label>
                <select
                  className="form-select"
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                >
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {genre && (
              <p style={{ fontSize: '0.875rem', color: 'var(--gray)', marginTop: 8, fontStyle: 'italic' }}>
                {GENRE_DESCRIPTIONS[genre]}
              </p>
            )}

            {startError && <div className="error-msg mt-2">{startError}</div>}

            <div style={{ marginTop: 20 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? 'Starting...' : 'Start forging →'}
              </button>
              <p style={{ fontSize: '0.78rem', color: 'var(--light-gray)', marginTop: 8 }}>
                This uses 1 credit only when you post. Drafts and abandoned sessions are free.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <span className="idea-domain-badge">{forge.session?.domain}</span>
            <span className="idea-genre-badge">{forge.session?.genre}</span>
            <button
              className="btn-ghost"
              style={{ marginLeft: 'auto', fontSize: '0.8rem' }}
              onClick={() => { forge.resetSession(); setSessionStarted(false) }}
            >
              ← Start over
            </button>
          </div>
          <ForgeChat session={forge.session} />
        </div>
      )}
    </div>
  )
}
