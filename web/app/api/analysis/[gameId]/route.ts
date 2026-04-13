import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { analyzePgn } from '@/lib/lichess'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId } = await params

  const { data: game } = await supabase
    .from('games')
    .select('*, move_analysis(*)')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (game.move_analysis?.length) return NextResponse.json(game)

  const analysis = await analyzePgn(game.pgn)
  await supabase.from('move_analysis').insert(
    analysis.map(m => ({ ...m, game_id: game.id }))
  )

  return NextResponse.json({ ...game, move_analysis: analysis })
}
