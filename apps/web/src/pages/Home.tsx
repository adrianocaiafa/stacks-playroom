import { Link } from 'react-router-dom'
import { CATEGORY_META, GAMES_BY_CATEGORY } from '../data/games'
import { GameCard } from '../components/GameCard'

type CategoryKey = keyof typeof CATEGORY_META

export function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-5xl font-bold text-white mb-4">
          Stacks <span className="text-orange-400">Playroom</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-xl mx-auto">
          On-chain games on the Stacks blockchain. Connect your wallet and start playing.
        </p>
      </section>

      {/* Categories */}
      {(Object.keys(CATEGORY_META) as CategoryKey[]).map((catKey) => {
        const meta = CATEGORY_META[catKey]
        const games = GAMES_BY_CATEGORY[catKey]
        return (
          <section key={catKey}>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {meta.icon} {meta.label}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{meta.description}</p>
              </div>
              <Link
                to={`/games/${catKey}`}
                className="text-sm text-orange-400 hover:text-orange-300 transition"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {games.slice(0, 4).map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
