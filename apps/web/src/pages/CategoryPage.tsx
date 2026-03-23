import { useParams, Navigate } from 'react-router-dom'
import { CATEGORY_META, GAMES_BY_CATEGORY } from '../data/games'
import { GameCard } from '../components/GameCard'

type CategoryKey = keyof typeof CATEGORY_META

export function CategoryPage() {
  const { category } = useParams<{ category: string }>()

  if (!category || !(category in CATEGORY_META)) {
    return <Navigate to="/" replace />
  }

  const catKey = category as CategoryKey
  const meta = CATEGORY_META[catKey]
  const games = GAMES_BY_CATEGORY[catKey]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {meta.icon} {meta.label}
        </h1>
        <p className="text-gray-400 mt-2">{meta.description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}
