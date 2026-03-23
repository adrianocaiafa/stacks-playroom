import { useStacksWallet } from '../hooks/useStacksWallet'

export function WalletButton() {
  const { address, connectWallet, disconnectWallet } = useStacksWallet()

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 font-mono hidden sm:inline">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={disconnectWallet}
          className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 text-sm rounded-lg hover:bg-red-500/20 transition"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connectWallet}
      className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition"
    >
      Connect Wallet
    </button>
  )
}
