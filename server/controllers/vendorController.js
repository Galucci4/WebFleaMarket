import { db } from '../config/firebase.js'
import cloudinary from '../config/cloudinary.js'
import { CATEGORIES } from 'su-flea-market-shared'

const MAX_IMAGES = 5

/** Converts Firestore Timestamps to ISO strings for JSON responses. */
function serialize(data) {
  const out = {}
  for (const [key, value] of Object.entries(data)) {
    out[key] = value?.toDate ? value.toDate().toISOString() : value
  }
  return out
}

function buildSearchKeywords(title, category) {
  const words = title
    .toLowerCase()
    .split(' ')
    .map((w) => w.trim())
    .filter(Boolean)
  return [...new Set([...words, category.toLowerCase()])]
}

function validateListingBody(body) {
  const { title, description, category, price, eventId } = body || {}
  if (!title || !description || !category || price == null || !eventId) {
    return 'All fields are required'
  }
  if (!CATEGORIES.includes(category)) {
    return `Category must be one of: ${CATEGORIES.join(', ')}`
  }
  const numPrice = Number(price)
  if (!Number.isFinite(numPrice) || numPrice <= 0) {
    return 'Price must be a positive number'
  }
  return null
}

/**
 * Loads listings/{id} and verifies the caller owns it.
 * Sends the error response itself and returns null on failure.
 */
async function getOwnedListing(req, res, id) {
  const snap = await db.collection('listings').doc(id).get()
  if (!snap.exists) {
    res.status(404).json({ error: 'Listing not found' })
    return null
  }
  if (snap.data().vendorId !== req.user.uid) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  return snap
}

/** GET /api/vendor/profile */
export async function getProfile(req, res) {
  const snap = await db.collection('users').doc(req.user.uid).get()
  if (!snap.exists) {
    return res.status(404).json({ error: 'User profile not found' })
  }
  return res.json({ uid: snap.id, ...serialize(snap.data()) })
}

/** PUT /api/vendor/profile — body: { name, description, contactPreference } */
export async function updateProfile(req, res) {
  const { name, description, contactPreference } = req.body || {}

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }

  const ref = db.collection('users').doc(req.user.uid)
  await ref.update({
    name: name.trim(),
    description: description ?? null,
    contactPreference: contactPreference ?? null,
    updatedAt: new Date()
  })

  const snap = await ref.get()
  return res.json({ uid: snap.id, ...serialize(snap.data()) })
}

/** POST /api/vendor/listings */
export async function createListing(req, res) {
  const validationError = validateListingBody(req.body)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const { title, description, category, price, eventId } = req.body
  const now = new Date()

  const doc = {
    vendorId: req.user.uid,
    eventId,
    title,
    description,
    category,
    price: Number(price),
    currency: 'KSh',
    listingStatus: 'active',
    moderationStatus: 'pending',
    searchKeywords: buildSearchKeywords(title, category),
    createdAt: now,
    updatedAt: now,
    approvedBy: null,
    approvedAt: null,
    removedBy: null,
    removedAt: null,
    removalReason: null
  }

  const ref = await db.collection('listings').add(doc)
  return res.status(201).json({ listingId: ref.id, moderationStatus: 'pending' })
}

/** GET /api/vendor/listings — own listings, newest first, with image counts. */
export async function listMyListings(req, res) {
  const snap = await db
    .collection('listings')
    .where('vendorId', '==', req.user.uid)
    .get()

  const listings = await Promise.all(
    snap.docs.map(async (doc) => {
      const imagesSnap = await doc.ref.collection('images').get()
      return { id: doc.id, ...serialize(doc.data()), imageCount: imagesSnap.size }
    })
  )

  // Sorted in memory — avoids needing a composite Firestore index.
  listings.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  return res.json(listings)
}

/** GET /api/vendor/listings/:id — single listing with its images (for edit page). */
export async function getMyListing(req, res) {
  const snap = await getOwnedListing(req, res, req.params.id)
  if (!snap) return

  const imagesSnap = await snap.ref.collection('images').get()
  const images = imagesSnap.docs
    .map((d) => ({ id: d.id, ...serialize(d.data()) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return res.json({ id: snap.id, ...serialize(snap.data()), images })
}

/** PUT /api/vendor/listings/:id */
export async function updateListing(req, res) {
  const snap = await getOwnedListing(req, res, req.params.id)
  if (!snap) return

  const validationError = validateListingBody(req.body)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const { title, description, category, price, eventId } = req.body

  const update = {
    title,
    description,
    category,
    price: Number(price),
    eventId,
    searchKeywords: buildSearchKeywords(title, category),
    updatedAt: new Date()
  }

  // Edited content must pass moderation again (proposal TC10), and
  // editing a rejected listing resubmits it — otherwise it's stuck.
  const currentStatus = snap.data().moderationStatus
  if (currentStatus === 'approved' || currentStatus === 'rejected') {
    update.moderationStatus = 'pending'
    update.approvedBy = null
    update.approvedAt = null
    update.removedBy = null
    update.removedAt = null
    update.removalReason = null
  }

  await snap.ref.update(update)
  const updated = await snap.ref.get()
  return res.json({ id: updated.id, ...serialize(updated.data()) })
}

/** PUT /api/vendor/listings/:id/deactivate */
export async function deactivateListing(req, res) {
  const snap = await getOwnedListing(req, res, req.params.id)
  if (!snap) return

  await snap.ref.update({ listingStatus: 'deactivated', updatedAt: new Date() })
  return res.json({ listingStatus: 'deactivated' })
}

/** PUT /api/vendor/listings/:id/sold */
export async function markListingSold(req, res) {
  const snap = await getOwnedListing(req, res, req.params.id)
  if (!snap) return

  await snap.ref.update({ listingStatus: 'sold', updatedAt: new Date() })
  return res.json({ listingStatus: 'sold' })
}

/** POST /api/vendor/listings/:id/images — multipart field "image". */
export async function uploadListingImage(req, res) {
  const snap = await getOwnedListing(req, res, req.params.id)
  if (!snap) return

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' })
  }

  const imagesRef = snap.ref.collection('images')
  const existing = await imagesRef.get()
  if (existing.size >= MAX_IMAGES) {
    return res.status(400).json({ error: 'Maximum 5 images per listing' })
  }

  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `su-flea-market/listings/${snap.id}`,
    resource_type: 'image'
  })

  const imageDoc = {
    url: result.secure_url,
    publicId: result.public_id,
    order: existing.size,
    uploadedAt: new Date()
  }
  const ref = await imagesRef.add(imageDoc)

  return res.status(201).json({ imageId: ref.id, url: result.secure_url })
}

/** DELETE /api/vendor/listings/:id/images/:imageId */
export async function deleteListingImage(req, res) {
  const snap = await getOwnedListing(req, res, req.params.id)
  if (!snap) return

  const imageRef = snap.ref.collection('images').doc(req.params.imageId)
  const imageSnap = await imageRef.get()
  if (!imageSnap.exists) {
    return res.status(404).json({ error: 'Image not found' })
  }

  const { publicId } = imageSnap.data()
  if (publicId) {
    await cloudinary.uploader.destroy(publicId).catch(() => {})
  }
  await imageRef.delete()

  return res.status(204).end()
}

/**
 * GET /api/vendor/inquiries/unread-count
 * Unread buyer messages for the dashboard badge. (Real-time chat
 * itself is the messaging module's job — this is a one-shot count.)
 */
export async function getUnreadInquiryCount(req, res) {
  const snap = await db
    .collection('messages')
    .where('receiverId', '==', req.user.uid)
    .where('isReadByReceiver', '==', false)
    .get()

  return res.json({ unreadCount: snap.size })
}
