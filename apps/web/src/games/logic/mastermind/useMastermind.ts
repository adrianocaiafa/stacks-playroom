import { useState, useCallback, useEffect } from 'react'
import {
  fetchCallReadOnlyFunction,
  cvToJSON,
  standardPrincipalCV,
  uintCV,
  listCV,
} from '@stacks/transactions'
import { createNetwork } from '@stacks/network'
import { openContractCall } from '@stacks/connect'
import { DEPLOYER_ADDRESS, CONTRACTS } from '@stacks-playroom/shared'

const CONTRACT_ADDRESS = DEPLOYER_ADDRESS
const CONTRACT_NAME = CONTRACTS.mastermind

function getNetwork() { return createNetwork('mainnet') }

export const MAX_ATTEMPTS = 10
export const CODE_LENGTH = 5

export interface ActiveGame {
  attemptsLeft: number
  attemptsUsed: number
  gameId: number
}

export interface AttemptRow {
  code: number[]
  exact: number
  partial: number
}

export interface PlayerStats {
  totalGames: number
  wins: number
  totalAttempts: number
  bestAttempts: number
  perfectGames: number
}

export interface MastermindLeaderboardEntry {
  address: string
  totalGames: number
  wins: number
  bestAttempts: number
  perfectGames: number
}

function parseNum(v: unknown): number {
  return parseInt(String((v as any)?.value ?? v ?? '0')) || 0
}

export function useMastermindActiveGame(address: string | null) {
  const [activeGame, setActiveGame] = useState<ActiveGame | null | undefined>(undefined) // undefined = loading
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address) { setActiveGame(null); return }
    setLoading(true)
    try {
      const res = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-active-game',
        functionArgs: [standardPrincipalCV(address)],
        network: getNetwork(),
        senderAddress: CONTRACT_ADDRESS,
      })
      const d = cvToJSON(res)
      if (d.type !== 'none' && d.value) {
        const v = d.value?.value ?? d.value
        setActiveGame({
          attemptsLeft: parseNum(v['attempts-left']),
          attemptsUsed: parseNum(v['attempts-used']),
          gameId: parseNum(v['game-id']),
        })
      } else {
        setActiveGame(null)
      }
    } catch {
      setActiveGame(null)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { fetch() }, [fetch])
  return { activeGame, loading, refresh: fetch }
}

export function useMastermindAttempts(address: string | null, count: number) {
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address || count === 0) { setAttempts([]); return }
    setLoading(true)
    try {
      const net = getNetwork()
      const rows: AttemptRow[] = []
      for (let i = 0; i < count; i++) {
        await new Promise((r) => setTimeout(r, 80))
        const res = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-attempt',
          functionArgs: [standardPrincipalCV(address), uintCV(i)],
          network: net,
          senderAddress: CONTRACT_ADDRESS,
        })
        const d = cvToJSON(res)
        if (d.type !== 'none' && d.value) {
          const v = d.value?.value ?? d.value
          const rawCode = v['code']?.value ?? v['code'] ?? []
          const code: number[] = Array.isArray(rawCode)
            ? rawCode.map((x: any) => parseNum(x))
            : Object.values(rawCode).map((x: any) => parseNum(x))
          rows.push({
            code,
            exact: parseNum(v['exact-matches']),
            partial: parseNum(v['partial-matches']),
          })
        }
      }
      setAttempts(rows)
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [address, count])

  useEffect(() => { fetch() }, [fetch])
  return { attempts, loading, refresh: fetch }
}

export function useMastermindPlayerStats(address: string | null) {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address) { setStats(null); return }
    setLoading(true)
    try {
      const res = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-player-stats',
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
          totalAttempts: parseNum(v['total-attempts']),
          bestAttempts: parseNum(v['best-attempts']),
          perfectGames: parseNum(v['perfect-games']),
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

export function useMastermindLeaderboard() {
  const [entries, setEntries] = useState<MastermindLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const net = getNetwork()
      const countRes = await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-player-count',
        functionArgs: [],
        network: net,
        senderAddress: CONTRACT_ADDRESS,
      })
      const total = parseNum(cvToJSON(countRes).value)
      if (total === 0) { setEntries([]); setLoading(false); return }

      const list: MastermindLeaderboardEntry[] = []
      for (let i = 0; i < Math.min(total, 10); i++) {
        await new Promise((r) => setTimeout(r, 80))
        const res = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-player-at-index-with-stats',
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
            bestAttempts: parseNum(v['best-attempts']),
            perfectGames: parseNum(v['perfect-games']),
          })
        }
      }
      // Sort by wins desc, then by best-attempts asc
      list.sort((a, b) => b.wins - a.wins || a.bestAttempts - b.bestAttempts)
      setEntries(list)
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { entries, loading, refresh: fetch }
}

const PENDING_TX_KEY = 'mm-pending-txid'
const PENDING_TYPE_KEY = 'mm-pending-type'
const PENDING_CODE_KEY = 'mm-pending-code'

export type MastermindTxType = 'start' | 'guess' | 'give-up'

export function useMastermindActions(address: string | null) {
  const [pending, setPendingState] = useState<{ txId: string; type: MastermindTxType; code?: number[] } | null>(() => {
    const txId = sessionStorage.getItem(PENDING_TX_KEY)
    const type = sessionStorage.getItem(PENDING_TYPE_KEY) as MastermindTxType | null
    const codeRaw = sessionStorage.getItem(PENDING_CODE_KEY)
    if (txId && type) {
      return { txId, type, code: codeRaw ? JSON.parse(codeRaw) : undefined }
    }
    return null
  })
  const [error, setError] = useState<string | null>(null)

  const storePending = (txId: string, type: MastermindTxType, code?: number[]) => {
    sessionStorage.setItem(PENDING_TX_KEY, txId)
    sessionStorage.setItem(PENDING_TYPE_KEY, type)
    if (code) sessionStorage.setItem(PENDING_CODE_KEY, JSON.stringify(code))
    else sessionStorage.removeItem(PENDING_CODE_KEY)
    setPendingState({ txId, type, code })
  }

  const clearPending = useCallback(() => {
    sessionStorage.removeItem(PENDING_TX_KEY)
    sessionStorage.removeItem(PENDING_TYPE_KEY)
    sessionStorage.removeItem(PENDING_CODE_KEY)
    setPendingState(null)
  }, [])

  const startGame = useCallback(async () => {
    if (!address) { setError('Connect your wallet first'); return }
    setError(null)
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'start-game',
      functionArgs: [],
      network: getNetwork(),
      appDetails: { name: 'Stacks Playroom', icon: `${window.location.origin}/favicon.svg` },
      onFinish: (data) => storePending(data.txId, 'start'),
      onCancel: () => {},
    })
  }, [address])

  const submitGuess = useCallback(async (code: number[]) => {
    if (!address) { setError('Connect your wallet first'); return }
    if (code.length !== CODE_LENGTH) { setError('Enter all 5 digits'); return }
    const unique = new Set(code).size === CODE_LENGTH
    if (!unique) { setError('All digits must be unique'); return }
    setError(null)
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'guess',
      functionArgs: [listCV(code.map(uintCV))],
      network: getNetwork(),
      appDetails: { name: 'Stacks Playroom', icon: `${window.location.origin}/favicon.svg` },
      onFinish: (data) => storePending(data.txId, 'guess', code),
      onCancel: () => {},
    })
  }, [address])

  const giveUp = useCallback(async () => {
    if (!address) { setError('Connect your wallet first'); return }
    setError(null)
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'give-up',
      functionArgs: [],
      network: getNetwork(),
      appDetails: { name: 'Stacks Playroom', icon: `${window.location.origin}/favicon.svg` },
      onFinish: (data) => storePending(data.txId, 'give-up'),
      onCancel: () => {},
    })
  }, [address])

  return { pending, startGame, submitGuess, giveUp, clearPending, error, setError }
}
