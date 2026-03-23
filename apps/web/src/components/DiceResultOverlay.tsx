import { useEffect, useState } from 'react'

interface DiceResultOverlayProps {
  userChoice: number | null
  diceResult: number | null
  won: boolean | null
  txId: string | null
  onClose: () => void
}

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

function RollingDice({ final }: { final: number | null }) {
  const [shown, setShown] = useState(() => Math.ceil(Math.random() * 6))

  useEffect(() => {
    let count = 0
    const max = 14
    const interval = setInterval(() => {
      count++
      if (count >= max) {
        clearInterval(interval)
        setShown(final ?? Math.ceil(Math.random() * 6))
      } else {
        setShown(Math.ceil(Math.random() * 6))
      }
    }, 75)
    return () => clearInterval(interval)
  }, [final])

  return <span>{DICE_FACES[shown]}</span>
}

export function DiceResultOverlay({ userChoice, diceResult, won, txId, onClose }: DiceResultOverlayProps) {
  const [phase, setPhase] = useState<'rolling' | 'result'>('rolling')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('result'), 1500)
    const t2 = setTimeout(() => onClose(), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  const isWin = won === true
  const resultKnown = won !== null

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
        {phase === 'rolling' ? (
          /* ── Rolling phase ───────────────────────────────── */
          <div className="py-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-5">Rolling the dice</p>
            <p className="text-9xl leading-none">
              <RollingDice final={diceResult} />
            </p>
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
          /* ── Result phase ────────────────────────────────── */
          <div>
            {/* Dice comparison row */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Your pick</p>
                <p className="text-6xl leading-none">{DICE_FACES[userChoice ?? 1]}</p>
                <p className="text-gray-600 text-xs mt-1">{userChoice ?? '?'}</p>
              </div>

              <p className="text-2xl text-gray-700 mt-1">vs</p>

              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Dice rolled</p>
                <p
                  className="text-6xl leading-none"
                  style={resultKnown ? {
                    filter: isWin
                      ? 'drop-shadow(0 0 14px rgba(34,197,94,0.9))'
                      : 'drop-shadow(0 0 14px rgba(239,68,68,0.7))',
                  } : undefined}
                >
                  {diceResult ? DICE_FACES[diceResult] : '🎲'}
                </p>
                <p className="text-gray-600 text-xs mt-1">{diceResult ?? '?'}</p>
              </div>
            </div>

            {/* Outcome banner */}
            {resultKnown ? (
              <div
                className={`rounded-xl py-4 px-5 mb-5 border ${
                  isWin
                    ? 'bg-green-950/60 border-green-700/30'
                    : 'bg-red-950/60 border-red-700/20'
                }`}
              >
                {isWin ? (
                  <>
                    <p className="text-4xl font-black text-green-400 tracking-tight">YOU WON!</p>
                    <p className="text-green-600 text-sm mt-1">+10 points 🎉</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-black text-red-400 tracking-tight">NICE TRY</p>
                    <p className="text-gray-600 text-sm mt-1">Better luck next roll</p>
                  </>
                )}
              </div>
            ) : (
              /* result not yet parsed — still show something */
              <div className="rounded-xl py-4 px-5 mb-5 border border-gray-800 bg-gray-900">
                <p className="text-3xl font-black text-gray-300">Roll confirmed ✓</p>
                <p className="text-gray-600 text-sm mt-1">Checking result on-chain…</p>
              </div>
            )}

            {/* Bottom row */}
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
