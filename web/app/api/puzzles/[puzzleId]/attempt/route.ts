import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { calculateNextReview } from '@/lib/sm2'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ puzzleId: string }> }
) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await request.json()
  const { puzzleId } = await params

  const { data: last } = await supabase
    .from('puzzle_attempts')
    .select('*')
    .eq('user_id', user.id)
    .eq('puzzle_id', puzzleId)
    .order('attempted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sm2 = calculateNextReview({
    success,
    intervalDays: last?.interval_days ?? 1,
    easeFactor: last?.ease_factor ?? 2.5,
    repetitions: last ? 1 : 0,
  })

  await supabase.from('puzzle_attempts').insert({
    user_id: user.id,
    puzzle_id: puzzleId,
    success,
    next_review_at: sm2.nextReviewAt.toISOString(),
    interval_days: sm2.intervalDays,
    ease_factor: sm2.easeFactor,
  })

  return NextResponse.json({ nextReviewAt: sm2.nextReviewAt })
}
