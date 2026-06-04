import { Router } from 'express'
import verifyToken from '../middleware/verifyToken.js'
import { listEvents } from '../controllers/eventController.js'

const router = Router()

router.get('/', verifyToken, listEvents)

export default router
