export class MoveObserver {
  private observer: MutationObserver | null = null
  private lastMoveCount = 0
  private retryTimer: ReturnType<typeof setInterval> | null = null

  observe(onMove: (san: string) => void) {
    console.log('[Chess Improvement] MoveObserver starting...')

    const extractMoves = (): string[] => {
      // chess.com uses .main-line-ply for each move node
      const nodes = document.querySelectorAll('.main-line-ply')
      if (nodes.length > 0) {
        return Array.from(nodes).map(el => el.textContent?.trim() ?? '').filter(Boolean)
      }
      return []
    }

    const checkForNewMoves = () => {
      const moves = extractMoves()
      if (moves.length > this.lastMoveCount) {
        for (let i = this.lastMoveCount; i < moves.length; i++) {
          const raw = moves[i]
          // Clean: remove move numbers, dots, check/mate symbols, annotations
          const cleaned = raw.replace(/^\d+\.+\s*/, '').replace(/[?!]+$/g, '').trim()
          if (cleaned && /^[a-hKQRBNO0-9x=]/.test(cleaned)) {
            console.log(`[Chess Improvement] Move #${i + 1}: "${cleaned}"`)
            onMove(cleaned)
          }
        }
        this.lastMoveCount = moves.length
      }
    }

    // Watch entire body for DOM changes (chess.com React re-renders)
    this.observer = new MutationObserver(() => checkForNewMoves())
    this.observer.observe(document.body, { childList: true, subtree: true })

    // Poll every 500ms as fallback
    this.retryTimer = setInterval(() => checkForNewMoves(), 500)
  }

  disconnect() {
    this.observer?.disconnect()
    if (this.retryTimer) clearInterval(this.retryTimer)
  }
}
