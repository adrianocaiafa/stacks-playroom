import { useEffect, useState } from 'react'
import { HEADS } from '../games/luck/coin-flip/useCoinFlip'

interface CoinResultOverlayProps {
  userChoice: number | null
  coinResult: number | null
  won: boolean | null
  txId: string | null
  onClose: () => void
}

function SpinningCoin({ final }: { final: number | null }) {
  const [side, setSide] = useState(0)
  const [spinning, setSpinning] = useState(true)

  useEffect(() => {
    let count = 0
    const interval = setInterval(() => {
      count++
      setSide((s) => 1 - s)
      if (count >= 12) {
        clearInterval(interval)
        setSide(final ?? 0)
        setSpinning(false)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [final])

  const isHeads = side === HEADS

  return (
    <div
      className="w-28 h-28 rounded-full flex items-center justify-center text-5xl font-black mx-auto border-4 transition-all duration-100"
      style={{
        transform: spinning ? `scaleX(${Math.sin(Date.now() / 100)})` : 'scaleX(1)',
        background: isHeads
          ? 'radial-gradient(circle at 35% 35%, #fde68a, #d97706)'
          : 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c3aed)',
        borderColor: isHeads ? '#92400e' : '#4c1d95',
        boxShadow: isHeads
          ? '0 4px 20px rgba(217,119,6,0.5)'
          : '0 4px 20px rgba(124,58,237,0.5)',
      }}
    >
      {isHeads ? '👑' : '🌕'}
    </div>
  )
}

export function CoinResultOverlay({ userChoice, coinResult, won, txId, onClose }: CoinResultOverlayProps) {
  const [phase, setPhase] = useState<'flipping' | 'result'>('flipping')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('result'), 1600)
    const t2 = setTimeout(() => onClose(), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  const isWin = won === true
  const resultKnown = won !== null

  const sideLabel = (v: number | null) => v === HEADS ? 'HEADS' : v === 1 ? 'TAILS' : '?'
  const sideEmoji = (v: number | null) => v === HEADS ? '👑' : v === 1 ? '🌕' : '🪙'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={phase === 'result' ? onClose : undefined}
    >
      <div
        className="relative text-center px-8 py-8 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={
          phase === 'result' && resultKnown
            ? { boxShadow: isWin
                ? '0 0 60px rgba(34,197,94,0.3), 0 0 120px rgba(34,197,94,0.1)'
                : '0 0 60px rgba(239,68,68,0.25), 0 0 120px rgba(239,68,68,0.08)' }
            : undefined
        }
      >
        {phase === 'flipping' ? (
          <div className="py-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">Flipping the coin</p>
            <SpinningCoin final={coinResult} />
            <div className="flex justify-center gap-1 mt-6">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Choice vs result */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">You picked</p>
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto border-2"
                  style={userChoice === HEADS
                    ? { background: 'radial-gradient(circle at 35% 35%, #fde68a, #d97706)', borderColor: '#92400e' }
                    : { background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c3aed)', borderColor: '#4c1d95' }
                  }
                >
                  {sideEmoji(userChoice)}
                </div>
                <p className="text-gray-500 text-xs mt-2">{sideLabel(userChoice)}</p>
              </div>

              <p className="text-2xl text-gray-700 mb-4">vs</p>

              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Coin landed</p>
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto border-2"
                  style={{
                    ...(coinResult === HEADS
                      ? { background: 'radial-gradient(circle at 35% 35%, #fde68a, #d97706)', borderColor: '#92400e' }
                      : { background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c3aed)', borderColor: '#4c1d95' }
                    ),
                    filter: resultKnown
                      ? isWin ? 'drop-shadow(0 0 12px rgba(34,197,94,0.8))' : 'drop-shadow(0 0 12px rgba(239,68,68,0.7))'
                      : undefined,
                  }}
                >
                  {sideEmoji(coinResult)}
                </div>
                <p className="text-gray-500 text-xs mt-2">{sideLabel(coinResult)}</p>
              </div>
            </div>

            {/* Outcome banner */}
            {resultKnown ? (
              <div className={`rounded-xl py-4 px-5 mb-5 border ${
                isWin
                  ? 'bg-green-950/60 border-green-700/30'
                  : 'bg-red-950/60 border-red-700/20'
              }`}>
                {isWin ? (
                  <>
                    <p className="text-4xl font-black text-green-400 tracking-tight">YOU WON! 🎉</p>
                    <p className="text-green-600 text-sm mt-1">+5 points earned</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-black text-red-400 tracking-tight">NICE TRY</p>
                    <p className="text-gray-600 text-sm mt-1">Better luck next flip</p>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-xl py-4 px-5 mb-5 border border-gray-800 bg-gray-900">
                <p className="text-3xl font-black text-gray-300">Flip confirmed ✓</p>
                <p className="text-gray-600 text-sm mt-1">Checking result on-chain…</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              {txId ? (
                <a
                  href={`https://explorer.stacks.co/txid/${txId}?chain=mainnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gray-700 hover:text-orange-400 transition"
                >
                  explorer →
                </a>
              ) : <span />}
              <button
                onClick={onClose}
                className="text-xs text-gray-600 hover:text-white transition px-3 py-1.5 bg-gray-800 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
