import admin from 'firebase-admin'
import { db } from '../config/firebase.js'
import serialize from '../utils/serialize.js'

const { FieldValue } = admin.firestore

/* ───────── shared helpers ───────── */

/** Removes a live listing: hidden from buyers and marked rejected. */
async function applyListingRemoval(listingRef, adminUid, removalReason) {
  await listingRef.update({
    listingStatus: 'deactivated',
    moderationStatus: 'rejected',
    removedBy: adminUid,
    removedAt: FieldValue.serverTimestamp(),
    removalReason,
    updatedAt: new Date()
  })
}

/**
 * Suspends a vendor and deactivates all their active listings
 * (proposal TC24). Returns the number of listings deactivated,
 * or null if the vendor doesn't exist.
 */
async function applyVendorSuspension(vendorId, adminUid, suspensionReason) {
  const vendorRef = db.collection('users').doc(vendorId)
  const vendorSnap = await vendorRef.get()
  if (!vendorSnap.exists || vendorSnap.data().role !== 'vendor') return null

  await vendorRef.update({
    accountStatus: 'suspended',
    suspendedAt: FieldValue.serverTimestamp(),
    suspendedBy: adminUid,
    suspensionReason,
    updatedAt: new Date()
  })

  const activeSnap = await db
    .collection('listings')
    .where('vendorId', '==', vendorId)
    .where('listingStatus', '==', 'active')
    .get()

  const batch = db.batch()
  for (const doc of activeSnap.docs) {
    batch.update(doc.ref, { listingStatus: 'deactivated', updatedAt: new Date() })
  }
  await batch.commit()

  return activeSnap.size
}

/* ───────── dashboard ───────── */

/** GET /api/admin/stats — summary counts for the dashboard cards. */
export async function getStats(req, res) {
  const [pendingSnap, totalSnap, reportsSnap] = await Promise.all([
    db.collection('listings').where('moderationStatus', '==', 'pending').select().get(),
    db.collection('listings').select().get(),
    db.collection('reports').where('status', '==', 'open').select().get()
  ])

  return res.json({
    pendingListings: pendingSnap.size,
    totalListings: totalSnap.size,
    openReports: reportsSnap.size
  })
}

/* ───────── listings ───────── */

/** GET /api/admin/listings/pending — moderation queue, oldest first. */
export async function getPendingListings(req, res) {
  const snap = await db
    .collection('listings')
    .where('moderationStatus', '==', 'pending')
    .get()

  const listings = snap.docs.map((doc) => ({
    id: doc.id,
    ref: doc.ref,
    ...serialize(doc.data())
  }))
  listings.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

  // Batch-fetch vendor names and event names.
  const vendorIds = [...new Set(listings.map((l) => l.vendorId))]
  const eventIds = [...new Set(listings.map((l) => l.eventId))]
  const [vendorSnaps, eventSnaps] = await Promise.all([
    vendorIds.length ? db.getAll(...vendorIds.map((id) => db.collection('users').doc(id))) : [],
    eventIds.length ? db.getAll(...eventIds.map((id) => db.collection('events').doc(id))) : []
  ])
  const vendorNames = new Map(
    vendorSnaps.map((s) => [s.id, s.exists ? s.data().name : 'Unknown vendor'])
  )
  const eventNames = new Map(
    eventSnaps.map((s) => [s.id, s.exists ? s.data().name : 'Unknown event'])
  )

  const result = await Promise.all(
    listings.map(async ({ ref, ...listing }) => {
      const imgSnap = await ref.collection('images').orderBy('order').get()
      return {
        ...listing,
        vendorName: vendorNames.get(listing.vendorId),
        eventName: eventNames.get(listing.eventId),
        images: imgSnap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }))
      }
    })
  )

  return res.json(result)
}

/** PUT /api/admin/listings/:id/approve */
export async function approveListing(req, res) {
  const ref = db.collection('listings').doc(req.params.id)
  const snap = await ref.get()
  if (!snap.exists) {
    return res.status(404).json({ error: 'Listing not found' })
  }

  await ref.update({
    moderationStatus: 'approved',
    approvedBy: req.user.uid,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: new Date()
  })

  return res.json({ moderationStatus: 'approved' })
}

/** PUT /api/admin/listings/:id/reject — body: { removalReason } */
export async function rejectListing(req, res) {
  const { removalReason } = req.body || {}
  if (!removalReason || !removalReason.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required' })
  }

  const ref = db.collection('listings').doc(req.params.id)
  const snap = await ref.get()
  if (!snap.exists) {
    return res.status(404).json({ error: 'Listing not found' })
  }

  await ref.update({
    moderationStatus: 'rejected',
    removedBy: req.user.uid,
    removedAt: FieldValue.serverTimestamp(),
    removalReason: removalReason.trim(),
    updatedAt: new Date()
  })

  return res.json({ moderationStatus: 'rejected' })
}

/** PUT /api/admin/listings/:id/remove — body: { removalReason } */
export async function removeListing(req, res) {
  const { removalReason } = req.body || {}
  if (!removalReason || !removalReason.trim()) {
    return res.status(400).json({ error: 'Removal reason is required' })
  }

  const ref = db.collection('listings').doc(req.params.id)
  const snap = await ref.get()
  if (!snap.exists) {
    return res.status(404).json({ error: 'Listing not found' })
  }

  await applyListingRemoval(ref, req.user.uid, removalReason.trim())
  return res.json({ listingStatus: 'deactivated', moderationStatus: 'rejected' })
}

/* ───────── vendors ───────── */

/** GET /api/admin/vendors — all vendor accounts with status. */
export async function listVendors(req, res) {
  const snap = await db.collection('users').where('role', '==', 'vendor').get()

  const vendors = snap.docs.map((doc) => {
    const { name, email, description, accountStatus, suspensionReason, suspendedAt } =
      serialize(doc.data())
    return { uid: doc.id, name, email, description, accountStatus, suspensionReason, suspendedAt }
  })
  vendors.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return res.json(vendors)
}

/** PUT /api/admin/vendors/:vendorId/suspend — body: { suspensionReason } */
export async function suspendVendor(req, res) {
  const { suspensionReason } = req.body || {}
  if (!suspensionReason || !suspensionReason.trim()) {
    return res.status(400).json({ error: 'Suspension reason is required' })
  }

  const deactivated = await applyVendorSuspension(
    req.params.vendorId,
    req.user.uid,
    suspensionReason.trim()
  )
  if (deactivated === null) {
    return res.status(404).json({ error: 'Vendor not found' })
  }

  return res.json({ accountStatus: 'suspended', listingsDeactivated: deactivated })
}

/* ───────── events ───────── */

/** POST /api/admin/events — body: { name, startDate, endDate } */
export async function createEvent(req, res) {
  const { name, startDate, endDate } = req.body || {}

  if (!name || !name.trim() || !startDate || !endDate) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid dates' })
  }
  if (end <= start) {
    return res.status(400).json({ error: 'End date must be after start date' })
  }

  const now = new Date()
  const ref = await db.collection('events').add({
    name: name.trim(),
    startDate: start,
    endDate: end,
    status: 'pending',
    createdBy: req.user.uid,
    createdAt: now,
    updatedAt: now,
    closedAt: null
  })

  return res.status(201).json({ eventId: ref.id })
}

/** GET /api/admin/events — all events, newest start first, with listing counts. */
export async function listAdminEvents(req, res) {
  const [eventsSnap, listingsSnap] = await Promise.all([
    db.collection('events').get(),
    db.collection('listings').select('eventId').get()
  ])

  const counts = new Map()
  for (const doc of listingsSnap.docs) {
    const eventId = doc.get('eventId')
    counts.set(eventId, (counts.get(eventId) || 0) + 1)
  }

  const events = eventsSnap.docs.map((doc) => ({
    id: doc.id,
    ...serialize(doc.data()),
    listingCount: counts.get(doc.id) || 0
  }))
  events.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))

  return res.json(events)
}

/** PUT /api/admin/events/:id/activate */
export async function activateEvent(req, res) {
  const ref = db.collection('events').doc(req.params.id)
  const snap = await ref.get()
  if (!snap.exists) {
    return res.status(404).json({ error: 'Event not found' })
  }

  await ref.update({ status: 'active', closedAt: null, updatedAt: new Date() })
  return res.json({ status: 'active' })
}

/** PUT /api/admin/events/:id/close */
export async function closeEvent(req, res) {
  const ref = db.collection('events').doc(req.params.id)
  const snap = await ref.get()
  if (!snap.exists) {
    return res.status(404).json({ error: 'Event not found' })
  }

  await ref.update({
    status: 'closed',
    closedAt: FieldValue.serverTimestamp(),
    updatedAt: new Date()
  })
  return res.json({ status: 'closed' })
}

/* ───────── reports ───────── */

/** GET /api/admin/reports — open reports, oldest first, enriched. */
export async function getOpenReports(req, res) {
  const snap = await db.collection('reports').where('status', '==', 'open').get()

  const reports = snap.docs.map((doc) => ({ id: doc.id, ...serialize(doc.data()) }))
  reports.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

  const listingIds = [...new Set(reports.map((r) => r.listingId))]
  const reporterIds = [...new Set(reports.map((r) => r.reporterId))]
  const [listingSnaps, reporterSnaps] = await Promise.all([
    listingIds.length
      ? db.getAll(...listingIds.map((id) => db.collection('listings').doc(id)))
      : [],
    reporterIds.length
      ? db.getAll(...reporterIds.map((id) => db.collection('users').doc(id)))
      : []
  ])

  const listingInfo = new Map(
    listingSnaps.map((s) => [
      s.id,
      s.exists
        ? { title: s.data().title, vendorId: s.data().vendorId }
        : { title: 'Listing unavailable', vendorId: null }
    ])
  )
  const reporterNames = new Map(
    reporterSnaps.map((s) => [s.id, s.exists ? s.data().name : 'Unknown user'])
  )

  return res.json(
    reports.map((r) => ({
      ...r,
      listingTitle: listingInfo.get(r.listingId)?.title,
      vendorId: listingInfo.get(r.listingId)?.vendorId,
      reporterName: reporterNames.get(r.reporterId)
    }))
  )
}

/** Loads an open report or sends the error response. */
async function getOpenReport(req, res) {
  const ref = db.collection('reports').doc(req.params.id)
  const snap = await ref.get()
  if (!snap.exists) {
    res.status(404).json({ error: 'Report not found' })
    return null
  }
  if (snap.data().status !== 'open') {
    res.status(400).json({ error: 'Report already reviewed' })
    return null
  }
  return snap
}

function reportResolution(adminUid, adminAction, resolutionNote) {
  return {
    status: 'reviewed',
    reviewedBy: adminUid,
    reviewedAt: FieldValue.serverTimestamp(),
    adminAction,
    resolutionNote
  }
}

/** PUT /api/admin/reports/:id/dismiss */
export async function dismissReport(req, res) {
  const snap = await getOpenReport(req, res)
  if (!snap) return

  await snap.ref.update(
    reportResolution(req.user.uid, 'dismissed', 'No violation found')
  )
  return res.json({ status: 'reviewed' })
}

/** PUT /api/admin/reports/:id/remove-listing — body: { resolutionNote } */
export async function removeListingForReport(req, res) {
  const { resolutionNote } = req.body || {}
  if (!resolutionNote || !resolutionNote.trim()) {
    return res.status(400).json({ error: 'Resolution note is required' })
  }

  const snap = await getOpenReport(req, res)
  if (!snap) return

  const listingRef = db.collection('listings').doc(snap.data().listingId)
  const listingSnap = await listingRef.get()
  if (!listingSnap.exists) {
    return res.status(404).json({ error: 'Reported listing no longer exists' })
  }

  await applyListingRemoval(listingRef, req.user.uid, resolutionNote.trim())
  await snap.ref.update(
    reportResolution(req.user.uid, 'listing_removed', resolutionNote.trim())
  )

  return res.json({ status: 'reviewed', adminAction: 'listing_removed' })
}

/** PUT /api/admin/reports/:id/suspend-vendor — body: { suspensionReason, resolutionNote } */
export async function suspendVendorForReport(req, res) {
  const { suspensionReason, resolutionNote } = req.body || {}
  if (!suspensionReason || !suspensionReason.trim()) {
    return res.status(400).json({ error: 'Suspension reason is required' })
  }
  if (!resolutionNote || !resolutionNote.trim()) {
    return res.status(400).json({ error: 'Resolution note is required' })
  }

  const snap = await getOpenReport(req, res)
  if (!snap) return

  const listingSnap = await db.collection('listings').doc(snap.data().listingId).get()
  if (!listingSnap.exists) {
    return res.status(404).json({ error: 'Reported listing no longer exists' })
  }

  const deactivated = await applyVendorSuspension(
    listingSnap.data().vendorId,
    req.user.uid,
    suspensionReason.trim()
  )
  if (deactivated === null) {
    return res.status(404).json({ error: 'Vendor not found' })
  }

  await snap.ref.update(
    reportResolution(req.user.uid, 'vendor_suspended', resolutionNote.trim())
  )

  return res.json({ status: 'reviewed', adminAction: 'vendor_suspended' })
}
