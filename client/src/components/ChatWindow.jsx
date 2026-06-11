import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useMessages from '../hooks/useMessages.js'
import { sendMessage, markRead } from '../services/messageService.js'
import { formatTime } from '../utils/format.js'

/**
 * Shared chat UI for buyer and vendor.
 * Reads arrive in real time via useMessages (onSnapshot);
 * sends go through the Express API.
 */
export default function ChatWindow({
  conversationId,
  listingId,
  otherPartyId,
  otherPartyName,
  listingTitle,
  currentUserId,
  backTo
}) {
  const navigate = useNavigate()
  const { messages, loading, error: streamError } = useMessages(conversationId)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const bottomRef = useRef(null)
  const markedRef = useRef(new Set())

  // Auto-scroll on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Mark incoming messages read — on open and as they arrive.
  useEffect(() => {
    for (const msg of messages) {
      if (
        msg.receiverId === currentUserId &&
        !msg.isReadByReceiver &&
        !markedRef.current.has(msg.id)
      ) {
        markedRef.current.add(msg.id)
        markRead(msg.id).catch(() => markedRef.current.delete(msg.id))
      }
    }
  }, [messages, currentUserId])

  async function handleSend(e) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    setSendError('')
    setSending(true)
    try {
      await sendMessage({ receiverId: otherPartyId, listingId, content })
      setDraft('')
    } catch (err) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button type="button" className="back-link" onClick={() => navigate(backTo)}>
          ‹
        </button>
        <span className="chat-title">
          {otherPartyName} <span className="muted">| {listingTitle}</span>
        </span>
      </header>

      <div className="chat-messages">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : streamError ? (
          <p className="error">{streamError}</p>
        ) : messages.length === 0 ? (
          <p className="muted chat-empty">No messages yet — say hello!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`bubble ${msg.senderId === currentUserId ? 'sent' : 'received'}`}
            >
              <p>{msg.content}</p>
              <span className="bubble-time">{formatTime(msg.createdAt)}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {sendError && <p className="error chat-send-error">{sendError}</p>}

      <form className="chat-input-bar" onSubmit={handleSend}>
        <textarea
          rows="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message"
        />
        <button type="submit" className="btn btn-dark" disabled={sending || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
