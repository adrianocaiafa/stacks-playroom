import { useState, useEffect, useCallback } from 'react'
import { connect } from '@stacks/connect'

export function useStacksWallet() {
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('stacksAddress')
    if (stored) setAddress(stored)
  }, [])

  const connectWallet = useCallback(async () => {
    try {
      const response = await connect({})
      if (response?.addresses?.length) {
        const stxAddress = response.addresses.find((a: any) => a.symbol === 'STX')?.address
        if (stxAddress) {
          setAddress(stxAddress)
          localStorage.setItem('stacksAddress', stxAddress)
          window.dispatchEvent(new Event('stacksWalletChanged'))
        }
      }
    } catch (err) {
      console.error('Wallet connect error:', err)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setAddress(null)
    localStorage.removeItem('stacksAddress')
    window.dispatchEvent(new Event('stacksWalletChanged'))
  }, [])

  return { address, connectWallet, disconnectWallet }
}
