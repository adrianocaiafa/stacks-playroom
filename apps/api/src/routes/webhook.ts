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
    console.log('[webhook] Received payload keys:', Object.keys(payload ?? {}))
    console.log('[webhook] Raw payload:', JSON.stringify(payload).slice(0, 500))

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

        console.log(`[webhook] tx: ${contractId}::${functionName} by ${sender}`)

        const gameId = CONTRACT_TO_GAME[contractName]
        if (!gameId) continue

        const event = buildGameEvent(gameId, functionName, args, tx, sender)
        if (event) {
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
  // args format: { name, repr: "u3", type: "uint" }
  const repr: string = arg.repr ?? arg.value ?? String(arg)
  if (repr.startsWith('u')) return parseInt(repr.slice(1))
  return repr
}
