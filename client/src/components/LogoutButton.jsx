import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

/** Small outline button — ends the session and returns to /login. */
export default function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <button type="button" className="btn btn-outline" onClick={handleLogout}>
      Log out
    </button>
  )
}
