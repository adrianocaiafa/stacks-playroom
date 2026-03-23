/**
 * Register chainhooks on Hiro platform for all Stacks Playroom games.
 *
 * Usage:
 *   pnpm chainhooks:register
 *
 * Requirements:
 *   - HIRO_API_KEY in .env
 *   - WEBHOOK_URL in .env (the public URL of this API + /webhook/stacks)
 */

import 'dotenv/config'
import { ChainhooksClient, CHAINHOOKS_BASE_URL } from '@hirosystems/chainhooks-client'
import { DEPLOYER_ADDRESS, CONTRACTS } from '@stacks-playroom/shared'

const apiKey = process.env.HIRO_API_KEY
const webhookUrl = process.env.WEBHOOK_URL

if (!apiKey) throw new Error('Missing HIRO_API_KEY in .env')
if (!webhookUrl) throw new Error('Missing WEBHOOK_URL in .env')

const client = new ChainhooksClient({
  baseUrl: CHAINHOOKS_BASE_URL.mainnet,
  apiKey,
})

// Each entry: [contract-name, function-name, chainhook-name]
const HOOKS: [string, string, string][] = [
  [CONTRACTS.diceGame,          'roll-dice',     'playroom-dice-roll'],
  [CONTRACTS.coinFlip,          'flip-coin',     'playroom-coin-flip'],
  [CONTRACTS.raffle,            'buy-ticket',    'playroom-raffle-ticket'],
  [CONTRACTS.rockPaperScissors, 'play-game',     'playroom-rps-play'],
  [CONTRACTS.mastermind,        'submit-guess',  'playroom-mastermind-guess'],
  [CONTRACTS.numberGuessZen,    'guess-number',  'playroom-numguess-zen'],
  [CONTRACTS.numberGuessPro,    'guess-number',  'playroom-numguess-pro'],
  [CONTRACTS.hiddenFormula,     'test-formula',  'playroom-hidden-formula'],
  [CONTRACTS.multiTarget,       'submit-guess',  'playroom-multi-target'],
  [CONTRACTS.dailyCheckIn,      'check-in',      'playroom-daily-checkin'],
  [CONTRACTS.questSystem,       'complete-quest','playroom-quest-complete'],
]

console.log(`Registering ${HOOKS.length} chainhooks...`)
console.log(`Webhook URL: ${webhookUrl}\n`)

for (const [contractName, functionName, hookName] of HOOKS) {
  const contractId = `${DEPLOYER_ADDRESS}.${contractName}`
  try {
    const hook = await client.registerChainhook({
      version: '1',
      name: hookName,
      chain: 'stacks',
      network: 'mainnet',
      filters: {
        events: [
          {
            type: 'contract_call',
            contract_identifier: contractId,
            function_name: functionName,
          },
        ],
      },
      action: {
        type: 'http_post',
        url: webhookUrl,
      },
      options: {
        decode_clarity_values: true,
        enable_on_registration: true,
      },
    })
    console.log(`✅  ${hookName}  →  UUID: ${hook.uuid}`)
  } catch (err: any) {
    console.error(`❌  ${hookName}  →  ${err?.message ?? err}`)
  }
}

console.log('\nDone.')
