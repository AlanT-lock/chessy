'use client'
import { useEffect, useRef } from 'react'
import type { Classification } from '@/lib/lichess'

const CLASS_ICONS: Record<Classification, { icon: string; color: string }> = {
  brilliant:   { icon: '★★', color: '#06b6d4' },
  excellent:   { icon: '★',  color: '#22c55e' },
  good:        { icon: '✓',  color: '#94a3b8' },
  inaccuracy:  { icon: '?!', color: '#eab308' },
  mistake:     { icon: '?',  color: '#f97316' },
  blunder:     { icon: '??', color: '#ef4444' },
}

interface Move {
  moveNumber: number
  color: 'white' | 'black'
  san: string
  classification: Classification
}

interface Props {
  moves: Move[]
  selectedIndex: number
  onSelect: (i: number) => void
}

export function MoveList({ moves, selectedIndex, onSelect }: Props) {
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  // Group moves into pairs (white, black)
  const rows: Array<{ number: number; white?: { move: Move; index: number }; black?: { move: Move; index: number } }> = []
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]
    if (move.color === 'white') {
      rows.push({ number: move.moveNumber, white: { move, index: i } })
    } else {
      if (rows.length === 0 || rows[rows.length - 1].black) {
        rows.push({ number: move.moveNumber })
      }
      rows[rows.length - 1].black = { move, index: i }
    }
  }

  function renderMoveCell(entry: { move: Move; index: number } | undefined) {
    if (!entry) return <div className="flex-1" />
    const { move, index } = entry
    const icon = CLASS_ICONS[move.classification]
    const isSelected = index === selectedIndex

    return (
      <button
        ref={isSelected ? selectedRef : undefined}
        onClick={() => onSelect(index)}
        className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
          isSelected
            ? 'bg-blue-500/20 text-white'
            : 'text-slate-300 hover:bg-slate-700/50'
        }`}
      >
        <span className="font-mono font-medium">{move.san}</span>
        {move.classification !== 'good' && (
          <span style={{ color: icon.color }} className="text-xs font-bold">{icon.icon}</span>
        )}
      </button>
    )
  }

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center border-b border-slate-700/30">
          <span className="w-8 text-xs text-slate-500 text-center shrink-0">{row.number}.</span>
          {renderMoveCell(row.white)}
          {renderMoveCell(row.black)}
        </div>
      ))}
    </div>
  )
}
