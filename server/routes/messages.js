import { Router } from 'express'
import verifyToken from '../middleware/verifyToken.js'
import {
  sendMessage,
  listConversations,
  markMessageRead
} from '../controllers/messageController.js'

const router = Router()

router.use(verifyToken)

router.post('/', sendMessage)
router.get('/conversations', listConversations)
router.put('/:messageId/read', markMessageRead)

export default router
