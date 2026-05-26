/**
 * Administrator gate — use after verifyToken.
 */
export default function requireAdmin(req, res, next) {
  if (req.user?.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
