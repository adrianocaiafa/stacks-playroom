import { useEffect, useRef, useCallback } from 'react'
import type { GameEvent } from '@stacks-playroom/shared'

const API_URL = import.meta.env.VITE_API_URL ?? 'https://stacks-playroom-production.up.railway.app'

export function useGameEvents(
  gameId: string,
  onEvent: (event: GameEvent) => void,
) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    const source = new EventSource(`${API_URL}/events/${gameId}`)

    source.addEventListener('game-event', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as GameEvent
        onEventRef.current(data)
      } catch {
        // ignore malformed events
      }
    })

    source.onerror = () => {
      source.close()
      // Reconnect after 5s on error
      setTimeout(connect, 5000)
    }

    return source
  }, [gameId])

  useEffect(() => {
    const source = connect()
    return () => source.close()
  }, [connect])
}
