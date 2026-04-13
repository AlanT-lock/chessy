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

  let query = supabase
    .from('games')
    .select('id, result, user_elo, opponent_elo, time_control, opening_name, opening_eco, played_at, accuracy_score')
    .eq('user_id', user.id)
    .order('played_at', { ascending: true })

  if (from) query = query.gte('played_at', from)
  if (to) query = query.lte('played_at', to)
  if (timeControl) query = query.eq('time_control', timeControl)

  const { data: games, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!games || games.length === 0) {
    return NextResponse.json({
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      winRate: 0,
      currentElo: {},
      eloDelta: {},
      avgAccuracy: null,
      eloHistory: [],
      topOpenings: [],
    })
  }

  const wins = games.filter(g => g.result === 'win').length
  const draws = games.filter(g => g.result === 'draw').length
  const losses = games.filter(g => g.result === 'loss').length
  const winRate = Math.round((wins / games.length) * 1000) / 10

  const currentElo: Record<string, number> = {}
  const firstElo: Record<string, number> = {}
  for (const g of games) {
    if (!g.time_control || g.user_elo == null) continue
    if (!(g.time_control in firstElo)) firstElo[g.time_control] = g.user_elo
    currentElo[g.time_control] = g.user_elo
  }

  const eloDelta: Record<string, number> = {}
  for (const tc of Object.keys(currentElo)) {
    eloDelta[tc] = currentElo[tc] - (firstElo[tc] ?? currentElo[tc])
  }

  const analyzed = games.filter(g => g.accuracy_score != null)
  const avgAccuracy = analyzed.length
    ? Math.round((analyzed.reduce((s, g) => s + Number(g.accuracy_score), 0) / analyzed.length) * 10) / 10
    : null

  const eloByDate = new Map<string, Record<string, number>>()
  for (const g of games) {
    if (g.user_elo == null || !g.time_control) continue
    const date = g.played_at.slice(0, 10)
    if (!eloByDate.has(date)) eloByDate.set(date, {})
    eloByDate.get(date)![g.time_control] = g.user_elo
  }

  const allTimeControls = new Set<string>()
  for (const g of games) {
    if (g.time_control) allTimeControls.add(g.time_control)
  }

  const eloHistory: Array<{ date: string } & Record<string, number>> = []
  const lastKnown: Record<string, number> = {}
  for (const [date, elos] of eloByDate) {
    for (const tc of allTimeControls) {
      if (elos[tc] != null) lastKnown[tc] = elos[tc]
    }
    eloHistory.push({
      date,
      ...Object.fromEntries(
        Array.from(allTimeControls).map(tc => [tc, lastKnown[tc] ?? 0])
      ),
    } as { date: string } & Record<string, number>)
  }

  const openingStats = new Map<string, { name: string; eco: string | null; games: number; wins: number }>()
  for (const g of games) {
    const name = g.opening_name
    if (!name) continue
    const existing = openingStats.get(name) ?? { name, eco: g.opening_eco, games: 0, wins: 0 }
    existing.games++
    if (g.result === 'win') existing.wins++
    openingStats.set(name, existing)
  }

  const topOpenings = Array.from(openingStats.values())
    .sort((a, b) => b.games - a.games)
    .slice(0, 10)
    .map(o => ({
      name: o.name,
      eco: o.eco,
      games: o.games,
      winRate: Math.round((o.wins / o.games) * 1000) / 10,
    }))

  return NextResponse.json({
    gamesPlayed: games.length,
    wins,
    draws,
    losses,
    winRate,
    currentElo,
    eloDelta,
    avgAccuracy,
    eloHistory,
    topOpenings,
  })
}
