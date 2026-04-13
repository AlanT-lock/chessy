import { describe, it, expect } from 'vitest'
import { identifyOpening } from './openings'

describe('identifyOpening', () => {
  it('identifies the Italian Game', () => {
    const result = identifyOpening('1. e4 e5 2. Nf3 Nc6 3. Bc4')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('C50')
    expect(result!.name).toContain('Italian')
  })

  it('identifies the Sicilian Defense', () => {
    const result = identifyOpening('1. e4 c5')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('B20')
    expect(result!.name).toContain('Sicilian')
  })

  it('identifies the French Defense', () => {
    const result = identifyOpening('1. e4 e6')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('C00')
    expect(result!.name).toContain('French')
  })

  it('returns longest matching opening', () => {
    const result = identifyOpening('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6')
    expect(result).not.toBeNull()
    expect(result!.name).toContain('Najdorf')
    expect(result!.length).toBeGreaterThan(2)
  })

  it('returns null for empty or invalid PGN', () => {
    expect(identifyOpening('')).toBeNull()
    expect(identifyOpening('invalid')).toBeNull()
  })

  it('works with full game PGN (matches only the opening part)', () => {
    const result = identifyOpening('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Be7 5. O-O O-O')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('C55')
  })
})
