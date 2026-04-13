'use client'
import type { Classification } from '@/lib/lichess'

const COLORS: Record<Classification, string> = {
  brilliant: 'text-purple-600 bg-purple-50',
  excellent: 'text-emerald-700 bg-emerald-50',
  good: 'text-green-600 bg-green-50',
  inaccuracy: 'text-yellow-600 bg-yellow-50',
  mistake: 'text-orange-500 bg-orange-50',
  blunder: 'text-red-500 bg-red-50',
}

const LABELS: Record<Classification, string> = {
  brilliant: 'Brillant ★', excellent: 'Excellent', good: 'Bon',
  inaccuracy: 'Imprécision', mistake: 'Erreur', blunder: 'Gaffe',
}

interface Move {
  moveNumber: number
  movePlayed: string
  classification: Classification
  explanation: string | null
}

interface Props {
  moves: Move[]
  selectedIndex: number
  onSelect: (i: number) => void
}

export function MoveList({ moves, selectedIndex, onSelect }: Props) {
  return (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {moves.map((move, i) => (
        <button key={i} onClick={() => onSelect(i)}
          className={`w-full text-left p-2 rounded flex items-start gap-2 ${
            i === selectedIndex ? 'ring-2 ring-blue-400' : 'hover:bg-gray-50'
          }`}>
          <span className="text-gray-400 text-sm w-6 shrink-0">{move.moveNumber}.</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{move.movePlayed}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${COLORS[move.classification]}`}>
                {LABELS[move.classification]}
              </span>
            </div>
            {move.explanation && (
              <p className="text-xs text-gray-500 mt-0.5">{move.explanation}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
