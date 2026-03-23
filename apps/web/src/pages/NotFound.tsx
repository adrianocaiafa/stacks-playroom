import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="text-6xl mb-4">🎮</p>
      <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-gray-400 mb-8">This room doesn't exist yet.</p>
      <Link to="/" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
        Back to Playroom
      </Link>
    </div>
  )
}
