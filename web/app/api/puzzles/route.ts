import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // First: puzzles due for review
  const { data: due } = await supabase
    .from('puzzle_attempts')
    .select('puzzle_id')
    .eq('user_id', user.id)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (due) {
    const { data: puzzle } = await supabase
      .from('puzzles').select('*').eq('id', due.puzzle_id).single()
    return NextResponse.json(puzzle)
  }

  // Second: never-attempted puzzle
  const { data: attempted } = await supabase
    .from('puzzle_attempts').select('puzzle_id').eq('user_id', user.id)

  const ids = (attempted ?? []).map((a: any) => a.puzzle_id)

  let query = supabase.from('puzzles').select('*').eq('user_id', user.id).limit(1)
  if (ids.length) query = query.not('id', 'in', `(${ids.join(',')})`)

  const { data: puzzle } = await query.maybeSingle()
  if (!puzzle) return NextResponse.json(null, { status: 204 })
  return NextResponse.json(puzzle)
}
