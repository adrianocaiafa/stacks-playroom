/**
 * Register a single chainhook on Hiro platform that monitors all Stacks Playroom contracts.
 * The backend (webhook.ts) identifies the game from the contract_identifier in the payload.
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

// One filter per contract — no function_name filter so we catch all calls
const contractEvents = Object.values(CONTRACTS).map((name) => ({
  type: 'contract_call' as const,
  contract_identifier: `${DEPLOYER_ADDRESS}.${name}`,
}))

console.log(`Registering 1 chainhook for ${contractEvents.length} contracts...`)
console.log(`Webhook URL: ${webhookUrl}\n`)

try {
  const hook = await client.registerChainhook({
    version: '1',
    name: 'playroom-all-games',
    chain: 'stacks',
    network: 'mainnet',
    filters: {
      events: contractEvents,
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
  console.log(`✅  playroom-all-games  →  UUID: ${hook.uuid}`)
} catch (err: any) {
  console.error(`❌  ${err?.message ?? err}`)
}

console.log('\nDone.')
