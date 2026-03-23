import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '818bdad25c702392f94804d469abc4c7'

const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,
  metadata: {
    name: 'Stacks Playroom',
    description: 'On-chain games on the Stacks blockchain',
    url: window.location.origin,
    icons: [`${window.location.origin}/favicon.svg`],
  },
  features: {
    analytics: true,
  },
  enableEIP6963: true,
  enableCoinbase: true,
  enableWalletConnect: true,
})
