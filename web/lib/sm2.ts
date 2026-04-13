interface Input {
  success: boolean
  intervalDays: number
  easeFactor: number
  repetitions: number
}

interface Output {
  intervalDays: number
  easeFactor: number
  nextReviewAt: Date
}

export function calculateNextReview({ success, intervalDays, easeFactor, repetitions }: Input): Output {
  if (!success) {
    const ease = Math.max(1.3, easeFactor - 0.2)
    const next = new Date()
    next.setDate(next.getDate() + 1)
    return { intervalDays: 1, easeFactor: ease, nextReviewAt: next }
  }

  const newInterval = repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.round(intervalDays * easeFactor)
  const ease = Math.max(1.3, easeFactor + 0.1)
  const next = new Date()
  next.setDate(next.getDate() + newInterval)
  return { intervalDays: newInterval, easeFactor: ease, nextReviewAt: next }
}
