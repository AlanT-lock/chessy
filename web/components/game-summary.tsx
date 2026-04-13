'use client'
import type { Classification } from '@/lib/lichess'

const CLASS_COLORS: Record<Classification, string> = {
  brilliant: 'bg-cyan-500',
  excellent: 'bg-green-500',
  good: 'bg-slate-400',
  inaccuracy: 'bg-yellow-500',
  mistake: 'bg-orange-500',
  blunder: 'bg-red-500',
}

const CLASS_LABELS: Record<Classification, string> = {
  brilliant: 'Brillant',
  excellent: 'Excellent',
  good: 'Bon',
  inaccuracy: 'Imprécision',
  mistake: 'Erreur',
  blunder: 'Gaffe',
}

interface Props {
  result: 'win' | 'loss' | 'draw'
  accuracy: number
  opening: { code: string; name: string } | null
  moveBreakdown: Record<Classification, number>
  phaseAccuracy: { opening: number; middlegame: number; endgame: number }
}

export function GameSummary({ result, accuracy, opening, moveBreakdown, phaseAccuracy }: Props) {
  const resultLabel = result === 'win' ? 'Victoire' : result === 'loss' ? 'Défaite' : 'Nulle'
  const resultColor = result === 'win' ? 'text-green-400' : result === 'loss' ? 'text-red-400' : 'text-slate-400'

  const totalMoves = Object.values(moveBreakdown).reduce((a, b) => a + b, 0)
  const classifications: Classification[] = ['brilliant', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder']

  return (
    <div className="panel">
      <div className="panel-inner">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-4">
            <span className={`text-2xl font-bold ${resultColor}`}>{resultLabel}</span>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{accuracy}%</div>
              <div className="text-xs text-slate-400">Précision</div>
            </div>
          </div>
          {opening && (
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-200">{opening.name}</div>
              <div className="text-xs text-slate-500">{opening.code}</div>
            </div>
          )}
        </div>

        {totalMoves > 0 && (
          <div className="mb-4">
            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {classifications.map(c => {
                const count = moveBreakdown[c]
                if (count === 0) return null
                const pct = (count / totalMoves) * 100
                return (
                  <div
                    key={c}
                    className={`${CLASS_COLORS[c]} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${CLASS_LABELS[c]}: ${count}`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              {classifications.map(c => {
                const count = moveBreakdown[c]
                if (count === 0) return null
                return (
                  <span key={c} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${CLASS_COLORS[c]}`} />
                    {count} {CLASS_LABELS[c]}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {([
            { label: 'Ouverture', value: phaseAccuracy.opening },
            { label: 'Milieu', value: phaseAccuracy.middlegame },
            { label: 'Finale', value: phaseAccuracy.endgame },
          ] as const).map(p => (
            <div key={p.label} className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-center">
              <div className="text-lg font-bold text-white">{p.value}%</div>
              <div className="text-xs text-slate-500">{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
