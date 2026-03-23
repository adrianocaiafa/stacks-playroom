import { useEffect, useState } from 'react'

interface DiceResultOverlayProps {
  userChoice: number | null
  diceResult: number | null
  won: boolean | null
  txId: string | null
  onClose: () => void
}

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

function RandomDice({ final, delay = 0 }: { final: number | null; delay?: number }) {
  const [shown, setShown] = useState(Math.ceil(Math.random() * 6))

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setShown(Math.ceil(Math.random() * 6))
      i++
      if (i > 10 + delay) {
        clearInterval(interval)
        setShown(final ?? Math.ceil(Math.random() * 6))
      }
    }, 80)
    return () => clearInterval(interval)
  }, [final, delay])

  return <span>{DICE_FACES[shown]}</span>
}

export function DiceResultOverlay({ userChoice, diceResult, won, txId, onClose }: DiceResultOverlayProps) {
  const [phase, setPhase] = useState<'rolling' | 'result'>('rolling')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('result'), 1400)
    const t2 = setTimeout(() => onClose(), 6000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={phase === 'result' ? onClose : undefined}
    >
      <div
        className="relative text-center px-10 py-10 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl w-[380px]"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'rolling' ? (
          <div>
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">Rolling the dice...</p>
            <p className="text-9xl">
              <RandomDice final={diceResult} />
            </p>
            <p className="text-gray-600 text-sm mt-4 animate-pulse">Waiting for result</p>
          </div>
        ) : (
          <div>
            {/* Outcome glow ring */}
            <div className={`absolute inset-0 rounded-2xl pointer-events-none ${
              won
                ? 'shadow-[0_0_60px_rgba(34,197,94,0.25)]'
                : 'shadow-[0_0_60px_rgba(239,68,68,0.2)]'
            }`} />

            {/* Dice comparison */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">You chose</p>
                <p className="text-6xl">{DICE_FACES[userChoice ?? 1]}</p>
                <p className="text-gray-500 text-sm mt-1">{userChoice}</p>
              </div>

              <p className="text-3xl text-gray-700 mb-2">vs</p>

              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Dice rolled</p>
                <p className={`text-6xl transition-all ${
                  won
                    ? 'drop-shadow-[0_0_16px_rgba(34,197,94,0.9)]'
                    : 'drop-shadow-[0_0_16px_rgba(239,68,68,0.7)]'
                }`}>
                  {DICE_FACES[diceResult ?? 1]}
                </p>
                <p className="text-gray-500 text-sm mt-1">{diceResult}</p>
              </div>
            </div>

            {/* Win / Lose banner */}
            <div className={`rounded-xl py-4 px-5 mb-5 ${
              won
                ? 'bg-green-500/10 border border-green-500/25'
                : 'bg-red-500/8 border border-red-500/20'
            }`}>
              {won ? (
                <>
                  <p className="text-4xl font-black text-green-400 tracking-tight">YOU WON! 🎉</p>
                  <p className="text-green-600 mt-1 text-sm">+10 points earned</p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-black text-red-400 tracking-tight">NICE TRY</p>
                  <p className="text-gray-600 mt-1 text-sm">Better luck next roll</p>
                </>
              )}
            </div>

            {/* TX + close */}
            <div className="flex items-center justify-between">
              {txId ? (
                <a
                  href={`https://explorer.stacks.co/txid/${txId}?chain=mainnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gray-700 hover:text-orange-400 transition"
                >
                  view on explorer →
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
