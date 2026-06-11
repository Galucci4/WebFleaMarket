import axios from 'axios'
import { auth } from '../config/firebase.js'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || ''}/api/messages`
})

// Normalise axios errors to the server's { error } message.
function apiError(err) {
  return new Error(err.response?.data?.error || err.message || 'Something went wrong')
}

async function authHeaders() {
  const idToken = await auth.currentUser.getIdToken()
  return { Authorization: `Bearer ${idToken}` }
}

/** POST /api/messages — { receiverId, listingId, content }. */
export async function sendMessage({ receiverId, listingId, content }) {
  try {
    const { data } = await api.post(
      '/',
      { receiverId, listingId, content },
      { headers: await authHeaders() }
    )
    return data
  } catch (err) {
    throw apiError(err)
  }
}

/** GET /api/messages/conversations — current user's conversation list. */
export async function getConversations() {
  try {
    const { data } = await api.get('/conversations', { headers: await authHeaders() })
    return data
  } catch (err) {
    throw apiError(err)
  }
}

/** PUT /api/messages/:id/read — receiver marks a message read. */
export async function markRead(messageId) {
  try {
    const { data } = await api.put(`/${messageId}/read`, null, {
      headers: await authHeaders()
    })
    return data
  } catch (err) {
    throw apiError(err)
  }
}
