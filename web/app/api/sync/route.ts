import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import {
  fetchArchiveList,
  fetchMonthGames,
  filterRelevantArchives,
  archiveUrlToMonth,
  parseChessComGame,
} from '@/lib/chess-com'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('chess_com_username, last_sync_month')
    .eq('id', user.id)
    .single()

  if (!profile?.chess_com_username) {
    return NextResponse.json({ error: 'No chess.com username' }, { status: 400 })
  }

  const username = profile.chess_com_username
  const lastSync = profile.last_sync_month as string | null

  // Fetch archive list from chess.com
  const archives = await fetchArchiveList(username)
  const toFetch = filterRelevantArchives(archives, lastSync)

  let synced = 0
  let latestMonth = lastSync

  for (const archiveUrl of toFetch) {
    const rawGames = await fetchMonthGames(archiveUrl)
    const month = archiveUrlToMonth(archiveUrl)

    // Filter to rapid/blitz/bullet only
    const filtered = rawGames.filter(g =>
      ['rapid', 'blitz', 'bullet'].includes(g.time_class)
    )

    if (filtered.length === 0) {
      if (!latestMonth || month > latestMonth) latestMonth = month
      continue
    }

    const parsed = filtered.map(g => parseChessComGame(g, username))

    // Upsert games (chess_com_id is unique)
    const { error } = await supabase
      .from('games')
      .upsert(
        parsed.map(g => ({ ...g, user_id: user.id })),
        { onConflict: 'chess_com_id', ignoreDuplicates: true }
      )

    if (error) {
      console.error('Sync upsert error:', error)
    } else {
      synced += parsed.length
    }

    if (!latestMonth || month > latestMonth) latestMonth = month
  }

  // Update last sync month
  if (latestMonth) {
    await supabase
      .from('users')
      .update({ last_sync_month: latestMonth })
      .eq('id', user.id)
  }

  // Count total games
  const { count } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return NextResponse.json({ synced, total: count ?? 0 })
}
