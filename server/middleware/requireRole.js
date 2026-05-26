/**
 * Role gate — use after verifyToken, which attaches req.user.role.
 * Usage: router.use(verifyToken, requireRole('vendor'))
 */
export default function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
