'use client'

interface Opening {
  name: string
  eco: string | null
  games: number
  winRate: number
}

interface Props {
  openings: Opening[]
}

export function OpeningsTable({ openings }: Props) {
  if (openings.length === 0) {
    return <p className="text-gray-400 text-center py-4">Aucune ouverture enregistrée</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-4">Ouverture</th>
            <th className="py-2 pr-4">ECO</th>
            <th className="py-2 pr-4 text-right">Parties</th>
            <th className="py-2 text-right">Win rate</th>
          </tr>
        </thead>
        <tbody>
          {openings.map(o => (
            <tr key={o.name} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium">{o.name}</td>
              <td className="py-2 pr-4 text-gray-400">{o.eco ?? '—'}</td>
              <td className="py-2 pr-4 text-right">{o.games}</td>
              <td className={`py-2 text-right font-medium ${
                o.winRate >= 55 ? 'text-green-600' : o.winRate <= 45 ? 'text-red-500' : 'text-gray-700'
              }`}>
                {o.winRate}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
