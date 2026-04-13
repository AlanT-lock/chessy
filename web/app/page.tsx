import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Dashboard } from '@/components/dashboard'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('chess_com_username')
    .eq('id', user.id)
    .single()

  if (!profile?.chess_com_username) {
    redirect('/onboarding')
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-gray-500">{profile.chess_com_username} sur chess.com</p>
        </div>
        <Link
          href="/training"
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-green-700 transition"
        >
          Entraînement →
        </Link>
      </div>

      <Dashboard />
    </main>
  )
}
