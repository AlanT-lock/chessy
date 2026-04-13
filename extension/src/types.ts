export interface AnalysisRequest {
  type: 'ANALYZE'
  fen: string
  depth?: number
}

export interface BestMove {
  move: string       // UCI e.g. "e2e4"
  evaluation: number // centipawns
  classification: 'brilliant' | 'excellent' | 'good'
}

export interface AnalysisResponse {
  type: 'ANALYSIS_RESULT'
  bestMoves: BestMove[]
  evaluation: number
}
