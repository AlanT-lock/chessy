'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Verify the chess.com username exists
    const checkRes = await fetch(`https://api.chess.com/pub/player/${username.toLowerCase()}`)
    if (!checkRes.ok) {
      setError('Ce pseudo chess.com n\'existe pas. Vérifie l\'orthographe.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: dbError } = await supabase
      .from('users')
      .update({ chess_com_username: username.toLowerCase() })
      .eq('id', user.id)

    if (dbError) {
      setError('Erreur lors de la sauvegarde. Réessaie.')
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border space-y-6 w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Bienvenue !</h1>
          <p className="text-gray-500 mt-2">Entre ton pseudo chess.com pour synchroniser tes parties</p>
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Pseudo chess.com
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="ex: magnuscarlsen"
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? 'Vérification...' : 'Continuer'}
        </button>
      </form>
    </main>
  )
}
