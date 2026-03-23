import { Link } from 'react-router-dom'
import type { GameMeta } from '@stacks-playroom/shared'

interface GameCardProps {
  game: GameMeta
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Link
      to={`/games/${game.category}/${game.id}`}
      className="group block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-orange-500/50 hover:bg-gray-800/50 transition"
    >
      {game.icon && (
        <div className="text-3xl mb-3">{game.icon}</div>
      )}
      <h3 className="font-semibold text-white group-hover:text-orange-400 transition mb-1">
        {game.title}
      </h3>
      <p className="text-sm text-gray-400 line-clamp-2">{game.description}</p>
      {game.tags && (
        <div className="flex flex-wrap gap-1 mt-3">
          {game.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
