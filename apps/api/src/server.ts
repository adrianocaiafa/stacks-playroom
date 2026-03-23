import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { sseRouter } from './routes/sse.js'
import { webhookRouter } from './routes/webhook.js'

const app = express()
const PORT = process.env.PORT ?? 3001

const ALLOWED_ORIGINS = [
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST'],
}))

app.use(express.json({ limit: '5mb' }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'stacks-playroom-api' })
})

// SSE — frontend connects here to receive real-time game events
app.use('/events', sseRouter)

// Webhook — Hiro Chainhooks posts here when on-chain events occur
app.use('/webhook', webhookRouter)

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`)
  console.log(`   SSE:     GET  /events/:gameId`)
  console.log(`   Webhook: POST /webhook/stacks`)
})
