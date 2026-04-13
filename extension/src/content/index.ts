import { isComputerGame, getGameResult } from './game-detector'
import { MoveObserver } from './move-observer'
import { FenTracker } from './fen-tracker'
import { createOverlay, updateOverlay } from './overlay'
import type { AnalysisRequest, AnalysisResponse } from '../types'

if (!isComputerGame()) {
  console.log('[Chess Improvement] partie contre humain — analyse désactivée')
} else {
  const tracker = new FenTracker()
  const observer = new MoveObserver()
  const overlay = createOverlay()

  observer.observe(async (uci) => {
    tracker.applyMove(uci)
    const response: AnalysisResponse = await chrome.runtime.sendMessage({
      type: 'ANALYZE',
      fen: tracker.fen(),
      depth: 15,
    } satisfies AnalysisRequest)
    updateOverlay(overlay, response)
  })

  const poll = setInterval(async () => {
    const result = getGameResult()
    if (!result) return
    clearInterval(poll)
    observer.disconnect()

    const { authToken } = await chrome.storage.local.get('authToken')
    if (!authToken) return

    fetch('https://chessy-eta.vercel.app/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ pgn: tracker.pgn(), result }),
    })
  }, 2000)
}
