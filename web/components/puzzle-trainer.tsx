'use client'
import { useState } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard } from './chess-board'

interface Puzzle { id: string; fen: string; solution_move: string; difficulty: number }
interface Props { puzzle: Puzzle; onResult: (success: boolean) => void }

export function PuzzleTrainer({ puzzle, onResult }: Props) {
  const [chess] = useState(() => { const c = new Chess(); c.load(puzzle.fen); return c })
  const [fen, setFen] = useState(puzzle.fen)
  const [from, setFrom] = useState<string | null>(null)
  const [status, setStatus] = useState<'waiting' | 'success' | 'failure'>('waiting')

  function handleSquare(square: string) {
    if (status !== 'waiting') return
    if (!from) {
      if (chess.get(square as any)) setFrom(square)
      return
    }
    try {
      const move = chess.move({ from: from as any, to: square as any, promotion: 'q' })
      setFen(chess.fen())
      setFrom(null)
      const success = `${move.from}${move.to}` === puzzle.solution_move
      setStatus(success ? 'success' : 'failure')
      setTimeout(() => onResult(success), 900)
    } catch { setFrom(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 items-center text-sm text-gray-500">
        Difficulté {Array.from({ length: puzzle.difficulty }).map((_, i) => <span key={i} className="text-yellow-500">★</span>)}
      </div>
      <ChessBoard fen={fen} onSquareClick={handleSquare}
        highlightSquares={from ? { [from]: { backgroundColor: 'rgba(255,255,0,0.4)' } } : {}} />
      {status === 'success' && <p className="text-green-600 font-medium">Excellent ! ✓</p>}
      {status === 'failure' && <p className="text-red-500 font-medium">Le bon coup était : <span className="font-mono">{puzzle.solution_move}</span></p>}
    </div>
  )
}
