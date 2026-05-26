import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import vendorRoutes from './routes/vendor.js'
import eventRoutes from './routes/events.js'
import listingRoutes from './routes/listings.js'
import buyerRoutes from './routes/buyer.js'
import messageRoutes from './routes/messages.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/vendor', vendorRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/buyer', buyerRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/admin', adminRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
