import { useState, useEffect, useCallback } from 'react'
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
const CONTRACT_NAME = CONTRACTS.diceGame
const DICE_FEE = 10000 // 0.01 STX in micro-STX

function getNetwork() {
  return createNetwork('mainnet')
}

export interface GlobalStats {
  totalRolls: number
  userCount: number
}

export interface UserStats {
  totalRolls: number
  wins: number
  totalPoints: number
  winStreak: number
  longestStreak: number
}

export interface RollEntry {
  rollId: number
  userChoice: number
  diceResult: number
  won: boolean
  points: number
}

export interface LeaderboardEntry {
  address: string
  totalRolls: number
  wins: number
  totalPoints: number
  longestStreak: number
}

function parseNum(v: unknown): number {
  return parseInt(String((v as any)?.value ?? v ?? '0')) || 0
}

export function useDiceGlobalStats() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const net = getNetwork()
      const [rolls, users] = await Promise.all([
        fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-total-rolls',
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
        totalRolls: parseNum(cvToJSON(rolls).value),
        userCount: parseNum(cvToJSON(users).value),
      })
    } catch {
      // silently fail — network may be unavailable
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { stats, loading, refresh: fetch }
}

export function useDiceUserStats(address: string | null) {
  const [stats, setStats] = useState<UserStats | null>(null)
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
          totalRolls: parseNum(v['total-rolls']),
          wins: parseNum(v['wins']),
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

export function useDiceHistory(address: string | null) {
  const [history, setHistory] = useState<RollEntry[]>([])
  const [totalRolls, setTotalRolls] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address) { setHistory([]); setTotalRolls(0); return }
    setLoading(true)
    try {
      const net = getNetwork()
      const countRes = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-user-roll-count',
        functionArgs: [standardPrincipalCV(address)],
        network: net,
        senderAddress: CONTRACT_ADDRESS,
      })
      const count = parseNum(cvToJSON(countRes).value)
      setTotalRolls(count)
      if (count === 0) { setHistory([]); setLoading(false); return }

      const entries: RollEntry[] = []
      const start = Math.max(0, count - 10)
      for (let i = count - 1; i >= start; i--) {
        await new Promise((r) => setTimeout(r, 80))
        const res = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-user-roll',
          functionArgs: [standardPrincipalCV(address), uintCV(i)],
          network: net,
          senderAddress: CONTRACT_ADDRESS,
        })
        const d = cvToJSON(res)
        if (d.type !== 'none' && d.value) {
          const v = d.value?.value ?? d.value
          entries.push({
            rollId: i,
            userChoice: parseNum(v['user-choice']),
            diceResult: parseNum(v['dice-result']),
            won: v['won']?.value === true || v['won'] === true,
            points: parseNum(v['points']),
          })
        }
      }
      setHistory(entries)
    } catch {
      // keep existing data on error — don't wipe the list
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { fetch() }, [fetch])
  return { history, totalRolls, loading, refresh: fetch }
}

export function useDiceLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
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

      const list: LeaderboardEntry[] = []
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
            totalRolls: parseNum(v['total-rolls']),
            wins: parseNum(v['wins']),
            totalPoints: parseNum(v['total-points']),
            longestStreak: parseNum(v['longest-streak']),
          })
        }
      }
      list.sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins)
      setEntries(list)
    } catch {
      // keep existing data on error — don't wipe the list
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { entries, loading, refresh: fetch }
}

export function useRollDice(address: string | null) {
  const [rolling, setRolling] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const roll = useCallback(async (choice: number) => {
    if (!address) { setError('Connect your wallet first'); return }
    setRolling(true)
    setError(null)
    setTxId(null)
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'roll-dice',
      functionArgs: [uintCV(choice), uintCV(DICE_FEE)],
      network: getNetwork(),
      appDetails: { name: 'Stacks Playroom', icon: `${window.location.origin}/favicon.svg` },
      onFinish: (data) => { setTxId(data.txId); setRolling(false) },
      onCancel: () => setRolling(false),
    })
  }, [address])

  return { roll, rolling, txId, error, clearError: () => setError(null) }
}
