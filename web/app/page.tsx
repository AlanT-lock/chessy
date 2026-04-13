import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AccuracyChart } from '@/components/accuracy-chart'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: games } = await supabase
    .from('games')
    .select('id, accuracy_score, played_at, result')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(30)

  const chartData = (games ?? [])
    .filter(g => g.accuracy_score != null)
    .map(g => ({
      date: new Date(g.played_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      accuracy: Number(g.accuracy_score),
    }))
    .reverse()

  const avg = chartData.length
    ? chartData.reduce((s, d) => s + d.accuracy, 0) / chartData.length
    : 0

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Précision moyenne</p>
          <p className="text-3xl font-bold text-green-600">{avg.toFixed(1)}%</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Parties jouées</p>
          <p className="text-3xl font-bold">{games?.length ?? 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Victoires</p>
          <p className="text-3xl font-bold text-blue-600">
            {games?.filter(g => g.result === 'win').length ?? 0}
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Précision sur 30 parties</h2>
        <AccuracyChart data={chartData} />
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Dernières parties</h2>
        <div className="space-y-2">
          {(games ?? []).map(game => (
            <Link key={game.id} href={`/analysis/${game.id}`}
              className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">
                {new Date(game.played_at).toLocaleDateString('fr-FR')}
              </span>
              <span className={game.result === 'win' ? 'text-green-600 font-medium' :
                game.result === 'loss' ? 'text-red-500 font-medium' : 'text-gray-500 font-medium'}>
                {game.result === 'win' ? 'Victoire' : game.result === 'loss' ? 'Défaite' : 'Nulle'}
              </span>
              {game.accuracy_score != null && (
                <span className="font-mono text-sm">{Number(game.accuracy_score).toFixed(1)}%</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <Link href="/training"
        className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg font-medium">
        Entraînement tactique →
      </Link>
    </main>
  )
}
