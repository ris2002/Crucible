import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../lib/api'

export default function FollowButton({ username, initialFollowing = false, onToggle }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (!user) { navigate('/login'); return }
    if (loading) return
    setLoading(true)
    const prev = following
    setFollowing(!prev)
    try {
      const data = await api.followUser(username)
      setFollowing(data.is_following)
      onToggle?.(data)
    } catch {
      setFollowing(prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`follow-btn ${following ? 'following' : ''}`}
      onClick={handleToggle}
      disabled={loading}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
