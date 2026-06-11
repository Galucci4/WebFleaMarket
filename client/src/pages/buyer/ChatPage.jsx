import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { conversationIdFor } from 'su-flea-market-shared'
import ChatWindow from '../../components/ChatWindow.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getConversations } from '../../services/messageService.js'
import { getListing } from '../../services/buyerService.js'

/**
 * Buyer chat. Two entry points:
 * - /buyer/messages/:conversationId — existing conversation
 * - /buyer/messages/new?listingId=X&vendorId=Y — from "Message Vendor";
 *   the conversation ID is deterministic, so prior history (if any)
 *   appears automatically.
 */
export default function ChatPage() {
  const { conversationId: convParam } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [chat, setChat] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      try {
        if (convParam) {
          const conversations = await getConversations()
          const conv = conversations.find((c) => c.conversationId === convParam)
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
          return
        }

        const listingId = searchParams.get('listingId')
        const vendorId = searchParams.get('vendorId')
        if (!listingId || !vendorId) throw new Error('Missing listing or vendor')

        const listing = await getListing(listingId)
        if (!cancelled) {
          setChat({
            conversationId: conversationIdFor(currentUser.uid, vendorId, listingId),
            listingId,
            listingTitle: listing.title,
            otherPartyId: vendorId,
            otherPartyName: listing.vendor?.name || 'Vendor'
          })
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [convParam, searchParams, currentUser.uid])

  if (error) {
    return (
      <div className="app-page">
        <h1>SU FLEA MARKET</h1>
        <p className="error">{error}</p>
        <button type="button" className="btn btn-outline" onClick={() => navigate('/buyer')}>
          ‹ Back to listings
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

  return <ChatWindow {...chat} currentUserId={currentUser.uid} backTo="/buyer/messages" />
}
