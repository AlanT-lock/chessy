import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const timeControl = searchParams.get('timeControl')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const offset = (page - 1) * limit

  let query = supabase
    .from('games')
    .select('id, result, user_elo, opponent_elo, opponent_username, time_control, opening_name, played_at, accuracy_score', { count: 'exact' })
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (from) query = query.gte('played_at', from)
  if (to) query = query.lte('played_at', to)
  if (timeControl) query = query.eq('time_control', timeControl)

  const { data: games, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    games: games ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}

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
