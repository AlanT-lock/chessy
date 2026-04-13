import { describe, it, expect } from 'vitest'
import { FenTracker } from '../content/fen-tracker'

describe('FenTracker', () => {
  it('starts at initial position', () => {
    expect(new FenTracker().fen()).toContain('PPPPPPPP/RNBQKBNR w KQkq')
  })
  it('applies a move', () => {
    const t = new FenTracker()
    t.applyMove('e2e4')
    expect(t.fen()).not.toContain('PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  })
  it('resets', () => {
    const t = new FenTracker()
    t.applyMove('e2e4')
    t.reset()
    expect(t.fen()).toContain('PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  })
})
