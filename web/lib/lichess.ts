export type Classification = 'brilliant' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export interface MoveEval {
  moveNumber: number
  movePlayed: string
  bestMove: string
  evaluation: number
  classification: Classification
  explanation: string | null
}

export function classifyEvaluation(prevEval: number, currEval: number): Classification {
  const delta = currEval - prevEval
  if (delta < -300) return 'blunder'
  if (delta < -100) return 'mistake'
  if (delta < -50) return 'inaccuracy'
  if (delta >= 150) return 'excellent'
  return 'good'
}

export async function analyzePgn(pgn: string): Promise<MoveEval[]> {
  const response = await fetch('https://lichess.org/api/analyse/game/pgn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ pgn, multiPv: '1' }),
  })

  if (!response.ok) throw new Error(`Lichess API error: ${response.status}`)

  const data = await response.json()
  const analysis: any[] = data.analysis ?? []

  return analysis.map((item, index) => {
    const prevEval = index > 0 ? (analysis[index - 1].eval ?? 0) : 0
    const currEval = item.eval ?? 0
    return {
      moveNumber: index + 1,
      movePlayed: item.uci ?? '',
      bestMove: item.best ?? '',
      evaluation: currEval,
      classification: classifyEvaluation(prevEval, currEval),
      explanation: item.judgment?.comment ?? null,
    }
  })
}
