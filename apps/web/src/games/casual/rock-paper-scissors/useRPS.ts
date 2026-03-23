import { useState, useCallback, useEffect } from 'react'
import {
  fetchCallReadOnlyFunction,
  cvToJSON,
  standardPrincipalCV,
  uintCV,
} from '@stacks/transactions'
import { createNetwork } from '@stacks/network'
import { openContractCall } from '@stacks/connect'
import { DEPLOYER_ADDRESS, CONTRACTS } from '@stacks-playroom/shared'

const CONTRACT_ADDRESS = DEPLOYER_ADDRESS
const CONTRACT_NAME = CONTRACTS.rockPaperScissors
const GAME_FEE = 10000 // 0.01 STX

export const ROCK = 1
export const PAPER = 2
export const SCISSORS = 3

export type RPSChoice = 1 | 2 | 3
export type RPSResult = 'win' | 'loss' | 'draw'

export const CHOICE_LABEL: Record<number, string> = { 1: 'Rock', 2: 'Paper', 3: 'Scissors' }
export const CHOICE_EMOJI: Record<number, string> = { 1: '🪨', 2: '📄', 3: '✂️' }

function getNetwork() {
  return createNetwork('mainnet')
}

export interface RPSGlobalStats {
  totalGames: number
  userCount: number
}

export interface RPSUserStats {
  totalGames: number
  wins: number
  losses: number
  draws: number
  totalPoints: number
  winStreak: number
  longestStreak: number
}

export interface RPSGameEntry {
  gameId: number
  userChoice: number
  contractChoice: number
  result: RPSResult
  points: number
}

export interface RPSLeaderboardEntry {
  address: string
  totalGames: number
  wins: number
  losses: number
  draws: number
  totalPoints: number
  longestStreak: number
}

function parseNum(v: unknown): number {
  return parseInt(String((v as any)?.value ?? v ?? '0')) || 0
}

export function useRPSGlobalStats() {
  const [stats, setStats] = useState<RPSGlobalStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const net = getNetwork()
      const [games, users] = await Promise.all([
        fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-total-games',
          functionArgs: [],
          network: net,
          senderAddress: CONTRACT_ADDRESS,
        }),
        fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-user-count',
          functionArgs: [],
          network: net,
          senderAddress: CONTRACT_ADDRESS,
        }),
      ])
      setStats({
        totalGames: parseNum(cvToJSON(games).value),
        userCount: parseNum(cvToJSON(users).value),
      })
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { stats, loading, refresh: fetch }
}

export function useRPSUserStats(address: string | null) {
  const [stats, setStats] = useState<RPSUserStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address) { setStats(null); return }
    setLoading(true)
    try {
      const res = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-user-stats',
        functionArgs: [standardPrincipalCV(address)],
        network: getNetwork(),
        senderAddress: CONTRACT_ADDRESS,
      })
      const d = cvToJSON(res)
      if (d.type !== 'none' && d.value) {
        const v = d.value?.value ?? d.value
        setStats({
          totalGames: parseNum(v['total-games']),
          wins: parseNum(v['wins']),
          losses: parseNum(v['losses']),
          draws: parseNum(v['draws']),
          totalPoints: parseNum(v['total-points']),
          winStreak: parseNum(v['win-streak']),
          longestStreak: parseNum(v['longest-streak']),
        })
      } else {
        setStats(null)
      }
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { fetch() }, [fetch])
  return { stats, loading, refresh: fetch }
}

export function useRPSHistory(address: string | null) {
  const [history, setHistory] = useState<RPSGameEntry[]>([])
  const [totalGames, setTotalGames] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address) { setHistory([]); setTotalGames(0); return }
    setLoading(true)
    try {
      const net = getNetwork()
      const countRes = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-user-game-count',
        functionArgs: [standardPrincipalCV(address)],
        network: net,
        senderAddress: CONTRACT_ADDRESS,
      })
      const count = parseNum(cvToJSON(countRes).value)
      setTotalGames(count)
      if (count === 0) { setHistory([]); setLoading(false); return }

      const entries: RPSGameEntry[] = []
      const start = Math.max(0, count - 10)
      for (let i = count - 1; i >= start; i--) {
        await new Promise((r) => setTimeout(r, 80))
        const res = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-user-game',
          functionArgs: [standardPrincipalCV(address), uintCV(i)],
          network: net,
          senderAddress: CONTRACT_ADDRESS,
        })
        const d = cvToJSON(res)
        if (d.type !== 'none' && d.value) {
          const v = d.value?.value ?? d.value
          entries.push({
            gameId: i,
            userChoice: parseNum(v['user-choice']),
            contractChoice: parseNum(v['contract-choice']),
            result: (v['result']?.value ?? v['result'] ?? 'draw') as RPSResult,
            points: parseNum(v['points']),
          })
        }
      }
      setHistory(entries)
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { fetch() }, [fetch])
  return { history, totalGames, loading, refresh: fetch }
}

export function useRPSLeaderboard() {
  const [entries, setEntries] = useState<RPSLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const net = getNetwork()
      const countRes = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-user-count',
        functionArgs: [],
        network: net,
        senderAddress: CONTRACT_ADDRESS,
      })
      const total = parseNum(cvToJSON(countRes).value)
      if (total === 0) { setEntries([]); setLoading(false); return }

      const list: RPSLeaderboardEntry[] = []
      for (let i = 0; i < Math.min(total, 10); i++) {
        await new Promise((r) => setTimeout(r, 80))
        const res = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-user-at-index-with-stats',
          functionArgs: [uintCV(i)],
          network: net,
          senderAddress: CONTRACT_ADDRESS,
        })
        const d = cvToJSON(res)
        if (d.type !== 'none' && d.value) {
          const v = d.value?.value ?? d.value
          list.push({
            address: v['address']?.value ?? v['address'],
            totalGames: parseNum(v['total-games']),
            wins: parseNum(v['wins']),
            losses: parseNum(v['losses']),
            draws: parseNum(v['draws']),
            totalPoints: parseNum(v['total-points']),
            longestStreak: parseNum(v['longest-streak']),
          })
        }
      }
      list.sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins)
      setEntries(list)
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { entries, loading, refresh: fetch }
}

const PENDING_TX_KEY = 'rps-pending-txid'

export function usePlayRPS(address: string | null) {
  const [playing, setPlaying] = useState(false)
  const [txId, setTxIdState] = useState<string | null>(() =>
    sessionStorage.getItem(PENDING_TX_KEY),
  )
  const [error, setError] = useState<string | null>(null)

  const setTxId = useCallback((id: string | null) => {
    if (id) sessionStorage.setItem(PENDING_TX_KEY, id)
    else sessionStorage.removeItem(PENDING_TX_KEY)
    setTxIdState(id)
  }, [])

  const play = useCallback(async (choice: RPSChoice) => {
    if (!address) { setError('Connect your wallet first'); return }
    setPlaying(true)
    setError(null)
    setTxId(null)
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'play-game',
      functionArgs: [uintCV(choice), uintCV(GAME_FEE)],
      network: getNetwork(),
      appDetails: { name: 'Stacks Playroom', icon: `${window.location.origin}/favicon.svg` },
      onFinish: (data) => { setTxId(data.txId); setPlaying(false) },
      onCancel: () => setPlaying(false),
    })
  }, [address, setTxId])

  const clearPendingTx = useCallback(() => setTxId(null), [setTxId])

  return { play, playing, txId, error, clearError: () => setError(null), clearPendingTx }
}
