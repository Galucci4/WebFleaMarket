import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { roleHome } from '../components/ProtectedRoute.jsx'

const STRATHMORE_EMAIL_REGEX = /^[^\s@]+@strathmore\.edu$/i

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Success message passed from RegisterPage after sign-up.
  const successMessage = location.state?.message

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!STRATHMORE_EMAIL_REGEX.test(email)) {
      setError('Only Strathmore email addresses are permitted')
      return
    }

    setSubmitting(true)
    try {
      const profile = await login(email, password)
      navigate(roleHome(profile.role), { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to log in')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>SU Flea Market</h1>
      <h2>Log in</h2>

      {successMessage && <p className="success" role="status">{successMessage}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">Strathmore Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@strathmore.edu"
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p>
        No account yet? <Link to="/register">Register</Link>
      </p>
    </div>
  )
}
