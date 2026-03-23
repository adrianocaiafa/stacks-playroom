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
const CONTRACT_NAME = CONTRACTS.coinFlip
const FLIP_FEE = 5000 // 0.005 STX in micro-STX

export const HEADS = 0
export const TAILS = 1

function getNetwork() {
  return createNetwork('mainnet')
}

export interface CoinGlobalStats {
  totalFlips: number
  userCount: number
}

export interface CoinUserStats {
  totalFlips: number
  wins: number
  totalPoints: number
  winStreak: number
  longestStreak: number
  headsWins: number
  tailsWins: number
}

export interface FlipEntry {
  flipId: number
  userChoice: number
  coinResult: number
  won: boolean
  points: number
}

export interface CoinLeaderboardEntry {
  address: string
  totalFlips: number
  wins: number
  totalPoints: number
  longestStreak: number
  headsWins: number
  tailsWins: number
}

function parseNum(v: unknown): number {
  return parseInt(String((v as any)?.value ?? v ?? '0')) || 0
}

export function useCoinGlobalStats() {
  const [stats, setStats] = useState<CoinGlobalStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const net = getNetwork()
      const [flips, users] = await Promise.all([
        fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-total-flips',
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
        totalFlips: parseNum(cvToJSON(flips).value),
        userCount: parseNum(cvToJSON(users).value),
      })
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { stats, loading, refresh: fetch }
}

export function useCoinUserStats(address: string | null) {
  const [stats, setStats] = useState<CoinUserStats | null>(null)
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
          totalFlips: parseNum(v['total-flips']),
          wins: parseNum(v['wins']),
          totalPoints: parseNum(v['total-points']),
          winStreak: parseNum(v['win-streak']),
          longestStreak: parseNum(v['longest-streak']),
          headsWins: parseNum(v['heads-wins']),
          tailsWins: parseNum(v['tails-wins']),
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

export function useCoinHistory(address: string | null) {
  const [history, setHistory] = useState<FlipEntry[]>([])
  const [totalFlips, setTotalFlips] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address) { setHistory([]); setTotalFlips(0); return }
    setLoading(true)
    try {
      const net = getNetwork()
      const countRes = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-user-flip-count',
        functionArgs: [standardPrincipalCV(address)],
        network: net,
        senderAddress: CONTRACT_ADDRESS,
      })
      const count = parseNum(cvToJSON(countRes).value)
      setTotalFlips(count)
      if (count === 0) { setHistory([]); setLoading(false); return }

      const entries: FlipEntry[] = []
      const start = Math.max(0, count - 10)
      for (let i = count - 1; i >= start; i--) {
        await new Promise((r) => setTimeout(r, 80))
        const res = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-user-flip',
          functionArgs: [standardPrincipalCV(address), uintCV(i)],
          network: net,
          senderAddress: CONTRACT_ADDRESS,
        })
        const d = cvToJSON(res)
        if (d.type !== 'none' && d.value) {
          const v = d.value?.value ?? d.value
          entries.push({
            flipId: i,
            userChoice: parseNum(v['user-choice']),
            coinResult: parseNum(v['coin-result']),
            won: v['won']?.value === true || v['won'] === true,
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
  return { history, totalFlips, loading, refresh: fetch }
}

export function useCoinLeaderboard() {
  const [entries, setEntries] = useState<CoinLeaderboardEntry[]>([])
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

      const list: CoinLeaderboardEntry[] = []
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
            totalFlips: parseNum(v['total-flips']),
            wins: parseNum(v['wins']),
            totalPoints: parseNum(v['total-points']),
            longestStreak: parseNum(v['longest-streak']),
            headsWins: parseNum(v['heads-wins']),
            tailsWins: parseNum(v['tails-wins']),
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

const PENDING_TX_KEY = 'coin-pending-txid'

export function useFlipCoin(address: string | null) {
  const [flipping, setFlipping] = useState(false)
  const [txId, setTxIdState] = useState<string | null>(() =>
    sessionStorage.getItem(PENDING_TX_KEY),
  )
  const [error, setError] = useState<string | null>(null)

  const setTxId = useCallback((id: string | null) => {
    if (id) sessionStorage.setItem(PENDING_TX_KEY, id)
    else sessionStorage.removeItem(PENDING_TX_KEY)
    setTxIdState(id)
  }, [])

  const flip = useCallback(async (choice: number) => {
    if (!address) { setError('Connect your wallet first'); return }
    setFlipping(true)
    setError(null)
    setTxId(null)
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'flip-coin',
      functionArgs: [uintCV(choice), uintCV(FLIP_FEE)],
      network: getNetwork(),
      appDetails: { name: 'Stacks Playroom', icon: `${window.location.origin}/favicon.svg` },
      onFinish: (data) => { setTxId(data.txId); setFlipping(false) },
      onCancel: () => setFlipping(false),
    })
  }, [address, setTxId])

  const clearPendingTx = useCallback(() => setTxId(null), [setTxId])

  return { flip, flipping, txId, error, clearError: () => setError(null), clearPendingTx }
}
