import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

/**
 * Returns everything from AuthContext:
 * { currentUser, userProfile, loading, login(), register(), logout() }
 */
export default function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
