interface ChessComPlayer {
  username: string
  rating: number
  result: string
}

interface ChessComRawGame {
  url: string
  pgn: string
  time_control: string
  time_class: string
  rated: boolean
  white: ChessComPlayer
  black: ChessComPlayer
  end_time: number
}

export interface ParsedGame {
  chess_com_id: string
  pgn: string
  result: 'win' | 'loss' | 'draw'
  user_elo: number
  opponent_elo: number
  opponent_username: string
  time_control: string
  opening_name: string | null
  opening_eco: string | null
  played_at: string
}

const WIN_RESULTS = new Set(['win'])
const DRAW_RESULTS = new Set([
  'stalemate', 'insufficient', '50move', 'repetition',
  'agreed', 'timevsinsufficient',
])

export function determineResult(
  white: ChessComPlayer,
  black: ChessComPlayer,
  username: string
): 'win' | 'loss' | 'draw' {
  const isWhite = white.username.toLowerCase() === username.toLowerCase()
  const userResult = isWhite ? white.result : black.result

  if (WIN_RESULTS.has(userResult)) return 'win'
  if (DRAW_RESULTS.has(userResult)) return 'draw'
  const opponentResult = isWhite ? black.result : white.result
  if (WIN_RESULTS.has(opponentResult)) return 'loss'
  return 'draw'
}

function extractOpening(pgn: string): { name: string | null; eco: string | null } {
  const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/)
  const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/)
  return {
    name: openingMatch?.[1] ?? null,
    eco: ecoMatch?.[1] ?? null,
  }
}

export function parseChessComGame(raw: ChessComRawGame, username: string): ParsedGame {
  const isWhite = raw.white.username.toLowerCase() === username.toLowerCase()
  const user = isWhite ? raw.white : raw.black
  const opponent = isWhite ? raw.black : raw.white
  const { name, eco } = extractOpening(raw.pgn)

  return {
    chess_com_id: raw.url,
    pgn: raw.pgn,
    result: determineResult(raw.white, raw.black, username),
    user_elo: user.rating,
    opponent_elo: opponent.rating,
    opponent_username: opponent.username,
    time_control: raw.time_class,
    opening_name: name,
    opening_eco: eco,
    played_at: new Date(raw.end_time * 1000).toISOString(),
  }
}

export async function fetchArchiveList(username: string): Promise<string[]> {
  const res = await fetch(
    `https://api.chess.com/pub/player/${username}/games/archives`,
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`chess.com archives API error: ${res.status}`)
  const data = await res.json()
  return data.archives as string[]
}

export async function fetchMonthGames(archiveUrl: string): Promise<ChessComRawGame[]> {
  const res = await fetch(archiveUrl, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`chess.com month API error: ${res.status}`)
  const data = await res.json()
  return data.games as ChessComRawGame[]
}

export function archiveUrlToMonth(url: string): string {
  const parts = url.split('/')
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
}

export function filterRelevantArchives(
  archives: string[],
  lastSyncMonth: string | null
): string[] {
  if (!lastSyncMonth) return archives
  return archives.filter(url => {
    const month = archiveUrlToMonth(url)
    return month >= lastSyncMonth
  })
}
