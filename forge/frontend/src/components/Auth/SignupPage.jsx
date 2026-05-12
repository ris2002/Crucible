import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usernameTaken, setUsernameTaken] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username)

  useEffect(() => {
    if (!usernameValid) { setUsernameTaken(false); return }
    const timer = setTimeout(async () => {
      setCheckingUsername(true)
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      setUsernameTaken(!!data)
      setCheckingUsername(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [username, usernameValid])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!usernameValid) {
      setError('Username must be 3-20 characters, letters, numbers and underscores only')
      return
    }
    if (usernameTaken) {
      setError('That username is already taken')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, username)
      navigate('/')
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        setError('An account with this email already exists. Try signing in.')
      } else if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        setError('That username is already taken')
      } else {
        setError(msg || 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Join Forge</h1>
        <p className="auth-subtitle">A place for ideas that earn their place. No shortcuts.</p>

        {error && <div className="error-msg mb-2">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              placeholder="choose_a_username"
              required
              autoFocus
            />
            {username && !usernameValid && (
              <span style={{ fontSize: '0.78rem', color: 'var(--orange)' }}>
                3-20 chars, letters/numbers/underscores only
              </span>
            )}
            {usernameValid && checkingUsername && (
              <span style={{ fontSize: '0.78rem', color: 'var(--light-gray)' }}>Checking...</span>
            )}
            {usernameValid && !checkingUsername && usernameTaken && (
              <span style={{ fontSize: '0.78rem', color: '#C00' }}>Username already taken</span>
            )}
            {usernameValid && !checkingUsername && !usernameTaken && (
              <span style={{ fontSize: '0.78rem', color: '#276749' }}>Username available</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="at least 8 characters"
              required
            />
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading || usernameTaken || checkingUsername}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ fontSize: '0.78rem', color: 'var(--light-gray)', marginTop: '16px', lineHeight: '1.5' }}>
          You get 3 free Forge sessions. No credit card needed.
        </p>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
