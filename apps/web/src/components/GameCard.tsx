import { Link } from 'react-router-dom'
import type { GameMeta } from '@stacks-playroom/shared'
import { GAME_COMPONENTS } from '../pages/GamePage'

interface GameCardProps {
  game: GameMeta
}

export function GameCard({ game }: GameCardProps) {
  const isLive = game.id in GAME_COMPONENTS

  return (
    <Link
      to={`/games/${game.category}/${game.id}`}
      className={`group relative block bg-gray-900 border rounded-xl p-5 transition ${
        isLive
          ? 'border-gray-800 hover:border-orange-500/50 hover:bg-gray-800/50'
          : 'border-gray-800/50 opacity-60 hover:opacity-80'
      }`}
    >
      {!isLive && (
        <span className="absolute top-3 right-3 text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full">
          Soon
        </span>
      )}

      {game.icon && (
        <div className="text-3xl mb-3">{game.icon}</div>
      )}
      <h3 className={`font-semibold transition mb-1 ${isLive ? 'text-white group-hover:text-orange-400' : 'text-gray-400'}`}>
        {game.title}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-2">{game.description}</p>
      {game.tags && (
        <div className="flex flex-wrap gap-1 mt-3">
          {game.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-600 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
