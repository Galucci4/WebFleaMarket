import { Router } from 'express'
import multer from 'multer'
import verifyToken from '../middleware/verifyToken.js'
import requireRole from '../middleware/requireRole.js'
import {
  getProfile,
  updateProfile,
  createListing,
  listMyListings,
  getMyListing,
  updateListing,
  deactivateListing,
  markListingSold,
  uploadListingImage,
  deleteListingImage,
  getUnreadInquiryCount
} from '../controllers/vendorController.js'

const router = Router()

router.use(verifyToken, requireRole('vendor'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Wraps multer so its errors (size limit, wrong type) come back as 400 JSON.
function uploadSingleImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    next()
  })
}

router.get('/profile', getProfile)
router.put('/profile', updateProfile)

router.post('/listings', createListing)
router.get('/listings', listMyListings)
router.get('/listings/:id', getMyListing)
router.put('/listings/:id', updateListing)
router.put('/listings/:id/deactivate', deactivateListing)
router.put('/listings/:id/sold', markListingSold)

router.post('/listings/:id/images', uploadSingleImage, uploadListingImage)
router.delete('/listings/:id/images/:imageId', deleteListingImage)

router.get('/inquiries/unread-count', getUnreadInquiryCount)

export default router
