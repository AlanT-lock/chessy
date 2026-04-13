import { describe, it, expect } from 'vitest'
import { calculateNextReview } from '../sm2'

describe('calculateNextReview', () => {
  it('schedules 1 day after first success', () => {
    const r = calculateNextReview({ success: true, intervalDays: 1, easeFactor: 2.5, repetitions: 0 })
    expect(r.intervalDays).toBe(1)
  })

  it('schedules 6 days after second success', () => {
    const r = calculateNextReview({ success: true, intervalDays: 1, easeFactor: 2.5, repetitions: 1 })
    expect(r.intervalDays).toBe(6)
  })

  it('resets to 1 day on failure', () => {
    const r = calculateNextReview({ success: false, intervalDays: 10, easeFactor: 2.5, repetitions: 5 })
    expect(r.intervalDays).toBe(1)
  })

  it('ease factor never drops below 1.3', () => {
    const r = calculateNextReview({ success: false, intervalDays: 1, easeFactor: 1.3, repetitions: 0 })
    expect(r.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('nextReviewAt is in the future', () => {
    const r = calculateNextReview({ success: true, intervalDays: 1, easeFactor: 2.5, repetitions: 0 })
    expect(r.nextReviewAt.getTime()).toBeGreaterThan(Date.now())
  })
})
