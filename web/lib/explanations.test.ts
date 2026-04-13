import { describe, it, expect } from 'vitest'
import { generateExplanation } from './explanations'

describe('generateExplanation', () => {
  it('explains a blunder', () => {
    const text = generateExplanation({
      classification: 'blunder',
      moveSan: 'Bxe5',
      bestMoveSan: 'Nf3',
      evalBefore: 150,
      evalAfter: -200,
    })
    expect(text).toContain('Gaffe')
    expect(text).toContain('Nf3')
  })

  it('explains a mistake', () => {
    const text = generateExplanation({
      classification: 'mistake',
      moveSan: 'd4',
      bestMoveSan: 'e4',
      evalBefore: 50,
      evalAfter: -80,
    })
    expect(text).toContain('Erreur')
    expect(text).toContain('e4')
  })

  it('explains an inaccuracy', () => {
    const text = generateExplanation({
      classification: 'inaccuracy',
      moveSan: 'a3',
      bestMoveSan: 'Nf3',
      evalBefore: 30,
      evalAfter: -25,
    })
    expect(text).toContain('Imprécision')
  })

  it('praises a good move', () => {
    const text = generateExplanation({
      classification: 'good',
      moveSan: 'Nf3',
      bestMoveSan: 'Nf3',
      evalBefore: 30,
      evalAfter: 35,
    })
    expect(text).toContain('Bon coup')
  })

  it('praises an excellent move', () => {
    const text = generateExplanation({
      classification: 'excellent',
      moveSan: 'Qh5',
      bestMoveSan: 'Qh5',
      evalBefore: 100,
      evalAfter: 300,
    })
    expect(text).toContain('Excellent')
  })

  it('praises a brilliant move', () => {
    const text = generateExplanation({
      classification: 'brilliant',
      moveSan: 'Rxf7',
      bestMoveSan: 'Rxf7',
      evalBefore: 50,
      evalAfter: 400,
    })
    expect(text).toContain('Brillant')
  })

  it('shows eval loss for mistakes', () => {
    const text = generateExplanation({
      classification: 'blunder',
      moveSan: 'Kf1',
      bestMoveSan: 'Qxd8',
      evalBefore: 500,
      evalAfter: -100,
    })
    expect(text).toMatch(/\d+(\.\d+)?/)
  })
})
