import type { AnalysisResponse, BestMove } from '../types'

let stockfish: Worker | null = null

function getStockfish(): Worker {
  if (!stockfish) {
    const url = chrome.runtime.getURL('stockfish.js')
    console.log('[Chess Improvement] Loading Stockfish from:', url)
    stockfish = new Worker(url)
    stockfish.postMessage('uci')
    stockfish.postMessage('isready')
  }
  return stockfish
}

function classifyDelta(delta: number): BestMove['classification'] {
  if (delta > 150) return 'brilliant'
  if (delta > 50) return 'excellent'
  return 'good'
}

export function analyzePosition(fen: string, depth: number): Promise<AnalysisResponse> {
  return new Promise((resolve) => {
    const sf = getStockfish()
    const moves: BestMove[] = []
    let topEval = 0

    sf.postMessage(`position fen ${fen}`)
    sf.postMessage(`go depth ${depth} multipv 3`)

    const handler = (e: MessageEvent) => {
      const line = String(e.data)

      if (line.startsWith('info depth') && line.includes('multipv') && line.includes('score cp')) {
        const cpMatch = line.match(/score cp (-?\d+)/)
        const moveMatch = line.match(/ pv ([a-h][1-8][a-h][1-8]\w?)/)
        const pvMatch = line.match(/multipv (\d)/)

        if (cpMatch && moveMatch && pvMatch) {
          const cp = parseInt(cpMatch[1])
          const move = moveMatch[1]
          const idx = parseInt(pvMatch[1]) - 1
          if (idx === 0) topEval = cp
          moves[idx] = { move, evaluation: cp, classification: classifyDelta(idx === 0 ? 200 : cp - topEval) }
        }
      }
      if (line.startsWith('bestmove')) {
        sf.removeEventListener('message', handler)
        const result: AnalysisResponse = {
          type: 'ANALYSIS_RESULT',
          bestMoves: moves.filter(Boolean).slice(0, 3),
          evaluation: topEval,
        }
        console.log(`[Chess Improvement] Stockfish: eval ${topEval}, ${result.bestMoves.length} moves`)
        resolve(result)
      }
    }

    sf.addEventListener('message', handler)
  })
}
