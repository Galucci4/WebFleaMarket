import { useEffect, useState } from 'react'
import { collection, query, where, and, or, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../config/firebase.js'

/**
 * Real-time subscription to one conversation's messages —
 * the only place the client reads Firestore directly.
 *
 * The sender/receiver OR-clause looks redundant (participants are the
 * only ones in a conversation anyway) but is required: security rules
 * only allow queries that provably restrict results to the caller's
 * own messages.
 *
 * Sorted client-side (createdAt asc) to avoid a composite index.
 * A locally-pending serverTimestamp is null, so those sort last.
 */
export default function useMessages(conversationId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!conversationId || !auth.currentUser) return undefined

    setLoading(true)
    const uid = auth.currentUser.uid

    const q = query(
      collection(db, 'messages'),
      and(
        where('conversationId', '==', conversationId),
        or(where('senderId', '==', uid), where('receiverId', '==', uid))
      )
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        msgs.sort(
          (a, b) =>
            (a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER) -
            (b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER)
        )
        setMessages(msgs)
        setError('')
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [conversationId])

  return { messages, loading, error }
}
