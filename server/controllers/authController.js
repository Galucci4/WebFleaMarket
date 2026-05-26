import { auth, db } from '../config/firebase.js'

const STRATHMORE_EMAIL_REGEX = /^[^\s@]+@strathmore\.edu$/i

// Admin accounts are set manually in Firestore — never self-registered.
const SELF_REGISTER_ROLES = ['buyer', 'vendor']

/**
 * POST /api/auth/register
 * Body: { name, email, password, role }
 */
export async function register(req, res) {
  const { name, email, password, role } = req.body || {}

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  // Enforced by default (proposal TC02). Dev opt-out: ALLOW_ANY_EMAIL=true in .env.
  if (process.env.ALLOW_ANY_EMAIL !== 'true' && !STRATHMORE_EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ error: 'Only Strathmore email addresses are permitted' })
  }

  if (!SELF_REGISTER_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be buyer or vendor' })
  }

  let userRecord
  try {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: name
    })
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already registered' })
    }
    console.error('register: createUser failed', err)
    return res.status(500).json({ error: 'Failed to create account' })
  }

  const now = new Date()
  const userDoc = {
    name,
    email,
    role,
    description: null,
    contactPreference: null,
    isVerified: false,
    accountStatus: 'active',
    suspendedAt: null,
    suspendedBy: null,
    suspensionReason: null,
    createdAt: now,
    updatedAt: now
  }

  try {
    await db.collection('users').doc(userRecord.uid).set(userDoc)
  } catch (err) {
    // Roll back the orphaned Auth user so the email can retry cleanly.
    await auth.deleteUser(userRecord.uid).catch(() => {})
    console.error('register: Firestore write failed', err)
    return res.status(500).json({ error: 'Failed to create user profile' })
  }

  return res.status(201).json({ uid: userRecord.uid, email, role })
}

/**
 * POST /api/auth/login
 * Body: { idToken } — client signs in via Firebase SDK first,
 * then exchanges the ID token here for the profile.
 */
export async function login(req, res) {
  const { idToken } = req.body || {}

  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' })
  }

  let decoded
  try {
    decoded = await auth.verifyIdToken(idToken)
  } catch {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const userSnap = await db.collection('users').doc(decoded.uid).get()
  if (!userSnap.exists) {
    return res.status(404).json({ error: 'User profile not found' })
  }

  const profile = userSnap.data()

  if (profile.accountStatus === 'suspended') {
    return res
      .status(403)
      .json({ error: 'Account suspended', reason: profile.suspensionReason })
  }

  return res.json({
    uid: userSnap.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    accountStatus: profile.accountStatus
  })
}

/**
 * GET /api/auth/me
 * Protected by verifyToken — returns the Firestore user doc.
 */
export async function me(req, res) {
  const userSnap = await db.collection('users').doc(req.user.uid).get()
  if (!userSnap.exists) {
    return res.status(404).json({ error: 'User profile not found' })
  }
  return res.json({ uid: userSnap.id, ...userSnap.data() })
}
