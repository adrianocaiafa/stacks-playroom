import { useState, useCallback, useEffect } from 'react'
import { useStacksWallet } from '../../../hooks/useStacksWallet'
import { useGameEvents } from '../../../hooks/useGameEvents'
import { MastermindOverlay } from '../../../components/MastermindOverlay'
import type { MastermindResult } from '../../../components/MastermindOverlay'
import type { BaseGameEvent, MastermindGuessEvent } from '@stacks-playroom/shared'
import {
  useMastermindActiveGame,
  useMastermindAttempts,
  useMastermindPlayerStats,
  useMastermindLeaderboard,
  useMastermindActions,
  MAX_ATTEMPTS,
  CODE_LENGTH,
  type AttemptRow,
} from './useMastermind'

// Feedback dots for each attempt row
function FeedbackDots({ exact, partial }: { exact: number; partial: number }) {
  const dots = []
  for (let i = 0; i < exact; i++) dots.push('exact')
  for (let i = 0; i < partial; i++) dots.push('partial')
  while (dots.length < CODE_LENGTH) dots.push('none')
  return (
    <div className="flex gap-1 items-center">
      {dots.map((t, i) => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full border ${
            t === 'exact' ? 'bg-white border-white' :
            t === 'partial' ? 'bg-yellow-400 border-yellow-400' :
            'bg-transparent border-gray-700'
          }`}
        />
      ))}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="text-xs text-gray-500 hover:text-white transition disabled:opacity-40">
      {loading ? '...' : '↻ refresh'}
    </button>
  )
}

interface LocalGuess extends AttemptRow {
  status: 'pending' | 'confirmed'
}

interface OverlayData {
  result: MastermindResult
  exactMatches: number
  partialMatches: number
  score: number | null
  secretCode: number[] | null
  attemptsUsed: number | null
  txId: string
}

export function MastermindPage() {
  const { address } = useStacksWallet()

  const { activeGame, refresh: refreshActive } = useMastermindActiveGame(address)
  const attemptsUsed = activeGame?.attemptsUsed ?? 0
  const { attempts: chainAttempts, loading: attemptsLoading } = useMastermindAttempts(address, attemptsUsed)
  const { stats, loading: statsLoading, refresh: refreshStats } = useMastermindPlayerStats(address)
  const { entries, loading: lbLoading, refresh: refreshLb } = useMastermindLeaderboard()
  const { pending, startGame, submitGuess, giveUp, clearPending, error } = useMastermindActions(address)

  // Local state for the current game
  const [localGuesses, setLocalGuesses] = useState<LocalGuess[]>([])
  const [inputDigits, setInputDigits] = useState<(number | null)[]>(Array(CODE_LENGTH).fill(null))
  const [overlay, setOverlay] = useState<OverlayData | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)

  // Sync chain attempts into localGuesses when chain data loads
  useEffect(() => {
    if (!attemptsLoading && chainAttempts.length > 0) {
      setLocalGuesses(chainAttempts.map((a) => ({ ...a, status: 'confirmed' as const })))
    }
  }, [chainAttempts, attemptsLoading])

  // Auto-clear stale pending based on chain state
  useEffect(() => {
    if (!pending || activeGame === undefined) return

    // 'start' pending: game already active → confirmed
    if (pending.type === 'start') {
      clearPending()
      return
    }

    // 'give-up' pending: no active game → confirmed
    if (pending.type === 'give-up' && activeGame === null) {
      clearPending()
      return
    }

    // 'guess' pending: no active game means it was the last guess (game-over/victory) → clear
    if (pending.type === 'guess' && activeGame === null) {
      clearPending()
      return
    }

    // 'guess' pending: if its code is already in chain attempts → confirmed
    if (pending.type === 'guess' && pending.code && !attemptsLoading && chainAttempts.length > 0) {
      const codeKey = JSON.stringify(pending.code)
      const alreadyOnChain = chainAttempts.some((a) => JSON.stringify(a.code) === codeKey)
      if (alreadyOnChain) {
        clearPending()
      }
    }
  }, [pending, activeGame, chainAttempts, attemptsLoading, clearPending])

  // Restore pending guess row if page was reloaded with a pending tx
  useEffect(() => {
    if (pending?.type === 'guess' && pending.code) {
      setLocalGuesses((prev) => {
        const alreadyPending = prev.some((g) => g.status === 'pending')
        if (alreadyPending) return prev
        return [...prev, { code: pending.code!, exact: 0, partial: 0, status: 'pending' }]
      })
    }
  }, [pending])

  const refreshAll = useCallback(() => {
    setTimeout(() => {
      refreshActive()
      refreshStats()
      refreshLb()
    }, 3000)
  }, [refreshActive, refreshStats, refreshLb])

  const handleLiveEvent = useCallback((event: BaseGameEvent) => {
    if (!pending) return
    const normalize = (id: string) => id.replace(/^0x/i, '').toLowerCase()
    if (normalize(event.txId) !== normalize(pending.txId)) return

    refreshAll()

    if (pending.type === 'start') {
      clearPending()
      refreshActive()
      return
    }

    if (pending.type === 'give-up') {
      const mmEvent = event as MastermindGuessEvent
      clearPending()
      refreshActive()
      setLocalGuesses([])
      setOverlay({
        result: 'game-over',
        exactMatches: 0,
        partialMatches: 0,
        score: null,
        secretCode: mmEvent.secretCode ?? null,
        attemptsUsed: mmEvent.attemptsUsed ?? null,
        txId: event.txId,
      })
      return
    }

    if (pending.type === 'guess') {
      const mmEvent = event as MastermindGuessEvent
      const result = (mmEvent.result ?? 'continue') as MastermindResult
      const exact = mmEvent.exactMatches ?? 0
      const partial = mmEvent.partialMatches ?? 0

      // Update the pending row with real feedback
      setLocalGuesses((prev) => prev.map((g) =>
        g.status === 'pending'
          ? { ...g, exact, partial, status: 'confirmed' as const }
          : g,
      ))

      clearPending()

      if (result === 'victory' || result === 'game-over') {
        refreshActive()
        setLocalGuesses(result === 'game-over' ? (prev) => prev : (prev) => prev)
        if (result === 'game-over') setLocalGuesses([])
        setOverlay({
          result,
          exactMatches: exact,
          partialMatches: partial,
          score: mmEvent.score ?? null,
          secretCode: mmEvent.secretCode ?? null,
          attemptsUsed: mmEvent.attemptsUsed ?? null,
          txId: event.txId,
        })
      } else {
        // continue — refresh attempts count
        refreshActive()
        setOverlay({
          result: 'continue',
          exactMatches: exact,
          partialMatches: partial,
          score: null,
          secretCode: null,
          attemptsUsed: null,
          txId: event.txId,
        })
      }
    }
  }, [pending, clearPending, refreshAll, refreshActive])

  useGameEvents('mastermind', handleLiveEvent)

  const handleDigitInput = (pos: number, val: string) => {
    const n = parseInt(val)
    if (isNaN(n) || n < 0 || n > 9) {
      setInputDigits((prev) => { const a = [...prev]; a[pos] = null; return a })
      return
    }
    setInputDigits((prev) => { const a = [...prev]; a[pos] = n; return a })
    setInputError(null)
  }

  const handleSubmitGuess = () => {
    if (inputDigits.some((d) => d === null)) { setInputError('Fill all 5 digits'); return }
    const code = inputDigits as number[]
    if (new Set(code).size !== CODE_LENGTH) { setInputError('All digits must be unique (0–9)'); return }
    setInputError(null)
    // Optimistically add pending row
    setLocalGuesses((prev) => [...prev, { code, exact: 0, partial: 0, status: 'pending' }])
    setInputDigits(Array(CODE_LENGTH).fill(null))
    submitGuess(code)
  }

  const handleGiveUp = () => {
    if (!confirm('Give up? The secret code will be revealed.')) return
    setLocalGuesses([])
    giveUp()
  }

  const isLoading = activeGame === undefined
  const hasActiveGame = activeGame !== null && activeGame !== undefined
  const hasPendingStart = pending?.type === 'start'
  const hasPendingGuess = pending?.type === 'guess'
  const hasPendingGiveUp = pending?.type === 'give-up'
  const anyPending = !!pending

  const usedDigits = new Set(localGuesses.flatMap((g) => g.code))

  const winRate = stats && stats.totalGames > 0
    ? ((stats.wins / stats.totalGames) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {overlay && (
        <MastermindOverlay
          {...overlay}
          onClose={() => { setOverlay(null); if (overlay.result !== 'continue') setLocalGuesses([]) }}
        />
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🧠 Mastermind</h1>
        <p className="text-gray-400">Crack the secret 5-digit code (0–9, no repeats) in {MAX_ATTEMPTS} attempts.</p>
        <p className="text-sm text-gray-500 mt-1">
          <span className="text-white">⬛</span> = right digit + right spot &nbsp;·&nbsp;
          <span className="text-yellow-400">🟡</span> = right digit + wrong spot &nbsp;·&nbsp;
          No fee, just gas
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading game state…</div>
      ) : !address ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-5xl mb-3">🔐</p>
          <p className="text-gray-400">Connect your wallet to play Mastermind.</p>
        </div>
      ) : !hasActiveGame ? (
        /* ── No active game ── */
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-5xl mb-4">🎯</p>
          <h2 className="text-xl font-bold text-white mb-2">Ready to crack the code?</h2>
          <p className="text-gray-500 text-sm mb-6">A 5-digit code (0–9, all unique) will be generated on-chain.<br />You have {MAX_ATTEMPTS} attempts to guess it.</p>

          {hasPendingStart ? (
            <div className="flex items-center justify-center gap-2 text-orange-400">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-sm">Starting game, waiting for confirmation…</span>
            </div>
          ) : (
            <button
              onClick={startGame}
              disabled={anyPending}
              className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-40"
            >
              Start New Game
            </button>
          )}

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      ) : (
        /* ── Active game ── */
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-300">Attempts</h2>
              <span className="text-sm text-gray-500">{attemptsUsed} / {MAX_ATTEMPTS}</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i < localGuesses.filter((g) => g.status === 'confirmed').length
                      ? 'bg-orange-500'
                      : i < localGuesses.length
                      ? 'bg-orange-500/40 animate-pulse'
                      : 'bg-gray-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Guess history */}
          {localGuesses.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-semibold text-gray-300">Your Guesses</h2>
              </div>
              <div className="divide-y divide-gray-800/50">
                {localGuesses.map((guess, i) => (
                  <div key={i} className={`px-4 py-3 flex items-center justify-between ${guess.status === 'pending' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                      <div className="flex gap-1.5">
                        {guess.code.map((d, j) => (
                          <div
                            key={j}
                            className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-white text-sm"
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {guess.status === 'pending' ? (
                        <span className="text-xs text-orange-400 animate-pulse">confirming…</span>
                      ) : (
                        <>
                          <FeedbackDots exact={guess.exact} partial={guess.partial} />
                          <div className="text-xs text-gray-500 text-right">
                            <span className="text-white font-semibold">{guess.exact}</span> exact,{' '}
                            <span className="text-yellow-400 font-semibold">{guess.partial}</span> partial
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input for new guess */}
          {!hasPendingGuess && !hasPendingGiveUp && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-gray-300 mb-4">Enter your guess</h2>

              {/* Digit input */}
              <div className="flex gap-2 mb-4">
                {inputDigits.map((d, i) => (
                  <input
                    key={i}
                    type="number"
                    min={0}
                    max={9}
                    value={d ?? ''}
                    onChange={(e) => handleDigitInput(i, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder={`${i + 1}`}
                    className={`w-12 h-12 text-center font-bold text-lg rounded-lg border bg-gray-800 text-white outline-none focus:ring-2 focus:ring-orange-500 transition ${
                      d !== null && usedDigits.has(d)
                        ? 'border-yellow-500/50'
                        : 'border-gray-700'
                    }`}
                  />
                ))}
              </div>

              {/* Used digits hint */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {Array.from({ length: 10 }).map((_, n) => (
                  <span
                    key={n}
                    className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold border ${
                      usedDigits.has(n)
                        ? 'bg-gray-700 border-gray-600 text-gray-500 line-through'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    {n}
                  </span>
                ))}
                <span className="text-xs text-gray-600 self-center ml-1">Digits used in previous guesses</span>
              </div>

              {inputError && <p className="text-red-400 text-sm mb-3">{inputError}</p>}
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              {/* Escape hatch if pending got stuck */}
              {(hasPendingGuess || hasPendingGiveUp) && (
                <p className="text-xs text-gray-600 mb-2">
                  Waiting for confirmation…{' '}
                  <button onClick={clearPending} className="text-orange-600 hover:text-orange-400 underline">
                    stuck? clear pending
                  </button>
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitGuess}
                  disabled={hasPendingGuess || hasPendingGiveUp || inputDigits.some((d) => d === null)}
                  className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-40"
                >
                  Submit Guess
                </button>
                <button
                  onClick={handleGiveUp}
                  disabled={hasPendingGuess || hasPendingGiveUp}
                  className="px-4 py-3 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-red-400 transition disabled:opacity-40 text-sm"
                >
                  Give Up
                </button>
              </div>
            </div>
          )}

          {/* Pending confirmations */}
          {(hasPendingGuess || hasPendingGiveUp) && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-orange-400 text-sm font-medium">
                  {hasPendingGuess ? 'Guess submitted, waiting for block confirmation…' : 'Give up submitted, waiting for confirmation…'}
                </p>
                {pending?.txId && (
                  <a
                    href={`https://explorer.stacks.co/txid/${pending.txId}?chain=mainnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-orange-600 hover:text-orange-400"
                  >
                    {pending.txId.slice(0, 20)}…{pending.txId.slice(-8)}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats + Leaderboard row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-300">Your Stats</h2>
            <RefreshButton onClick={refreshStats} loading={statsLoading} />
          </div>
          {!address ? (
            <p className="text-gray-500 text-sm">Connect wallet to see stats.</p>
          ) : !stats ? (
            <p className="text-gray-500 text-sm">No games yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Games" value={stats.totalGames} color="text-white" />
                <StatCard label="Wins" value={stats.wins} color="text-green-400" />
                <StatCard label="Win Rate" value={`${winRate}%`} color="text-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                <StatCard label="Best Attempts" value={stats.bestAttempts || '—'} color="text-orange-400" />
                <StatCard label="Perfect Games" value={stats.perfectGames} color="text-yellow-400" />
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-between items-center p-5 border-b border-gray-800">
            <h2 className="font-semibold text-gray-300">🏆 Leaderboard</h2>
            <RefreshButton onClick={refreshLb} loading={lbLoading} />
          </div>
          {lbLoading ? (
            <p className="text-gray-500 text-sm text-center py-6">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No players yet.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {entries.map((entry, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
                const wr = entry.totalGames > 0
                  ? ((entry.wins / entry.totalGames) * 100).toFixed(0)
                  : '0'
                return (
                  <div key={entry.address} className="px-5 py-3 flex justify-between items-center hover:bg-gray-800/30">
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-8 text-center">{medal}</span>
                      <div>
                        <p className="text-sm font-mono text-gray-300">
                          {entry.address.slice(0, 8)}…{entry.address.slice(-6)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.wins}W / {entry.totalGames} games ({wr}%)
                          {entry.perfectGames > 0 && ` · ⚡ ${entry.perfectGames} perfect`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-400">
                        {entry.bestAttempts ? `${entry.bestAttempts} attempts` : '—'}
                      </p>
                      <p className="text-xs text-gray-600">best solve</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
