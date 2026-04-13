import { describe, it, expect } from 'vitest'
import { classifyEvaluation } from '../lichess'

describe('classifyEvaluation', () => {
  it('blunder when eval drops > 300cp', () => {
    expect(classifyEvaluation(50, -300)).toBe('blunder')
  })
  it('mistake when eval drops 100-300cp', () => {
    expect(classifyEvaluation(50, -100)).toBe('mistake')
  })
  it('inaccuracy when eval drops 50-100cp', () => {
    expect(classifyEvaluation(50, -30)).toBe('inaccuracy')
  })
  it('good when eval is stable', () => {
    expect(classifyEvaluation(50, 60)).toBe('good')
  })
  it('excellent when eval improves > 150cp', () => {
    expect(classifyEvaluation(50, 200)).toBe('excellent')
  })
})
