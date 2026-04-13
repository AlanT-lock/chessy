'use client'
import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard } from '@/components/chess-board'
import { MoveList } from '@/components/move-list'

export default function AnalysisPage({ params }: { params: Promise<{ gameId: string }> }) {
  const [game, setGame] = useState<any>(null)
  const [fen, setFen] = useState('start')
  const [selected, setSelected] = useState(-1)
  const [gameId, setGameId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setGameId(p.gameId))
  }, [params])

  useEffect(() => {
    if (!gameId) return
    fetch(`/api/analysis/${gameId}`).then(r => r.json()).then(setGame)
  }, [gameId])

  function goToMove(index: number) {
    if (!game?.pgn) return
    const temp = new Chess()
    temp.loadPgn(game.pgn)
    const history = temp.history()
    const chess = new Chess()
    for (let i = 0; i <= index; i++) chess.move(history[i])
    setFen(chess.fen())
    setSelected(index)
  }

  if (!game) return <div className="p-6 text-gray-500">Chargement de l&apos;analyse...</div>

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Analyse de la partie</h1>
      <div className="grid grid-cols-2 gap-8 items-start">
        <ChessBoard fen={fen} />
        <MoveList moves={game.move_analysis ?? []} selectedIndex={selected} onSelect={goToMove} />
      </div>
    </main>
  )
}
