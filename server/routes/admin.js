import { Router } from 'express'
import verifyToken from '../middleware/verifyToken.js'
import requireAdmin from '../middleware/requireAdmin.js'
import {
  getStats,
  getPendingListings,
  approveListing,
  rejectListing,
  removeListing,
  listVendors,
  suspendVendor,
  createEvent,
  listAdminEvents,
  activateEvent,
  closeEvent,
  getOpenReports,
  dismissReport,
  removeListingForReport,
  suspendVendorForReport
} from '../controllers/adminController.js'

const router = Router()

router.use(verifyToken, requireAdmin)

router.get('/stats', getStats)

router.get('/listings/pending', getPendingListings)
router.put('/listings/:id/approve', approveListing)
router.put('/listings/:id/reject', rejectListing)
router.put('/listings/:id/remove', removeListing)

router.get('/vendors', listVendors)
router.put('/vendors/:vendorId/suspend', suspendVendor)

router.post('/events', createEvent)
router.get('/events', listAdminEvents)
router.put('/events/:id/activate', activateEvent)
router.put('/events/:id/close', closeEvent)

router.get('/reports', getOpenReports)
router.put('/reports/:id/dismiss', dismissReport)
router.put('/reports/:id/remove-listing', removeListingForReport)
router.put('/reports/:id/suspend-vendor', suspendVendorForReport)

export default router
