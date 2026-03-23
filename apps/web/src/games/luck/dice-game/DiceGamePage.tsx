import { useState, useCallback } from 'react'
import { useStacksWallet } from '../../../hooks/useStacksWallet'
import { useGameEvents } from '../../../hooks/useGameEvents'
import { LiveEventToast } from '../../../components/LiveEventToast'
import { DiceResultOverlay } from '../../../components/DiceResultOverlay'
import type { BaseGameEvent, DiceRollEvent } from '@stacks-playroom/shared'
import {
  useDiceGlobalStats,
  useDiceUserStats,
  useDiceHistory,
  useDiceLeaderboard,
  useRollDice,
} from './useDiceGame'

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

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
    <button
      onClick={onClick}
      disabled={loading}
      className="text-xs text-gray-500 hover:text-white transition disabled:opacity-40"
    >
      {loading ? '...' : '↻ refresh'}
    </button>
  )
}

interface OverlayData {
  txId: string
  userChoice: number | null
  diceResult: number | null
  won: boolean | null
}

export function DiceGamePage() {
  const { address } = useStacksWallet()
  const [selected, setSelected] = useState<number | null>(null)
  const [liveEvent, setLiveEvent] = useState<BaseGameEvent | null>(null)
  const [overlay, setOverlay] = useState<OverlayData | null>(null)

  const { stats: global, loading: globalLoading, refresh: refreshGlobal } = useDiceGlobalStats()
  const { stats: user, loading: userLoading, refresh: refreshUser } = useDiceUserStats(address)
  const { history, totalRolls, loading: histLoading, refresh: refreshHistory } = useDiceHistory(address)
  const { entries, loading: lbLoading, refresh: refreshLb } = useDiceLeaderboard()
  const { roll, rolling, txId, error } = useRollDice(address)

  const refreshAll = useCallback(() => {
    setTimeout(() => {
      refreshGlobal()
      refreshUser()
      refreshHistory()
      refreshLb()
    }, 3000)
  }, [refreshGlobal, refreshUser, refreshHistory, refreshLb])

  // SSE — if the event is the user's own tx show the overlay, otherwise show toast
  const handleLiveEvent = useCallback((event: BaseGameEvent) => {
    refreshAll()

    const diceEvent = event as DiceRollEvent
    // txId from useRollDice is the pending tx the user submitted
    if (txId && event.txId.toLowerCase() === txId.toLowerCase()) {
      setOverlay({
        txId: event.txId,
        userChoice: diceEvent.userChoice ?? null,
        diceResult: diceEvent.diceResult ?? null,
        won: diceEvent.won ?? null,
      })
    } else {
      setLiveEvent(event)
    }
  }, [txId, refreshAll])

  useGameEvents('dice-game', handleLiveEvent)

  const winRate =
    user && user.totalRolls > 0
      ? ((user.wins / user.totalRolls) * 100).toFixed(1)
      : '0.0'

  const handleRoll = async () => {
    if (selected === null) return
    await roll(selected)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <LiveEventToast event={liveEvent} />
      {overlay && (
        <DiceResultOverlay
          userChoice={overlay.userChoice}
          diceResult={overlay.diceResult}
          won={overlay.won}
          txId={overlay.txId}
          onClose={() => setOverlay(null)}
        />
      )}
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🎲 Dice Game</h1>
        <p className="text-gray-400">Choose a number 1–6. If the dice matches, you earn 10 points.</p>
        <p className="text-sm text-gray-500 mt-1">Cost: <span className="text-orange-400 font-medium">0.01 STX</span> per roll</p>
      </div>

      {/* Global stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-300">Global Stats</h2>
          <RefreshButton onClick={refreshGlobal} loading={globalLoading} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <StatCard label="Total Rolls" value={global?.totalRolls ?? '—'} color="text-orange-400" />
          <StatCard label="Players" value={global?.userCount ?? '—'} color="text-purple-400" />
        </div>
      </div>

      {/* Roll + User stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roll form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-300 mb-4">Roll the Dice</h2>

          <div className="grid grid-cols-6 gap-2 mb-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setSelected(n)}
                disabled={rolling}
                className={`py-3 rounded-lg text-2xl transition ${
                  selected === n
                    ? 'bg-orange-500 text-white ring-2 ring-orange-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                } disabled:opacity-50`}
              >
                {DICE_FACES[n]}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          {txId && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
              <p className="text-green-400 text-sm font-medium">Transaction submitted!</p>
              <a
                href={`https://explorer.stacks.co/txid/${txId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-green-500 hover:underline break-all"
              >
                {txId}
              </a>
            </div>
          )}

          <button
            onClick={handleRoll}
            disabled={rolling || selected === null || !address}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!address
              ? 'Connect wallet to play'
              : rolling
              ? 'Waiting for wallet...'
              : selected === null
              ? 'Select a number'
              : `Roll ${DICE_FACES[selected]} — 0.01 STX`}
          </button>
        </div>

        {/* User stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-300">Your Stats</h2>
            <RefreshButton onClick={refreshUser} loading={userLoading} />
          </div>

          {!address ? (
            <p className="text-gray-500 text-sm">Connect your wallet to see stats.</p>
          ) : !user ? (
            <p className="text-gray-500 text-sm">No rolls yet. Make your first roll!</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Rolls" value={user.totalRolls} color="text-white" />
                <StatCard label="Wins" value={user.wins} color="text-green-400" />
                <StatCard label="Points" value={user.totalPoints} color="text-orange-400" />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                <StatCard label="Streak" value={user.winStreak} color="text-yellow-400" />
                <StatCard label="Best Streak" value={user.longestStreak} color="text-yellow-500" />
                <StatCard label="Win Rate" value={`${winRate}%`} color="text-blue-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex justify-between items-center p-5 border-b border-gray-800">
          <h2 className="font-semibold text-gray-300">🏆 Leaderboard</h2>
          <RefreshButton onClick={refreshLb} loading={lbLoading} />
        </div>
        {lbLoading ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No players yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {entries.map((entry, i) => {
              const wr =
                entry.totalRolls > 0
                  ? ((entry.wins / entry.totalRolls) * 100).toFixed(1)
                  : '0.0'
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
              return (
                <div key={entry.address} className="px-5 py-4 flex justify-between items-center hover:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{medal}</span>
                    <div>
                      <p className="text-sm font-mono text-gray-300">
                        {entry.address.slice(0, 8)}…{entry.address.slice(-6)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.totalRolls} rolls · {entry.wins} wins ({wr}%)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-400">{entry.totalPoints} pts</p>
                    <p className="text-xs text-gray-500">best streak: {entry.longestStreak}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Roll history */}
      {address && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-between items-center p-5 border-b border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-300">Your History</h2>
              <p className="text-xs text-gray-500 mt-0.5">{totalRolls} total rolls</p>
            </div>
            <RefreshButton onClick={refreshHistory} loading={histLoading} />
          </div>
          {histLoading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No rolls yet.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {history.map((entry) => (
                <div key={entry.rollId} className="px-5 py-3 flex justify-between items-center hover:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{entry.won ? '🎉' : '😔'}</span>
                    <div>
                      <p className="text-sm text-gray-300">Roll #{entry.rollId + 1}</p>
                      <p className="text-xs text-gray-500">
                        You chose {DICE_FACES[entry.userChoice]}{entry.userChoice} · Rolled {DICE_FACES[entry.diceResult]}{entry.diceResult}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${entry.won ? 'text-green-400' : 'text-gray-600'}`}>
                    {entry.won ? `+${entry.points} pts` : 'no win'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
