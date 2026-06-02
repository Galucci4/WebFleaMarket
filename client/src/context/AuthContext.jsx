import { createContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase.js'
import * as authService from '../services/authService.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)   // Firebase Auth user
  const [userProfile, setUserProfile] = useState(null)   // Firestore doc — role lives at userProfile.role
  const [loading, setLoading] = useState(true)

  // Restore the session on page load / token refresh.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser)

      if (!firebaseUser) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      try {
        const profile = await authService.fetchProfile()
        setUserProfile(profile)
      } catch {
        // Token invalid or profile missing — drop the session.
        await authService.logout().catch(() => {})
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const login = useCallback(async (email, password) => {
    const profile = await authService.login(email, password)
    setUserProfile(profile)
    return profile
  }, [])

  const register = useCallback(async (name, email, password, role) => {
    return authService.register(name, email, password, role)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUserProfile(null)
  }, [])

  const value = { currentUser, userProfile, loading, login, register, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
