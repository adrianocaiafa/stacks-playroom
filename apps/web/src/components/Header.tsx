import { Link, NavLink } from 'react-router-dom'
import { WalletButton } from './WalletButton'

const categories = [
  { path: '/games/luck', label: '🎲 Luck' },
  { path: '/games/logic', label: '🧠 Logic' },
  { path: '/games/casual', label: '☕ Casual' },
  { path: '/games/competitive', label: '🏆 Competitive' },
]

export function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white tracking-tight">
          Stacks <span className="text-orange-400">Playroom</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {categories.map((cat) => (
            <NavLink
              key={cat.path}
              to={cat.path}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-lg transition ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {cat.label}
            </NavLink>
          ))}
        </nav>

        <WalletButton />
      </div>
    </header>
  )
}
