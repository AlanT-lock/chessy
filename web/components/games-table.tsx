'use client'
import Link from 'next/link'

interface Game {
  id: string
  played_at: string
  opponent_username: string | null
  opponent_elo: number | null
  user_elo: number | null
  time_control: string | null
  result: string
  accuracy_score: number | null
}

interface Props {
  games: Game[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const TC_LABELS: Record<string, string> = {
  rapid: 'Rapid',
  blitz: 'Blitz',
  bullet: 'Bullet',
}

export function GamesTable({ games, page, totalPages, onPageChange }: Props) {
  if (games.length === 0) {
    return <p className="text-gray-400 text-center py-4">Aucune partie trouvée</p>
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Adversaire</th>
              <th className="py-2 pr-4">Cadence</th>
              <th className="py-2 pr-4">Résultat</th>
              <th className="py-2 text-right">Analyse</th>
            </tr>
          </thead>
          <tbody>
            {games.map(g => (
              <tr key={g.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 pr-4 text-gray-500">
                  {new Date(g.played_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="py-2 pr-4">
                  <span className="font-medium">{g.opponent_username ?? '—'}</span>
                  {g.opponent_elo != null && (
                    <span className="text-gray-400 ml-1">({g.opponent_elo})</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-gray-500">
                  {g.time_control ? TC_LABELS[g.time_control] ?? g.time_control : '—'}
                </td>
                <td className="py-2 pr-4">
                  <span className={`font-medium ${
                    g.result === 'win' ? 'text-green-600' :
                    g.result === 'loss' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {g.result === 'win' ? 'Victoire' : g.result === 'loss' ? 'Défaite' : 'Nulle'}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <Link
                    href={`/analysis/${g.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-30"
          >
            ←
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
