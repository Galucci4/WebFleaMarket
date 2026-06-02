import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

const STRATHMORE_EMAIL_REGEX = /^[^\s@]+@strathmore\.edu$/i

// Admin accounts are set manually in Firestore — never selectable here.
const ROLE_OPTIONS = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'vendor', label: 'Vendor' }
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('buyer')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!STRATHMORE_EMAIL_REGEX.test(email)) {
      setError('Only Strathmore email addresses are permitted')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await register(name, email, password, role)
      navigate('/login', {
        state: { message: 'Account created. You can now log in.' }
      })
    } catch (err) {
      setError(err.message || 'Failed to register')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>SU Flea Market</h1>
      <h2>Create an account</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="register-name">Full Name</label>
        <input
          id="register-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label htmlFor="register-email">Strathmore Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@strathmore.edu"
          required
        />
        <small>Only Strathmore University email addresses are accepted</small>

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <label htmlFor="register-confirm-password">Confirm Password</label>
        <input
          id="register-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={6}
          required
        />

        <fieldset>
          <legend>I want to join as</legend>
          <div className="role-buttons">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={role === option.value ? 'selected' : ''}
                aria-pressed={role === option.value}
                onClick={() => setRole(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
