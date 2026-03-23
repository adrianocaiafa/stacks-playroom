import { useEffect, useState } from 'react'
import type { BaseGameEvent } from '@stacks-playroom/shared'

interface Props {
  event: BaseGameEvent | null
}

export function LiveEventToast({ event }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!event) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(t)
  }, [event])

  if (!visible || !event) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gray-900 border border-orange-500/30 rounded-xl px-5 py-4 shadow-xl shadow-black/40 max-w-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎲</span>
          <div>
            <p className="text-xs text-orange-400 font-medium uppercase tracking-wide">
              Live · on-chain
            </p>
            <p className="text-sm text-white font-medium mt-0.5">
              {event.sender.slice(0, 8)}…{event.sender.slice(-4)} just rolled!
            </p>
            <a
              href={`https://explorer.stacks.co/txid/${event.txId}?chain=mainnet`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-orange-400 transition"
            >
              view tx →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
