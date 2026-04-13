import { describe, it, expect } from 'vitest'
import { calculateMoveAccuracy, detectPhase, calculatePhaseAccuracy, uciToArrow } from './analysis-utils'

describe('calculateMoveAccuracy', () => {
  it('returns 100 for no eval loss', () => {
    expect(calculateMoveAccuracy(0)).toBe(100)
  })

  it('returns lower value for eval loss', () => {
    const acc = calculateMoveAccuracy(200)
    expect(acc).toBeLessThan(100)
    expect(acc).toBeGreaterThan(0)
  })

  it('returns 0 for massive eval loss', () => {
    expect(calculateMoveAccuracy(1000)).toBe(0)
  })

  it('handles negative delta (improvement)', () => {
    expect(calculateMoveAccuracy(-50)).toBe(100)
  })
})

describe('detectPhase', () => {
  it('returns opening for early moves', () => {
    expect(detectPhase(1, 40)).toBe('opening')
    expect(detectPhase(10, 40)).toBe('opening')
  })

  it('returns middlegame for middle moves', () => {
    expect(detectPhase(20, 40)).toBe('middlegame')
  })

  it('returns endgame for late moves', () => {
    expect(detectPhase(35, 40)).toBe('endgame')
  })

  it('handles short games', () => {
    expect(detectPhase(5, 10)).toBe('opening')
    expect(detectPhase(9, 10)).toBe('endgame')
  })
})

describe('calculatePhaseAccuracy', () => {
  const moves = [
    { phase: 'opening' as const, accuracy: 90 },
    { phase: 'opening' as const, accuracy: 80 },
    { phase: 'middlegame' as const, accuracy: 70 },
    { phase: 'middlegame' as const, accuracy: 60 },
    { phase: 'endgame' as const, accuracy: 50 },
  ]

  it('calculates opening accuracy', () => {
    expect(calculatePhaseAccuracy(moves, 'opening')).toBe(85)
  })

  it('calculates middlegame accuracy', () => {
    expect(calculatePhaseAccuracy(moves, 'middlegame')).toBe(65)
  })

  it('calculates endgame accuracy', () => {
    expect(calculatePhaseAccuracy(moves, 'endgame')).toBe(50)
  })

  it('returns 0 for empty phase', () => {
    expect(calculatePhaseAccuracy([], 'opening')).toBe(0)
  })
})

describe('uciToArrow', () => {
  it('converts UCI move to arrow format', () => {
    const arrow = uciToArrow('e2e4', '#22c55e')
    expect(arrow).toEqual({ startSquare: 'e2', endSquare: 'e4', color: '#22c55e' })
  })

  it('handles promotion moves', () => {
    const arrow = uciToArrow('e7e8q', '#22c55e')
    expect(arrow).toEqual({ startSquare: 'e7', endSquare: 'e8', color: '#22c55e' })
  })
})
