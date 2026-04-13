'use client'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  async function handleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold">Chess Improvement</h1>
        <p className="text-gray-600">Améliore ton niveau aux échecs avec une analyse en temps réel</p>
        <button
          onClick={handleLogin}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium text-lg hover:bg-green-700 transition"
        >
          Se connecter avec Google
        </button>
      </div>
    </main>
  )
}
