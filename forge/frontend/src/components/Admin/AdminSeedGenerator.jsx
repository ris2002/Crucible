import { useState } from 'react'
import { adminApi } from '../../lib/adminApi'

const DOMAINS = ['Technology', 'Science & Nature', 'Society & Culture', 'Philosophy & Ethics', 'Business & Economy', 'Arts & Creativity', 'Politics & Power', 'Education & Learning', 'Health & Mind', 'Environment & Future', 'Sports & Games', 'History & Civilisation']
const GENRES = ['Problem', 'Solution', 'Observation', 'Question', 'Prediction', 'Contradiction', 'Concept', 'Challenge']
const SEED_ACCOUNTS = ['forge_team']

export default function AdminSeedGenerator() {
  const [domain, setDomain] = useState(DOMAINS[0])
  const [genre, setGenre] = useState(GENRES[0])
  const [hint, setHint] = useState('')
  const [postAs, setPostAs] = useState('forge_team')
  const [generating, setGenerating] = useState(false)
  const [posting, setPosting] = useState(false)
  const [idea, setIdea] = useState(null)
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setPosted(false)
    try {
      const data = await adminApi.generateSeed({ domain, genre, hint })
      setIdea({ ...data.idea, domain, genre })
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handlePost() {
    if (!idea) return
    setPosting(true)
    setError('')
    try {
      await adminApi.postSeedIdea({
        title: idea.title,
        summary: idea.summary,
        tags: idea.tags,
        domain: idea.domain,
        genre: idea.genre,
        post_as: postAs,
      })
      setPosted(true)
      setIdea(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>Seed Post Generator</h2>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Domain</label>
            <select className="form-select" value={domain} onChange={e => setDomain(e.target.value)}>
              {DOMAINS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Genre</label>
            <select className="form-select" value={genre} onChange={e => setGenre(e.target.value)}>
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Topic hint (optional)</label>
          <input className="form-input" value={hint} onChange={e => setHint(e.target.value)} placeholder="e.g. urban planning, cognitive bias, market failure..." />
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Post as</label>
          <select className="form-select" value={postAs} onChange={e => setPostAs(e.target.value)}>
            {SEED_ACCOUNTS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        {error && <div className="error-msg mb-2">{error}</div>}
        {posted && <div className="success-msg mb-2">Posted to feed successfully.</div>}

        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate idea'}
        </button>
      </div>

      {idea && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--orange)', borderRadius: 'var(--radius-card)', padding: 24 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--orange)', marginBottom: 16 }}>Generated — edit before posting</div>

          <div className="draft-field" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--gray)', fontWeight: 600 }}>Title</label>
            <input className="form-input" value={idea.title} onChange={e => setIdea({ ...idea, title: e.target.value })} />
          </div>

          <div className="draft-field" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--gray)', fontWeight: 600 }}>Summary</label>
            <textarea className="form-input" rows={5} value={idea.summary} onChange={e => setIdea({ ...idea, summary: e.target.value })} style={{ resize: 'vertical' }} />
          </div>

          <div className="draft-field" style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--gray)', fontWeight: 600 }}>Tags</label>
            <input className="form-input" value={idea.tags?.join(', ') || ''} onChange={e => setIdea({ ...idea, tags: e.target.value.split(',').map(t => t.trim()) })} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handlePost} disabled={posting || !idea.title || !idea.summary}>
              {posting ? 'Posting...' : `Post as ${postAs}`}
            </button>
            <button className="btn btn-secondary" onClick={handleGenerate} disabled={generating}>
              Regenerate
            </button>
            <button className="btn-ghost" onClick={() => setIdea(null)}>Discard</button>
          </div>
        </div>
      )}
    </div>
  )
}
