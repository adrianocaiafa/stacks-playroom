import { Router } from 'express'
import { addClient, removeClient } from '../broadcaster.js'

export const sseRouter = Router()

/**
 * GET /events/:gameId
 *
 * Opens an SSE stream for a specific game.
 * The frontend connects here to receive real-time events.
 */
sseRouter.get('/:gameId', (req, res) => {
  const { gameId } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering
  res.flushHeaders()

  // Send a heartbeat every 25s to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 25_000)

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ gameId })}\n\n`)

  const clientId = addClient(gameId, res)

  req.on('close', () => {
    clearInterval(heartbeat)
    removeClient(clientId)
  })
})
