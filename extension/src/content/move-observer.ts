export class MoveObserver {
  private observer: MutationObserver | null = null
  private lastCount = 0

  observe(onMove: (uci: string) => void) {
    const target = document.querySelector('[class*="move-list"]') ?? document.body
    this.observer = new MutationObserver(() => {
      const nodes = document.querySelectorAll('[data-ply], [data-uci]')
      if (nodes.length <= this.lastCount) return
      this.lastCount = nodes.length
      const last = nodes[nodes.length - 1]
      const uci = last.getAttribute('data-uci') ?? last.getAttribute('data-move')
      if (uci) onMove(uci)
    })
    this.observer.observe(target, { childList: true, subtree: true })
  }

  disconnect() { this.observer?.disconnect() }
}
