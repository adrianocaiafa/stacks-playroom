import { useParams, Navigate } from 'react-router-dom'
import { GAMES } from '../data/games'
import { DiceGamePage } from '../games/luck/dice-game/DiceGamePage'

export const GAME_COMPONENTS: Record<string, React.ComponentType> = {
  'dice-game': DiceGamePage,
}

export function GamePage() {
  const { category, gameId } = useParams<{ category: string; gameId: string }>()

  const game = GAMES.find((g) => g.id === gameId && g.category === category)
  if (!game) return <Navigate to="/" replace />

  const Component = GAME_COMPONENTS[game.id]
  if (!Component) {
    return (
      <div className="text-center py-24">
        <p className="text-5xl mb-4">🚧</p>
        <h1 className="text-xl font-bold text-white mb-2">{game.title}</h1>
        <p className="text-gray-400">This game is coming soon.</p>
      </div>
    )
  }

  return <Component />
}
