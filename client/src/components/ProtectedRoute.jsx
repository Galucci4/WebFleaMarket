import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

/** Maps a role to its home route. */
export function roleHome(role) {
  switch (role) {
    case 'buyer':
      return '/buyer'
    case 'vendor':
      return '/vendor/dashboard'
    case 'administrator':
      return '/admin/dashboard'
    default:
      return '/login'
  }
}

/**
 * Wraps a route:
 * - not logged in            → redirect to /login
 * - role not in allowedRoles → redirect to their correct home
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) {
    return <p>Loading…</p>
  }

  if (!currentUser || !userProfile) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to={roleHome(userProfile.role)} replace />
  }

  return children
}
