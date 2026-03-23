import { useEffect, useState } from 'react'
import type { RPSResult } from '../games/casual/rock-paper-scissors/useRPS'
import { CHOICE_EMOJI, CHOICE_LABEL } from '../games/casual/rock-paper-scissors/useRPS'

interface RPSResultOverlayProps {
  userChoice: number | null
  contractChoice: number | null
  result: RPSResult | null
  txId: string | null
  onClose: () => void
}

function RandomChoice({ final }: { final: number | null }) {
  const [shown, setShown] = useState(1)

  useEffect(() => {
    let count = 0
    const interval = setInterval(() => {
      count++
      setShown((s) => (s % 3) + 1)
      if (count >= 12) {
        clearInterval(interval)
        setShown(final ?? 1)
      }
    }, 90)
    return () => clearInterval(interval)
  }, [final])

  return <span>{CHOICE_EMOJI[shown]}</span>
}

const RESULT_CONFIG = {
  win:  { label: 'YOU WIN! 🎉', sub: '+10 points earned',     bg: 'bg-green-950/60 border-green-700/30', text: 'text-green-400',  glow: 'rgba(34,197,94,0.3)' },
  loss: { label: 'YOU LOSE',    sub: 'Better luck next round', bg: 'bg-red-950/60 border-red-700/20',    text: 'text-red-400',    glow: 'rgba(239,68,68,0.25)' },
  draw: { label: "IT'S A DRAW", sub: 'No points this round',   bg: 'bg-gray-800/80 border-gray-600/30',  text: 'text-yellow-400', glow: 'rgba(234,179,8,0.2)' },
}

export function RPSResultOverlay({ userChoice, contractChoice, result, txId, onClose }: RPSResultOverlayProps) {
  const [phase, setPhase] = useState<'battle' | 'result'>('battle')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('result'), 1600)
    const t2 = setTimeout(() => onClose(), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  const cfg = result ? RESULT_CONFIG[result] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={phase === 'result' ? onClose : undefined}
    >
      <div
        className="relative text-center px-8 py-8 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={
          phase === 'result' && cfg
            ? { boxShadow: `0 0 60px ${cfg.glow}, 0 0 120px ${cfg.glow.replace('0.3', '0.1').replace('0.25', '0.08').replace('0.2', '0.06')}` }
            : undefined
        }
      >
        {phase === 'battle' ? (
          /* ── Battle phase ─────────────────────────── */
          <div className="py-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">Round in progress</p>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-7xl leading-none">{CHOICE_EMOJI[userChoice ?? 1]}</p>
                <p className="text-xs text-gray-600 mt-2">You</p>
              </div>
              <p className="text-3xl text-gray-700 animate-pulse">⚔️</p>
              <div className="text-center">
                <p className="text-7xl leading-none"><RandomChoice final={contractChoice} /></p>
                <p className="text-xs text-gray-600 mt-2">Contract</p>
              </div>
            </div>
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
          /* ── Result phase ──────────────────────────── */
          <div>
            {/* Side by side */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">You played</p>
                <p className="text-6xl leading-none">{CHOICE_EMOJI[userChoice ?? 1]}</p>
                <p className="text-gray-500 text-xs mt-2">{CHOICE_LABEL[userChoice ?? 1]}</p>
              </div>

              <div className="text-center mb-4">
                {result === 'win' && <p className="text-3xl">🏆</p>}
                {result === 'loss' && <p className="text-3xl">💔</p>}
                {result === 'draw' && <p className="text-3xl">🤝</p>}
              </div>

              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Contract played</p>
                <p
                  className="text-6xl leading-none"
                  style={result ? {
                    filter: result === 'win'
                      ? 'drop-shadow(0 0 12px rgba(239,68,68,0.7))'
                      : result === 'loss'
                      ? 'drop-shadow(0 0 12px rgba(34,197,94,0.8))'
                      : 'none',
                  } : undefined}
                >
                  {CHOICE_EMOJI[contractChoice ?? 1]}
                </p>
                <p className="text-gray-500 text-xs mt-2">{CHOICE_LABEL[contractChoice ?? 1]}</p>
              </div>
            </div>

            {/* Banner */}
            {cfg ? (
              <div className={`rounded-xl py-4 px-5 mb-5 border ${cfg.bg}`}>
                <p className={`text-4xl font-black tracking-tight ${cfg.text}`}>{cfg.label}</p>
                <p className="text-gray-600 text-sm mt-1">{cfg.sub}</p>
              </div>
            ) : (
              <div className="rounded-xl py-4 px-5 mb-5 border border-gray-800 bg-gray-900">
                <p className="text-3xl font-black text-gray-300">Game confirmed ✓</p>
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
