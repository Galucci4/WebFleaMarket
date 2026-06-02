import axios from 'axios'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { auth } from '../config/firebase.js'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || ''}/api/auth`
})

// Normalise axios errors to the server's { error } message.
function apiError(err) {
  return new Error(err.response?.data?.error || err.message || 'Something went wrong')
}

/**
 * Creates the account via the Express API, which validates the
 * @strathmore.edu domain and role server-side.
 * Returns { uid, email, role }. Does NOT sign the user in —
 * the register page redirects to /login on success.
 */
export async function register(name, email, password, role) {
  try {
    const { data } = await api.post('/register', { name, email, password, role })
    return data
  } catch (err) {
    throw apiError(err)
  }
}

/**
 * Signs in with the Firebase SDK, then exchanges the ID token with
 * the Express API for the profile { uid, name, email, role, accountStatus }.
 */
export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const idToken = await credential.user.getIdToken()

  try {
    const { data } = await api.post('/login', { idToken })
    return data
  } catch (err) {
    // Suspended or missing profile — don't leave a half-open session.
    await firebaseSignOut(auth).catch(() => {})
    if (err.response?.status === 403 && err.response.data?.reason) {
      throw new Error(`${err.response.data.error}: ${err.response.data.reason}`)
    }
    throw apiError(err)
  }
}

/** Fetches the current user's Firestore doc using a fresh ID token. */
export async function fetchProfile() {
  if (!auth.currentUser) return null
  const idToken = await auth.currentUser.getIdToken()
  try {
    const { data } = await api.get('/me', {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    return data
  } catch (err) {
    throw apiError(err)
  }
}

export async function logout() {
  await firebaseSignOut(auth)
}
