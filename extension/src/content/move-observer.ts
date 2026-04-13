export class MoveObserver {
  private observer: MutationObserver | null = null
  private lastMoveCount = 0
  private retryTimer: ReturnType<typeof setInterval> | null = null

  observe(onMove: (san: string) => void) {
    // chess.com uses multiple possible selectors for the move list
    const findTarget = () =>
      document.querySelector('.play-controller-scrollable') ??
      document.querySelector('[class*="move-list"]') ??
      document.querySelector('.sidebar-tabset') ??
      document.body

    const extractMoves = (): string[] => {
      // chess.com renders moves as elements with class "node" or "move-text-component"
      const moveNodes = document.querySelectorAll(
        '.move-text-component, .node .move-text, [data-ply]'
      )

      if (moveNodes.length > 0) {
        return Array.from(moveNodes).map(el => el.textContent?.trim() ?? '').filter(Boolean)
      }

      // Fallback: look for move nodes in the vertical move list
      const verticalMoves = document.querySelectorAll(
        '.vertical-move-list .move .move-text, .move-list .move-node'
      )
      if (verticalMoves.length > 0) {
        return Array.from(verticalMoves).map(el => el.textContent?.trim() ?? '').filter(Boolean)
      }

      return []
    }

    const checkForNewMoves = () => {
      const moves = extractMoves()
      if (moves.length > this.lastMoveCount) {
        // Process all new moves (there might be more than one if we missed some)
        for (let i = this.lastMoveCount; i < moves.length; i++) {
          const san = moves[i]
          // Clean up the SAN: remove move numbers, dots, annotations
          const cleaned = san.replace(/^\d+\.+\s*/, '').replace(/[?!+#]+$/, '').trim()
          if (cleaned && /^[a-hKQRBNO0-9x=]/.test(cleaned)) {
            onMove(cleaned)
          }
        }
        this.lastMoveCount = moves.length
      }
    }

    const target = findTarget()
    this.observer = new MutationObserver(() => checkForNewMoves())
    this.observer.observe(target, { childList: true, subtree: true, characterData: true })

    // Also poll every 500ms as a fallback (chess.com uses complex React rendering)
    this.retryTimer = setInterval(() => checkForNewMoves(), 500)
  }

  disconnect() {
    this.observer?.disconnect()
    if (this.retryTimer) clearInterval(this.retryTimer)
  }
}
