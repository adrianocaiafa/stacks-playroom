import { Router } from 'express'
import { broadcast } from '../broadcaster.js'
import { CONTRACTS, DEPLOYER_ADDRESS } from '@stacks-playroom/shared'

export const webhookRouter = Router()

// Map contract names to game IDs
const CONTRACT_TO_GAME: Record<string, string> = {
  [CONTRACTS.diceGame]: 'dice-game',
  [CONTRACTS.coinFlip]: 'coin-flip',
  [CONTRACTS.raffle]: 'raffle',
  [CONTRACTS.rockPaperScissors]: 'rock-paper-scissors',
  [CONTRACTS.mastermind]: 'mastermind',
  [CONTRACTS.numberGuessZen]: 'number-guess-zen',
  [CONTRACTS.numberGuessPro]: 'number-guess-pro',
  [CONTRACTS.hiddenFormula]: 'hidden-formula',
  [CONTRACTS.multiTarget]: 'multi-target',
  [CONTRACTS.dailyCheckIn]: 'daily-check-in',
  [CONTRACTS.questSystem]: 'quest-system',
}

/**
 * POST /webhook/stacks
 *
 * Receives chainhook payloads from Hiro and broadcasts
 * the relevant data to connected SSE clients.
 */
webhookRouter.post('/stacks', (req, res) => {
  // Always respond 200 immediately so Hiro doesn't retry
  res.status(200).json({ ok: true })

  try {
    const payload = req.body
    console.log('[webhook] Received — chainhook:', payload?.chainhook?.name)

    // Hiro payload structure: { chainhook: {...}, event: { apply: [...] } }
    const blocks = payload?.event?.apply ?? payload?.apply ?? []

    if (!Array.isArray(blocks) || blocks.length === 0) {
      console.log('[webhook] No blocks/events found in payload')
      return
    }

    for (const block of blocks) {
      const transactions: any[] = block.transactions ?? block.events ?? []

      for (const tx of transactions) {
        // Contract call data is in tx.operations[], the item with type === 'contract_call'
        const operations: any[] = tx.operations ?? []
        const contractOp = operations.find((op: any) => op.type === 'contract_call')
        if (!contractOp) continue

        const contractId: string = contractOp.metadata?.contract_identifier ?? ''
        const functionName: string = contractOp.metadata?.function_name ?? ''
        const args: any[] = contractOp.metadata?.args ?? []
        const sender: string = contractOp.account?.address ?? tx.metadata?.sender ?? ''

        const [, contractName] = contractId.split('.')

        const resultRepr: string = tx.metadata?.result?.repr ?? ''
        console.log(`[webhook] tx: ${contractId}::${functionName} by ${sender} | result: ${resultRepr.slice(0, 120)}`)

        const gameId = CONTRACT_TO_GAME[contractName]
        if (!gameId) { console.log(`[webhook] unknown contract: ${contractName}`); continue }

        const event = buildGameEvent(gameId, functionName, args, tx, sender)
        if (event) {
          console.log(`[webhook] broadcasting to ${gameId}:`, JSON.stringify(event))
          broadcast(gameId, 'game-event', event)
        }
      }
    }
  } catch (err) {
    console.error('[webhook] Error processing payload:', err)
  }
})

function buildGameEvent(
  gameId: string,
  functionName: string,
  args: any[],
  tx: any,
  sender: string,
): object | null {
  const txId: string = tx.transaction_identifier?.hash ?? ''
  const success: boolean = tx.metadata?.status === 'success'

  const base = { txId, sender, success, gameId, functionName }

  if (gameId === 'dice-game' && functionName === 'roll-dice') {
    const userChoice = parseArg(args[0])
    // Parse result tuple: (ok {dice-result: uN, won: bool, points-earned: uN, ...})
    const result = tx.metadata?.result?.repr ?? ''
    const diceResult = parseReprField(result, 'dice-result')
    const won = parseReprBool(result, 'won')
    const pointsEarned = parseReprField(result, 'points-earned')
    return { ...base, userChoice, diceResult, won, pointsEarned }
  }

  if (gameId === 'coin-flip' && functionName === 'flip-coin') {
    const userChoice = parseArg(args[0])
    const result = tx.metadata?.result?.repr ?? ''
    const coinResult = parseReprField(result, 'coin-result')
    const won = parseReprBool(result, 'won')
    const pointsEarned = parseReprField(result, 'points-earned')
    return { ...base, userChoice, coinResult, won, pointsEarned }
  }

  if (gameId === 'mastermind' && (functionName === 'guess' || functionName === 'give-up')) {
    const repr = tx.metadata?.result?.repr ?? ''
    const exactMatches = parseReprField(repr, 'exact-matches')
    const partialMatches = parseReprField(repr, 'partial-matches')
    const gameResult = parseReprStringAscii(repr, 'result')
    const score = parseReprField(repr, 'score')
    const attemptsUsed = parseReprField(repr, 'attempts-used')
    const secretCode = parseReprList(repr, 'secret-code')
    return { ...base, exactMatches, partialMatches, result: gameResult, score, attemptsUsed, secretCode }
  }

  if (gameId === 'rock-paper-scissors' && functionName === 'play-game') {
    const userChoice = parseArg(args[0])
    const result = tx.metadata?.result?.repr ?? ''
    const contractChoice = parseReprField(result, 'contract-choice')
    const pointsEarned = parseReprField(result, 'points-earned')
    // result field is a string-ascii: "win", "loss", or "draw"
    const gameResult = parseReprStringAscii(result, 'result')
    return { ...base, userChoice, contractChoice, result: gameResult, pointsEarned }
  }

  // Generic fallback — broadcast the raw call so we don't miss events
  return { ...base }
}

function parseArg(arg: any): number | string | null {
  if (!arg) return null
  const repr: string = arg.repr ?? arg.value ?? String(arg)
  if (repr.startsWith('u')) return parseInt(repr.slice(1))
  return repr
}

// Parse a uint field from Clarity tuple repr: "(ok (tuple (dice-result u3) (won false) ...))"
// Hiro uses space-separated tuples, e.g. "(field-name u3)" or "(field-name false)"
function parseReprField(repr: string, field: string): number | null {
  const match = repr.match(new RegExp(`\\(${field}\\s+u(\\d+)\\)`))
  return match ? parseInt(match[1]) : null
}

function parseReprBool(repr: string, field: string): boolean | null {
  const match = repr.match(new RegExp(`\\(${field}\\s+(true|false)\\)`))
  return match ? match[1] === 'true' : null
}

// Parse a string-ascii field: (result "win") → "win"
function parseReprStringAscii(repr: string, field: string): string | null {
  const match = repr.match(new RegExp(`\\(${field}\\s+"([^"]+)"\\)`))
  return match ? match[1] : null
}

// Parse an optional list of uints: (secret-code (some (list u1 u2 u3 u4 u5))) → [1,2,3,4,5]
function parseReprList(repr: string, field: string): number[] | null {
  const match = repr.match(new RegExp(`\\(${field}\\s+\\(some\\s+\\(list\\s+([^)]+)\\)\\)\\)`))
  if (!match) return null
  return match[1].trim().split(/\s+/).map((s) => parseInt(s.replace('u', '')))
}
