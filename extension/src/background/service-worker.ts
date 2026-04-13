import type { AnalysisRequest, AnalysisResponse, BestMove } from '../types'

console.log('[Chess Improvement SW] Service worker started')

let stockfish: Worker | null = null

function getStockfish(): Worker {
  if (!stockfish) {
    const url = chrome.runtime.getURL('stockfish.js')
    console.log('[Chess Improvement SW] Creating Stockfish worker from:', url)
    try {
      stockfish = new Worker(url)
      stockfish.onerror = (e) => console.error('[Chess Improvement SW] Stockfish worker error:', e)
      stockfish.onmessage = (e) => console.log('[Chess Improvement SW] Stockfish init:', e.data)
      stockfish.postMessage('uci')
      stockfish.postMessage('isready')
    } catch (err) {
      console.error('[Chess Improvement SW] Failed to create Stockfish worker:', err)
      throw err
    }
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

    // Remove the init logger
    sf.onmessage = null

    sf.postMessage(`position fen ${fen}`)
    sf.postMessage(`go depth ${depth} multipv 3`)

    const handler = (e: MessageEvent<string>) => {
      const line = e.data
      if (typeof line !== 'string') return

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
        const result = { type: 'ANALYSIS_RESULT' as const, bestMoves: moves.filter(Boolean).slice(0, 3), evaluation: topEval }
        console.log('[Chess Improvement SW] Analysis done:', result.bestMoves.length, 'moves, eval:', topEval)
        resolve(result)
      }
    }

    sf.addEventListener('message', handler)
  })
}

chrome.runtime.onMessage.addListener((msg: AnalysisRequest, _sender, sendResponse) => {
  console.log('[Chess Improvement SW] Received message:', msg.type)
  if (msg.type === 'ANALYZE') {
    analyzePosition(msg.fen, msg.depth ?? 15)
      .then(sendResponse)
      .catch(err => {
        console.error('[Chess Improvement SW] Analysis failed:', err)
        sendResponse({ type: 'ANALYSIS_RESULT', bestMoves: [], evaluation: 0 })
      })
    return true
  }
})
