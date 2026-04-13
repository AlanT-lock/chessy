'use client'
import type { Classification } from '@/lib/lichess'

const CLASS_CONFIG: Record<Classification, { label: string; icon: string; bg: string; text: string }> = {
  brilliant:   { label: 'Brillant',     icon: '★★', bg: 'bg-cyan-500/20',   text: 'text-cyan-400' },
  excellent:   { label: 'Excellent',    icon: '★',  bg: 'bg-green-500/20',  text: 'text-green-400' },
  good:        { label: 'Bon coup',     icon: '✓',  bg: 'bg-slate-500/20',  text: 'text-slate-300' },
  inaccuracy:  { label: 'Imprécision',  icon: '?!', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  mistake:     { label: 'Erreur',       icon: '?',  bg: 'bg-orange-500/20', text: 'text-orange-400' },
  blunder:     { label: 'Gaffe',        icon: '??', bg: 'bg-red-500/20',    text: 'text-red-400' },
}

interface Props {
  moveNumber: number
  color: 'white' | 'black'
  san: string
  bestMoveSan: string
  classification: Classification
  evaluation: number
  prevEvaluation: number
  explanation: string
}

export function MoveDetail({ moveNumber, color, san, bestMoveSan, classification, evaluation, prevEvaluation, explanation }: Props) {
  const config = CLASS_CONFIG[classification]
  const evalBefore = (prevEvaluation / 100)
  const evalAfter = (evaluation / 100)
  const isSameMove = san === bestMoveSan

  const formatEval = (v: number) => v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)

  return (
    <div className="panel">
      <div className="panel-inner space-y-4">
        <div className={`${config.bg} rounded-lg px-4 py-3 flex items-center gap-3`}>
          <span className={`text-2xl ${config.text}`}>{config.icon}</span>
          <span className={`text-lg font-bold ${config.text}`}>{config.label}</span>
        </div>

        <div>
          <div className="text-xs text-slate-500 mb-1">Coup {moveNumber} ({color === 'white' ? 'Blancs' : 'Noirs'})</div>
          <div className="text-xl font-bold font-mono text-white">{san}</div>
        </div>

        {!isSameMove && bestMoveSan && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <div className="text-xs text-green-500 mb-0.5">Meilleur coup</div>
            <div className="text-lg font-bold font-mono text-green-400">{bestMoveSan}</div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Éval :</span>
          <span className={`font-mono font-semibold ${evalBefore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatEval(evalBefore)}
          </span>
          <span className="text-slate-600">→</span>
          <span className={`font-mono font-semibold ${evalAfter >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatEval(evalAfter)}
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>
      </div>
    </div>
  )
}
