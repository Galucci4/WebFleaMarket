import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ChatWindow from '../../components/ChatWindow.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getConversations } from '../../services/messageService.js'

/** Vendor chat — opened from the Inquiries list. */
export default function ChatPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [chat, setChat] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getConversations()
      .then((conversations) => {
        const conv = conversations.find((c) => c.conversationId === conversationId)
        if (!conv) throw new Error('Conversation not found')
        if (!cancelled) {
          setChat({
            conversationId: conv.conversationId,
            listingId: conv.listingId,
            listingTitle: conv.listingTitle,
            otherPartyId: conv.otherPartyId,
            otherPartyName: conv.otherPartyName
          })
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [conversationId])

  if (error) {
    return (
      <div className="app-page">
        <h1>SU FLEA MARKET</h1>
        <p className="error">{error}</p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/vendor/inquiries')}
        >
          ‹ Back to inquiries
        </button>
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="app-page">
        <h1>SU FLEA MARKET</h1>
        <p>Loading…</p>
      </div>
    )
  }

  return <ChatWindow {...chat} currentUserId={currentUser.uid} backTo="/vendor/inquiries" />
}
