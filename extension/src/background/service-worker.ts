// extension/src/background/service-worker.ts
import type { AnalysisRequest, AnalysisResponse, BestMove } from '../types'

let stockfish: Worker | null = null

function getStockfish(): Worker {
  if (!stockfish) {
    stockfish = new Worker(chrome.runtime.getURL('stockfish.js'))
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

function analyzePosition(fen: string, depth: number): Promise<AnalysisResponse> {
  return new Promise((resolve) => {
    const sf = getStockfish()
    const moves: BestMove[] = []
    let topEval = 0

    sf.postMessage(`position fen ${fen}`)
    sf.postMessage(`go depth ${depth} multipv 3`)

    const handler = (e: MessageEvent<string>) => {
      const line = e.data
      if (line.startsWith('info depth') && line.includes('multipv') && line.includes('score cp')) {
        const cp = parseInt(line.match(/score cp (-?\d+)/)![1])
        const move = line.match(/pv (\S+)/)![1]
        const idx = parseInt(line.match(/multipv (\d)/)![1]) - 1
        if (idx === 0) topEval = cp
        moves[idx] = { move, evaluation: cp, classification: classifyDelta(idx === 0 ? 200 : cp - topEval) }
      }
      if (line.startsWith('bestmove')) {
        sf.removeEventListener('message', handler)
        resolve({ type: 'ANALYSIS_RESULT', bestMoves: moves.filter(Boolean).slice(0, 3), evaluation: topEval })
      }
    }

    sf.addEventListener('message', handler)
  })
}

chrome.runtime.onMessage.addListener((msg: AnalysisRequest, _sender, sendResponse) => {
  if (msg.type === 'ANALYZE') {
    analyzePosition(msg.fen, msg.depth ?? 15).then(sendResponse)
    return true
  }
})
