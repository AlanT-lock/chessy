import { isComputerGame, getGameResult } from './game-detector'
import { MoveObserver } from './move-observer'
import { FenTracker } from './fen-tracker'
import { createOverlay, updateOverlay } from './overlay'
import { analyzePosition } from './stockfish-analyzer'

console.log('[Chess Improvement] Content script loaded on:', location.pathname)
if (!isComputerGame()) {
  console.log('[Chess Improvement] Not a computer game — analysis disabled')
} else {
  console.log('[Chess Improvement] Computer game detected — starting analysis')
  const tracker = new FenTracker()
  const observer = new MoveObserver()
  const overlay = createOverlay()

  observer.observe(async (san) => {
    if (!tracker.applySan(san)) {
      console.log(`[Chess Improvement] Failed to apply move: "${san}"`)
      return
    }
    const fen = tracker.fen()
    console.log(`[Chess Improvement] Analyzing: ${fen}`)

    try {
      const response = await analyzePosition(fen, 15)
      if (response.bestMoves.length > 0) {
        updateOverlay(overlay, response)
      }
    } catch (err) {
      console.error('[Chess Improvement] Analysis error:', err)
    }
  })

  const poll = setInterval(async () => {
    const result = getGameResult()
    if (!result) return
    clearInterval(poll)
    observer.disconnect()

    const { authToken } = await chrome.storage.local.get('authToken')
    if (!authToken) return

    fetch('https://chessy-alant-locks-projects.vercel.app/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ pgn: tracker.pgn(), result }),
    })
  }, 2000)
}
