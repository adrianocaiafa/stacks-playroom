import { useState, useCallback } from 'react'
import { useStacksWallet } from '../../../hooks/useStacksWallet'
import { useGameEvents } from '../../../hooks/useGameEvents'
import { LiveEventToast } from '../../../components/LiveEventToast'
import { CoinResultOverlay } from '../../../components/CoinResultOverlay'
import type { BaseGameEvent, CoinFlipEvent } from '@stacks-playroom/shared'
import {
  useCoinGlobalStats,
  useCoinUserStats,
  useCoinHistory,
  useCoinLeaderboard,
  useFlipCoin,
  HEADS,
  TAILS,
} from './useCoinFlip'

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
  coinResult: number | null
  won: boolean | null
}

const SIDE_LABEL = ['HEADS', 'TAILS']
const SIDE_EMOJI = ['👑', '🌕']

export function CoinFlipPage() {
  const { address } = useStacksWallet()
  const [selected, setSelected] = useState<number | null>(null)
  const [liveEvent, setLiveEvent] = useState<BaseGameEvent | null>(null)
  const [overlay, setOverlay] = useState<OverlayData | null>(null)

  const { stats: global, loading: globalLoading, refresh: refreshGlobal } = useCoinGlobalStats()
  const { stats: user, loading: userLoading, refresh: refreshUser } = useCoinUserStats(address)
  const { history, totalFlips, loading: histLoading, refresh: refreshHistory } = useCoinHistory(address)
  const { entries, loading: lbLoading, refresh: refreshLb } = useCoinLeaderboard()
  const { flip, flipping, txId, error, clearPendingTx } = useFlipCoin(address)

  const refreshAll = useCallback(() => {
    setTimeout(() => {
      refreshGlobal()
      refreshUser()
      refreshHistory()
      refreshLb()
    }, 3000)
  }, [refreshGlobal, refreshUser, refreshHistory, refreshLb])

  const handleLiveEvent = useCallback((event: BaseGameEvent) => {
    refreshAll()
    const coinEvent = event as CoinFlipEvent
    const normalize = (id: string) => id.replace(/^0x/i, '').toLowerCase()
    if (txId && normalize(event.txId) === normalize(txId)) {
      setOverlay({
        txId: event.txId,
        userChoice: coinEvent.userChoice ?? null,
        coinResult: coinEvent.coinResult ?? null,
        won: coinEvent.won ?? null,
      })
    } else {
      setLiveEvent(event)
    }
  }, [txId, refreshAll])

  useGameEvents('coin-flip', handleLiveEvent)

  const winRate =
    user && user.totalFlips > 0
      ? ((user.wins / user.totalFlips) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <LiveEventToast event={liveEvent} />
      {overlay && (
        <CoinResultOverlay
          userChoice={overlay.userChoice}
          coinResult={overlay.coinResult}
          won={overlay.won}
          txId={overlay.txId}
          onClose={() => { setOverlay(null); clearPendingTx() }}
        />
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🪙 Coin Flip</h1>
        <p className="text-gray-400">Pick Heads or Tails. 50/50 chance. Simple as that.</p>
        <p className="text-sm text-gray-500 mt-1">Cost: <span className="text-orange-400 font-medium">0.005 STX</span> per flip</p>
      </div>

      {/* Global stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-300">Global Stats</h2>
          <RefreshButton onClick={refreshGlobal} loading={globalLoading} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <StatCard label="Total Flips" value={global?.totalFlips ?? '—'} color="text-orange-400" />
          <StatCard label="Players" value={global?.userCount ?? '—'} color="text-purple-400" />
        </div>
      </div>

      {/* Flip + User stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flip form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-300 mb-5">Flip the Coin</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[HEADS, TAILS].map((side) => (
              <button
                key={side}
                onClick={() => setSelected(side)}
                disabled={flipping}
                className={`py-6 rounded-xl flex flex-col items-center gap-2 border-2 transition ${
                  selected === side
                    ? side === HEADS
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-violet-500/20 border-violet-400 text-violet-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                } disabled:opacity-50`}
              >
                <span className="text-4xl">{SIDE_EMOJI[side]}</span>
                <span className="font-semibold text-sm tracking-widest uppercase">{SIDE_LABEL[side]}</span>
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
              <p className="text-xs text-gray-600">The result overlay will appear automatically.</p>
              <a
                href={`https://explorer.stacks.co/txid/${txId}?chain=mainnet`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-orange-600 hover:text-orange-400 hover:underline break-all mt-1 block"
              >
                {txId.slice(0, 20)}…{txId.slice(-8)}
              </a>
            </div>
          )}

          <button
            onClick={() => selected !== null && flip(selected)}
            disabled={flipping || selected === null || !address}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!address
              ? 'Connect wallet to play'
              : flipping
              ? 'Waiting for wallet...'
              : selected === null
              ? 'Select Heads or Tails'
              : `Flip ${SIDE_EMOJI[selected]} ${SIDE_LABEL[selected]} — 0.005 STX`}
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
            <p className="text-gray-500 text-sm">No flips yet. Make your first flip!</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Flips" value={user.totalFlips} color="text-white" />
                <StatCard label="Wins" value={user.wins} color="text-green-400" />
                <StatCard label="Points" value={user.totalPoints} color="text-orange-400" />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                <StatCard label="Streak" value={user.winStreak} color="text-yellow-400" />
                <StatCard label="Win Rate" value={`${winRate}%`} color="text-blue-400" />
                <StatCard label="Best Streak" value={user.longestStreak} color="text-yellow-500" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{user.headsWins}</p>
                  <p className="text-xs text-gray-500 mt-0.5">👑 Heads wins</p>
                </div>
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-violet-400">{user.tailsWins}</p>
                  <p className="text-xs text-gray-500 mt-0.5">🌕 Tails wins</p>
                </div>
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
              const wr = entry.totalFlips > 0
                ? ((entry.wins / entry.totalFlips) * 100).toFixed(1)
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
                        {entry.totalFlips} flips · {entry.wins} wins ({wr}%) · 👑{entry.headsWins} / 🌕{entry.tailsWins}
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

      {/* Flip history */}
      {address && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-between items-center p-5 border-b border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-300">Your History</h2>
              <p className="text-xs text-gray-500 mt-0.5">{totalFlips} total flips</p>
            </div>
            <RefreshButton onClick={refreshHistory} loading={histLoading} />
          </div>
          {histLoading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No flips yet.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {history.map((entry) => (
                <div key={entry.flipId} className="px-5 py-3 flex justify-between items-center hover:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{entry.won ? '🎉' : '😔'}</span>
                    <div>
                      <p className="text-sm text-gray-300">Flip #{entry.flipId + 1}</p>
                      <p className="text-xs text-gray-500">
                        Picked {SIDE_EMOJI[entry.userChoice]} {SIDE_LABEL[entry.userChoice]}
                        {' · '}
                        Landed {SIDE_EMOJI[entry.coinResult]} {SIDE_LABEL[entry.coinResult]}
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
