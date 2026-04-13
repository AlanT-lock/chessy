// Offscreen document — runs Stockfish WASM in a Worker
let stockfish = null
let ready = false

function getStockfish() {
  return new Promise((resolve) => {
    if (stockfish && ready) { resolve(stockfish); return }

    stockfish = new Worker('stockfish.js')
    const initHandler = (e) => {
      const line = String(e.data)
      if (line.includes('readyok')) {
        ready = true
        stockfish.removeEventListener('message', initHandler)
        resolve(stockfish)
      }
    }
    stockfish.addEventListener('message', initHandler)
    stockfish.onerror = (e) => console.error('[Offscreen] Stockfish error:', e)
    stockfish.postMessage('uci')
    stockfish.postMessage('isready')

    setTimeout(() => {
      if (!ready) {
        ready = true
        stockfish.removeEventListener('message', initHandler)
        resolve(stockfish)
      }
    }, 10000)
  })
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'ANALYZE') return

  getStockfish().then(sf => {
    const moves = []
    let topEval = 0

    sf.postMessage('position fen ' + msg.fen)
    sf.postMessage('go depth ' + (msg.depth || 15) + ' multipv 3')

    const handler = (e) => {
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
          const delta = idx === 0 ? 200 : cp - topEval
          const classification = delta > 150 ? 'brilliant' : delta > 50 ? 'excellent' : 'good'
          moves[idx] = { move, evaluation: cp, classification }
        }
      }
      if (line.startsWith('bestmove')) {
        sf.removeEventListener('message', handler)
        sendResponse({
          type: 'ANALYSIS_RESULT',
          bestMoves: moves.filter(Boolean).slice(0, 3),
          evaluation: topEval,
        })
      }
    }

    sf.addEventListener('message', handler)
  })

  return true // keep channel open for async response
})
