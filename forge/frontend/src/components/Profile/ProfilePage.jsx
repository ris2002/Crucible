import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import IdeaCard from '../Feed/IdeaCard'
import FollowButton from './FollowButton'
import { Avatar } from '../Feed/IdeaCard'

export default function ProfilePage() {
  const { username } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [ideasLoading, setIdeasLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    api.getProfile(username)
      .then(data => { setProfile(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [username])

  useEffect(() => {
    setIdeasLoading(true)
    api.getUserIdeas(username, page)
      .then(data => {
        setIdeas(data.ideas || [])
        setTotalPages(data.pages || 1)
      })
      .catch(console.error)
      .finally(() => setIdeasLoading(false))
  }, [username, page])

  if (loading) return <div className="loading">Loading<span className="loading-dots" /></div>
  if (!profile) return (
    <div className="page">
      <div className="empty-state"><h3>User not found</h3></div>
    </div>
  )

  const isSelf = user?.id === profile.id

  return (
    <div className="page">
      <div className="profile-header">
        <div className="profile-top">
          <div className="profile-identity">
            <Avatar username={profile.username} size="avatar-lg" />
            <div>
              <div className="profile-username">
                {profile.username}
                {profile.tier !== 'free' && (
                  <span className="tier-badge">{profile.tier}</span>
                )}
              </div>
              <div className="idea-timestamp">
                Member since {new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          {!isSelf && user && (
            <FollowButton
              username={profile.username}
              initialFollowing={profile.is_following}
              onToggle={(data) => setProfile(p => ({ ...p, is_following: data.is_following, follower_count: data.follower_count }))}
            />
          )}
          {isSelf && (
            <Link to="/settings" className="btn btn-secondary btn-sm">Edit profile</Link>
          )}
        </div>

        {profile.bio && <p className="profile-bio">{profile.bio}</p>}

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-value">{profile.idea_count}</span>
            <span className="profile-stat-label">Ideas</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{profile.follower_count}</span>
            <span className="profile-stat-label">Followers</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{profile.following_count}</span>
            <span className="profile-stat-label">Following</span>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
        Ideas by {profile.username}
      </h2>

      {ideasLoading ? (
        <div className="loading">Loading ideas<span className="loading-dots" /></div>
      ) : ideas.length === 0 ? (
        <div className="empty-state">
          <p>{isSelf ? "You haven't posted any ideas yet." : `${profile.username} hasn't posted yet.`}</p>
        </div>
      ) : (
        <>
          {ideas.map(idea => <IdeaCard key={idea.id} idea={idea} />)}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Previous
              </button>
              <span className="page-info">Page {page} of {totalPages}</span>
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
