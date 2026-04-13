'use client'
import { useState, useEffect, useCallback } from 'react'
import { PuzzleTrainer } from '@/components/puzzle-trainer'

export default function TrainingPage() {
  const [puzzle, setPuzzle] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [empty, setEmpty] = useState(false)

  const load = useCallback(async () => {
    setPuzzle(null)
    const res = await fetch('/api/puzzles')
    if (res.status === 401) { window.location.href = '/login'; return }
    if (res.status === 204 || !res.ok) { setEmpty(true); return }
    setPuzzle(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function handleResult(success: boolean) {
    await fetch(`/api/puzzles/${puzzle.id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success }),
    })
    setStreak(success ? s => s + 1 : 0)
    load()
  }

  if (empty) return (
    <main className="max-w-xl mx-auto p-6 text-center space-y-3">
      <h1 className="text-2xl font-bold">Entraînement tactique</h1>
      <p className="text-gray-500">Joue des parties avec l&apos;extension pour générer tes premiers puzzles.</p>
    </main>
  )

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Entraînement tactique</h1>
        <span className="text-sm text-gray-500">Série : <strong className="text-orange-500">{streak} 🔥</strong></span>
      </div>
      <p className="text-gray-600 text-sm">Trouve le meilleur coup dans cette position.</p>
      {puzzle ? <PuzzleTrainer puzzle={puzzle} onResult={handleResult} /> : <p className="text-gray-400">Chargement...</p>}
    </main>
  )
}
