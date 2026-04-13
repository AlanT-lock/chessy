export type Phase = 'opening' | 'middlegame' | 'endgame'

export function calculateMoveAccuracy(cpLoss: number): number {
  if (cpLoss <= 0) return 100
  if (cpLoss >= 800) return 0
  // Quadratic decay: 0 at 800cp loss, positive below that
  const accuracy = Math.round(100 * Math.pow(1 - cpLoss / 800, 2))
  return Math.max(0, accuracy)
}

export function detectPhase(moveIndex: number, totalMoves: number): Phase {
  // Opening: first ~half of the game up to move 15
  const openingEnd = Math.min(15, Math.floor(totalMoves / 2))
  if (moveIndex <= openingEnd) return 'opening'
  // Endgame: last 10 moves (but only after opening)
  if (moveIndex > totalMoves - 10) return 'endgame'
  return 'middlegame'
}

export function calculatePhaseAccuracy(
  moves: Array<{ phase: Phase; accuracy: number }>,
  phase: Phase
): number {
  const phaseMoves = moves.filter(m => m.phase === phase)
  if (phaseMoves.length === 0) return 0
  return Math.round(phaseMoves.reduce((sum, m) => sum + m.accuracy, 0) / phaseMoves.length)
}

export function uciToArrow(uci: string, color: string): { startSquare: string; endSquare: string; color: string } {
  return {
    startSquare: uci.slice(0, 2),
    endSquare: uci.slice(2, 4),
    color,
  }
}
