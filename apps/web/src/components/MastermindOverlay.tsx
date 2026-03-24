import { useEffect } from 'react'

export type MastermindResult = 'victory' | 'game-over' | 'continue'

interface MastermindOverlayProps {
  result: MastermindResult
  exactMatches: number
  partialMatches: number
  score: number | null
  secretCode: number[] | null
  attemptsUsed: number | null
  txId: string | null
  onClose: () => void
}

export function MastermindOverlay({
  result, exactMatches, partialMatches, score, secretCode, attemptsUsed, txId, onClose,
}: MastermindOverlayProps) {
  const autoClose = result === 'continue' ? 3000 : 8000

  useEffect(() => {
    const t = setTimeout(onClose, autoClose)
    return () => clearTimeout(t)
  }, [onClose, autoClose])

  if (result === 'continue') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center pb-8 pointer-events-none"
      >
        <div className="bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 pointer-events-auto">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{exactMatches}</p>
            <p className="text-xs text-gray-500">⬛ Exact</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <p className="text-2xl font-black text-yellow-400">{partialMatches}</p>
            <p className="text-xs text-gray-500">🟡 Partial</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <p className="text-gray-400 text-sm">Keep going!</p>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xs ml-2">✕</button>
        </div>
      </div>
    )
  }

  const isVictory = result === 'victory'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="text-center px-8 py-8 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: isVictory
            ? '0 0 60px rgba(34,197,94,0.3), 0 0 120px rgba(34,197,94,0.1)'
            : '0 0 60px rgba(239,68,68,0.25), 0 0 120px rgba(239,68,68,0.08)',
        }}
      >
        <p className="text-5xl mb-3">{isVictory ? '🏆' : '💀'}</p>
        <p className={`text-4xl font-black tracking-tight mb-1 ${isVictory ? 'text-green-400' : 'text-red-400'}`}>
          {isVictory ? 'CODE CRACKED!' : 'GAME OVER'}
        </p>
        <p className="text-gray-500 text-sm mb-5">
          {isVictory
            ? `Solved in ${attemptsUsed} attempt${attemptsUsed !== 1 ? 's' : ''} · ${score} pts`
            : `The secret code was revealed`}
        </p>

        {/* Secret code reveal */}
        {secretCode && (
          <div className="mb-5">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Secret Code</p>
            <div className="flex justify-center gap-2">
              {secretCode.map((d, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black border-2 ${
                    isVictory
                      ? 'bg-green-500/20 border-green-500/40 text-green-300'
                      : 'bg-red-500/15 border-red-500/30 text-red-300'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score breakdown for victory */}
        {isVictory && score !== null && (
          <div className="bg-green-950/40 border border-green-700/20 rounded-xl p-3 mb-4">
            <p className="text-green-500 text-sm">Score: <span className="font-bold text-green-400">{score} pts</span></p>
            <p className="text-gray-600 text-xs mt-0.5">1100 − ({attemptsUsed} × 100) = {score}</p>
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
    </div>
  )
}
