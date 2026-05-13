import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import IdeaCard from './IdeaCard'
import FilterBar from './FilterBar'

export default function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [domain, setDomain] = useState('')
  const [genre, setGenre] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [followingOnly, setFollowingOnly] = useState(false)
  const [username, setUsername] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadFeed()
  }, [domain, genre, sort, page, followingOnly, username, dateFrom, dateTo])

  async function loadFeed() {
    setLoading(true)
    try {
      const params = { sort, page }
      if (domain) params.domain = domain
      if (genre) params.genre = genre
      if (username) params.username = username
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (followingOnly && user) params.following = 'true'

      const data = await api.getFeed(params)
      setIdeas(data.ideas || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      console.error('Feed error:', e)
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(setter) {
    return (val) => {
      setter(val)
      setPage(1)
    }
  }

  return (
    <div className="page">
      <div className="feed-header">
        <h1 className="feed-title">The Feed</h1>
        {user && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/forge')}
          >
            ✦ Enter the Crucible
          </button>
        )}
      </div>

      {user && (
        <div className="feed-tabs">
          <button
            className={`feed-tab ${!followingOnly ? 'active' : ''}`}
            onClick={() => { setFollowingOnly(false); setPage(1) }}
          >
            All Ideas
          </button>
          <button
            className={`feed-tab ${followingOnly ? 'active' : ''}`}
            onClick={() => { setFollowingOnly(true); setPage(1) }}
          >
            People I Follow
          </button>
        </div>
      )}

      <FilterBar
        domain={domain}
        genre={genre}
        sort={sort}
        username={username}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDomainChange={handleFilterChange(setDomain)}
        onGenreChange={handleFilterChange(setGenre)}
        onSortChange={handleFilterChange(setSort)}
        onUsernameChange={handleFilterChange(setUsername)}
        onDateFromChange={handleFilterChange(setDateFrom)}
        onDateToChange={handleFilterChange(setDateTo)}
      />

      {loading ? (
        <div className="loading">Loading ideas<span className="loading-dots" /></div>
      ) : ideas.length === 0 ? (
        <div className="empty-state">
          <h3>No ideas yet</h3>
          <p>
            {followingOnly
              ? 'Follow some thinkers to see their ideas here.'
              : 'Be the first to enter the Crucible.'}
          </p>
        </div>
      ) : (
        <>
          {ideas.map(idea => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {page} of {totalPages} — {total} idea{total !== 1 ? 's' : ''}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
