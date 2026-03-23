import type { Response } from 'express'

interface Client {
  id: string
  gameId: string
  res: Response
}

const clients: Client[] = []

export function addClient(gameId: string, res: Response): string {
  const id = `${gameId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  clients.push({ id, gameId, res })
  console.log(`[SSE] Client connected: ${id} (game: ${gameId}) — total: ${clients.length}`)
  return id
}

export function removeClient(id: string): void {
  const idx = clients.findIndex((c) => c.id === id)
  if (idx !== -1) {
    clients.splice(idx, 1)
    console.log(`[SSE] Client disconnected: ${id} — total: ${clients.length}`)
  }
}

export function broadcast(gameId: string, event: string, data: unknown): void {
  const targets = clients.filter((c) => c.gameId === gameId)
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  console.log(`[SSE] Broadcasting "${event}" to ${targets.length} client(s) on game "${gameId}"`)
  targets.forEach((c) => {
    try {
      c.res.write(payload)
    } catch {
      removeClient(c.id)
    }
  })
}

export function broadcastAll(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach((c) => {
    try {
      c.res.write(payload)
    } catch {
      removeClient(c.id)
    }
  })
}
