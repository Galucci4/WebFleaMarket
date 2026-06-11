import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConversations } from '../../services/messageService.js'
import { formatWhen } from '../../utils/format.js'

/** Buyer's conversation list — mirrors the vendor Inquiries page. */
export default function MessagesPage() {
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app-page">
      <button type="button" className="back-link" onClick={() => navigate('/buyer')}>
        ‹ Back
      </button>
      <h2>Messages</h2>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="muted">No messages yet — find a listing and message the vendor.</p>
      ) : (
        <ul className="conv-list">
          {conversations.map((conv) => (
            <li key={conv.conversationId}>
              <button
                type="button"
                className="card conv-card"
                onClick={() => navigate(`/buyer/messages/${conv.conversationId}`)}
              >
                <div className="conv-top">
                  <strong>{conv.otherPartyName}</strong>
                  <span className="muted">{formatWhen(conv.lastMessage.createdAt)}</span>
                </div>
                <span className="muted conv-listing">{conv.listingTitle}</span>
                <div className="conv-bottom">
                  <span className="conv-preview">{conv.lastMessage.content}</span>
                  {conv.unreadCount > 0 && <span className="unread-dot" aria-label="Unread" />}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
