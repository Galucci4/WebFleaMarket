import { db } from '../config/firebase.js'
import serialize from '../utils/serialize.js'

/**
 * GET /api/events[?status=active|closed]
 * Any authenticated user. All events, newest start date first.
 * The vendor listing form passes ?status=active; the buyer filter
 * uses the full list. Event management is the admin module's job.
 */
export async function listEvents(req, res) {
  const { status } = req.query

  let query = db.collection('events')
  if (status) {
    query = query.where('status', '==', status)
  }
  const snap = await query.get()

  const events = snap.docs.map((doc) => ({ id: doc.id, ...serialize(doc.data()) }))
  events.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))

  return res.json(events)
}
