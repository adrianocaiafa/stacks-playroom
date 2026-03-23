import { useState, useCallback } from 'react'
import { useStacksWallet } from '../../../hooks/useStacksWallet'
import { useGameEvents } from '../../../hooks/useGameEvents'
import { LiveEventToast } from '../../../components/LiveEventToast'
import { RPSResultOverlay } from '../../../components/RPSResultOverlay'
import type { BaseGameEvent, RPSGameEvent } from '@stacks-playroom/shared'
import {
  useRPSGlobalStats,
  useRPSUserStats,
  useRPSHistory,
  useRPSLeaderboard,
  usePlayRPS,
  ROCK, PAPER, SCISSORS,
  CHOICE_EMOJI, CHOICE_LABEL,
  type RPSChoice,
  type RPSResult,
} from './useRPS'

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

const RESULT_BADGE: Record<RPSResult, { label: string; color: string }> = {
  win:  { label: 'WIN',  color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  loss: { label: 'LOSS', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  draw: { label: 'DRAW', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}

interface OverlayData {
  txId: string
  userChoice: number | null
  contractChoice: number | null
  result: RPSResult | null
}

const CHOICES = [ROCK, PAPER, SCISSORS] as RPSChoice[]

export function RPSPage() {
  const { address } = useStacksWallet()
  const [selected, setSelected] = useState<RPSChoice | null>(null)
  const [liveEvent, setLiveEvent] = useState<BaseGameEvent | null>(null)
  const [overlay, setOverlay] = useState<OverlayData | null>(null)

  const { stats: global, loading: globalLoading, refresh: refreshGlobal } = useRPSGlobalStats()
  const { stats: user, loading: userLoading, refresh: refreshUser } = useRPSUserStats(address)
  const { history, totalGames, loading: histLoading, refresh: refreshHistory } = useRPSHistory(address)
  const { entries, loading: lbLoading, refresh: refreshLb } = useRPSLeaderboard()
  const { play, playing, txId, error, clearPendingTx } = usePlayRPS(address)

  const refreshAll = useCallback(() => {
    setTimeout(() => { refreshGlobal(); refreshUser(); refreshHistory(); refreshLb() }, 3000)
  }, [refreshGlobal, refreshUser, refreshHistory, refreshLb])

  const handleLiveEvent = useCallback((event: BaseGameEvent) => {
    refreshAll()
    const rpsEvent = event as RPSGameEvent
    const normalize = (id: string) => id.replace(/^0x/i, '').toLowerCase()
    if (txId && normalize(event.txId) === normalize(txId)) {
      setOverlay({
        txId: event.txId,
        userChoice: rpsEvent.userChoice ?? null,
        contractChoice: rpsEvent.contractChoice ?? null,
        result: rpsEvent.result ?? null,
      })
    } else {
      setLiveEvent(event)
    }
  }, [txId, refreshAll])

  useGameEvents('rock-paper-scissors', handleLiveEvent)

  const winRate = user && user.totalGames > 0
    ? ((user.wins / user.totalGames) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <LiveEventToast event={liveEvent} />
      {overlay && (
        <RPSResultOverlay
          userChoice={overlay.userChoice}
          contractChoice={overlay.contractChoice}
          result={overlay.result}
          txId={overlay.txId}
          onClose={() => { setOverlay(null); clearPendingTx() }}
        />
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🪨📄✂️ Rock Paper Scissors</h1>
        <p className="text-gray-400">Choose your move. Beat the contract. Win points.</p>
        <p className="text-sm text-gray-500 mt-1">Cost: <span className="text-orange-400 font-medium">0.01 STX</span> per game</p>
      </div>

      {/* Global stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-300">Global Stats</h2>
          <RefreshButton onClick={refreshGlobal} loading={globalLoading} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <StatCard label="Total Games" value={global?.totalGames ?? '—'} color="text-orange-400" />
          <StatCard label="Players" value={global?.userCount ?? '—'} color="text-purple-400" />
        </div>
      </div>

      {/* Play + User stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Play form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-300 mb-5">Make your move</h2>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {CHOICES.map((choice) => (
              <button
                key={choice}
                onClick={() => setSelected(choice)}
                disabled={playing}
                className={`py-5 rounded-xl flex flex-col items-center gap-2 border-2 transition ${
                  selected === choice
                    ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-750'
                } disabled:opacity-50`}
              >
                <span className="text-4xl">{CHOICE_EMOJI[choice]}</span>
                <span className="font-semibold text-xs tracking-wide">{CHOICE_LABEL[choice]}</span>
              </button>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          {txId && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <p className="text-orange-400 text-sm font-medium">Waiting for confirmation…</p>
              </div>
              <p className="text-xs text-gray-600">Result overlay will appear when confirmed.</p>
              <a
                href={`https://explorer.stacks.co/txid/${txId}?chain=mainnet`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-orange-600 hover:text-orange-400 break-all mt-1 block"
              >
                {txId.slice(0, 20)}…{txId.slice(-8)}
              </a>
            </div>
          )}

          <button
            onClick={() => selected !== null && play(selected)}
            disabled={playing || selected === null || !address}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!address
              ? 'Connect wallet to play'
              : playing
              ? 'Waiting for wallet...'
              : selected === null
              ? 'Select a move'
              : `Play ${CHOICE_EMOJI[selected]} ${CHOICE_LABEL[selected]} — 0.01 STX`}
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
            <p className="text-gray-500 text-sm">No games yet. Make your first move!</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Games" value={user.totalGames} color="text-white" />
                <StatCard label="Points" value={user.totalPoints} color="text-orange-400" />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-800">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-400">{user.wins}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Wins</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-400">{user.losses}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Losses</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-yellow-400">{user.draws}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Draws</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                <StatCard label="Win Rate" value={`${winRate}%`} color="text-blue-400" />
                <StatCard label="Streak" value={user.winStreak} color="text-yellow-400" />
                <StatCard label="Best Streak" value={user.longestStreak} color="text-yellow-500" />
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
              const wr = entry.totalGames > 0
                ? ((entry.wins / entry.totalGames) * 100).toFixed(1)
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
                        {entry.totalGames} games · {entry.wins}W {entry.losses}L {entry.draws}D ({wr}%)
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

      {/* History */}
      {address && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-between items-center p-5 border-b border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-300">Your History</h2>
              <p className="text-xs text-gray-500 mt-0.5">{totalGames} total games</p>
            </div>
            <RefreshButton onClick={refreshHistory} loading={histLoading} />
          </div>
          {histLoading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No games yet.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {history.map((entry) => {
                const badge = RESULT_BADGE[entry.result]
                return (
                  <div key={entry.gameId} className="px-5 py-3 flex justify-between items-center hover:bg-gray-800/30">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <div>
                        <p className="text-sm text-gray-300">
                          {CHOICE_EMOJI[entry.userChoice]} {CHOICE_LABEL[entry.userChoice]}
                          <span className="text-gray-600 mx-2">vs</span>
                          {CHOICE_EMOJI[entry.contractChoice]} {CHOICE_LABEL[entry.contractChoice]}
                        </p>
                        <p className="text-xs text-gray-600">Game #{entry.gameId + 1}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${entry.result === 'win' ? 'text-green-400' : 'text-gray-600'}`}>
                      {entry.result === 'win' ? `+${entry.points} pts` : '—'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
