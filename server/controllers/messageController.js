import admin from 'firebase-admin'
import { db } from '../config/firebase.js'
import serialize from '../utils/serialize.js'
import { conversationIdFor } from 'su-flea-market-shared'

const { FieldValue } = admin.firestore

/**
 * POST /api/messages — body: { receiverId, listingId, content }
 * Writes go through Express; the client only listens via onSnapshot.
 */
export async function sendMessage(req, res) {
  const { receiverId, listingId, content } = req.body || {}
  const senderId = req.user.uid

  if (!receiverId || !listingId || !content || !content.trim()) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  if (receiverId === senderId) {
    return res.status(400).json({ error: 'Cannot message yourself' })
  }

  const [receiverSnap, listingSnap] = await Promise.all([
    db.collection('users').doc(receiverId).get(),
    db.collection('listings').doc(listingId).get()
  ])
  if (!receiverSnap.exists) {
    return res.status(404).json({ error: 'Recipient not found' })
  }
  if (!listingSnap.exists) {
    return res.status(404).json({ error: 'Listing not found' })
  }

  const conversationId = conversationIdFor(senderId, receiverId, listingId)

  const ref = await db.collection('messages').add({
    senderId,
    receiverId,
    listingId,
    conversationId,
    content: content.trim(),
    createdAt: FieldValue.serverTimestamp(),
    isReadByReceiver: false,
    readAt: null
  })

  return res.status(201).json({ messageId: ref.id, conversationId })
}

/**
 * GET /api/messages/conversations
 * One entry per conversation involving the current user, newest first,
 * enriched with the other party's name, the listing title, and an
 * unread count.
 */
export async function listConversations(req, res) {
  const uid = req.user.uid

  // Two equality queries merged in memory — Firestore has no OR here
  // without newer SDK helpers, and this avoids composite indexes.
  const [sentSnap, receivedSnap] = await Promise.all([
    db.collection('messages').where('senderId', '==', uid).get(),
    db.collection('messages').where('receiverId', '==', uid).get()
  ])

  const all = new Map()
  for (const doc of [...sentSnap.docs, ...receivedSnap.docs]) {
    all.set(doc.id, { id: doc.id, ...serialize(doc.data()) })
  }

  // Group by conversation, keeping the latest message and unread count.
  const groups = new Map()
  for (const msg of all.values()) {
    let group = groups.get(msg.conversationId)
    if (!group) {
      group = { latest: msg, unreadCount: 0 }
      groups.set(msg.conversationId, group)
    } else if ((msg.createdAt || '') > (group.latest.createdAt || '')) {
      group.latest = msg
    }
    if (msg.receiverId === uid && !msg.isReadByReceiver) {
      group.unreadCount += 1
    }
  }

  // Batch-fetch the other parties and listings.
  const otherIds = new Set()
  const listingIds = new Set()
  for (const { latest } of groups.values()) {
    otherIds.add(latest.senderId === uid ? latest.receiverId : latest.senderId)
    listingIds.add(latest.listingId)
  }

  const userRefs = [...otherIds].map((id) => db.collection('users').doc(id))
  const listingRefs = [...listingIds].map((id) => db.collection('listings').doc(id))
  const [userSnaps, listingSnaps] = await Promise.all([
    userRefs.length ? db.getAll(...userRefs) : [],
    listingRefs.length ? db.getAll(...listingRefs) : []
  ])

  const names = new Map(userSnaps.map((s) => [s.id, s.exists ? s.data().name : 'Unknown user']))
  const titles = new Map(
    listingSnaps.map((s) => [s.id, s.exists ? s.data().title : 'Listing unavailable'])
  )

  const conversations = [...groups.values()].map(({ latest, unreadCount }) => {
    const otherPartyId = latest.senderId === uid ? latest.receiverId : latest.senderId
    return {
      conversationId: latest.conversationId,
      listingId: latest.listingId,
      listingTitle: titles.get(latest.listingId),
      otherPartyId,
      otherPartyName: names.get(otherPartyId),
      lastMessage: {
        content: latest.content,
        senderId: latest.senderId,
        createdAt: latest.createdAt,
        isReadByReceiver: latest.isReadByReceiver
      },
      unreadCount
    }
  })

  conversations.sort((a, b) =>
    (b.lastMessage.createdAt || '').localeCompare(a.lastMessage.createdAt || '')
  )

  return res.json(conversations)
}

/**
 * PUT /api/messages/:messageId/read
 * Only the receiver of a message can mark it read.
 */
export async function markMessageRead(req, res) {
  const ref = db.collection('messages').doc(req.params.messageId)
  const snap = await ref.get()

  if (!snap.exists) {
    return res.status(404).json({ error: 'Message not found' })
  }
  if (snap.data().receiverId !== req.user.uid) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  await ref.update({ isReadByReceiver: true, readAt: FieldValue.serverTimestamp() })
  return res.json({ ok: true })
}
