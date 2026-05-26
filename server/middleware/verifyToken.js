import { auth, db } from '../config/firebase.js'

/**
 * Validates the Firebase ID token on every protected route.
 * Expects: Authorization: Bearer <idToken>
 *
 * On success attaches req.user = { uid, email, role }.
 * role is fetched from Firestore users/{uid}.role — never from
 * the token claim, so role changes take effect immediately.
 */
export default async function verifyToken(req, res, next) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const idToken = header.split('Bearer ')[1]

  try {
    const decoded = await auth.verifyIdToken(idToken)

    const userSnap = await db.collection('users').doc(decoded.uid).get()
    if (!userSnap.exists) {
      return res.status(401).json({ error: 'Unauthorised' })
    }

    const userData = userSnap.data()

    // Suspension takes effect immediately, not just at next login.
    if (userData.accountStatus === 'suspended') {
      return res
        .status(403)
        .json({ error: 'Account suspended', reason: userData.suspensionReason })
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: userData.role
    }
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorised' })
  }
}
