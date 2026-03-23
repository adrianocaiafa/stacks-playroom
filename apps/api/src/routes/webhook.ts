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
  try {
    const payload = req.body

    if (!payload?.apply || !Array.isArray(payload.apply)) {
      res.status(400).json({ error: 'Invalid payload' })
      return
    }

    for (const block of payload.apply) {
      const transactions: any[] = block.transactions ?? []

      for (const tx of transactions) {
        const metadata = tx.metadata ?? {}
        const contractCall = metadata.kind?.data ?? {}

        // Extract contract identifier
        const contractId: string = contractCall.contract_identifier ?? ''
        const [, contractName] = contractId.split('.')
        const functionName: string = contractCall.function_name ?? ''

        const gameId = CONTRACT_TO_GAME[contractName]
        if (!gameId) continue

        // Parse function arguments (Clarity decoded values)
        const args: any[] = contractCall.function_args ?? []

        const event = buildGameEvent(gameId, functionName, args, tx, metadata)
        if (event) {
          broadcast(gameId, 'game-event', event)
        }
      }
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[webhook] Error processing payload:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

function buildGameEvent(
  gameId: string,
  functionName: string,
  args: any[],
  tx: any,
  metadata: any,
): object | null {
  const txId: string = tx.transaction_identifier?.hash ?? ''
  const sender: string = metadata.sender ?? ''
  const success: boolean = metadata.success ?? false

  const base = { txId, sender, success, gameId, functionName }

  if (gameId === 'dice-game' && functionName === 'roll-dice') {
    // args[0] = user-choice, args[1] = fee-amount
    const userChoice = parseArg(args[0])
    return { ...base, userChoice }
  }

  if (gameId === 'coin-flip' && functionName === 'flip-coin') {
    const choice = parseArg(args[0])
    return { ...base, choice }
  }

  // Generic fallback — broadcast the raw call so we don't miss events
  return { ...base }
}

function parseArg(arg: any): number | string | null {
  if (!arg) return null
  const val = arg.repr ?? arg.value ?? arg
  if (typeof val === 'string' && val.startsWith('u')) return parseInt(val.slice(1))
  return val
}
