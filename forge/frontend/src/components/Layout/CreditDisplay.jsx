import { useCredits } from '../../hooks/useCredits'
import { Link } from 'react-router-dom'

export default function CreditDisplay() {
  const { credits, loading } = useCredits()

  if (loading) return null

  return (
    <Link to="/settings" title="View credits and upgrade">
      <span className="credit-badge">✦ {credits} credit{credits !== 1 ? 's' : ''}</span>
    </Link>
  )
}
