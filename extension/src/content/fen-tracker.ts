import { Chess } from 'chess.js'

export class FenTracker {
  private chess = new Chess()

  applySan(san: string): boolean {
    try {
      this.chess.move(san)
      return true
    } catch { return false }
  }

  applyMove(uci: string): boolean {
    try {
      this.chess.move({ from: uci.slice(0, 2) as any, to: uci.slice(2, 4) as any, promotion: uci[4] as any })
      return true
    } catch { return false }
  }

  fen() { return this.chess.fen() }
  pgn() { return this.chess.pgn() }
  reset() { this.chess = new Chess() }
}
