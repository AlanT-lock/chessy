import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pgn, result, moves } = await request.json()

  const { data: game, error } = await supabase
    .from('games')
    .insert({ user_id: user.id, pgn, result })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (moves?.length) {
    await supabase.from('move_analysis').insert(
      moves.map((m: any) => ({ ...m, game_id: game.id }))
    )

    const blunders = moves.filter((m: any) =>
      (m.classification === 'mistake' || m.classification === 'blunder') && m.fen && m.bestMove
    )
    if (blunders.length) {
      await supabase.from('puzzles').insert(
        blunders.map((m: any) => ({
          user_id: user.id,
          source_game_id: game.id,
          fen: m.fen,
          solution_move: m.bestMove,
          difficulty: m.classification === 'blunder' ? 2 : 1,
        }))
      )
    }
  }

  return NextResponse.json({ gameId: game.id })
}
