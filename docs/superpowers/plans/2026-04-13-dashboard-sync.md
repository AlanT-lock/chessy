# Dashboard & Chess.com Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchroniser les parties chess.com à chaque visite et afficher un dashboard statistique complet avec filtres temporels et par cadence.

**Architecture:** API route `/api/sync` qui appelle chess.com et upsert les parties en BDD. API route `/api/stats` qui agrège les stats avec filtres. Dashboard client component qui orchestre sync → stats → affichage.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL), recharts, chess.com public API, Tailwind CSS v4

---

### Task 1: Chess.com API client (`lib/chess-com.ts`)

**Files:**
- Create: `web/lib/chess-com.ts`
- Create: `web/lib/chess-com.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// web/lib/chess-com.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseChessComGame, determineResult } from './chess-com'

describe('determineResult', () => {
  it('returns win when user wins as white', () => {
    expect(determineResult(
      { username: 'testuser', rating: 1200, result: 'win' },
      { username: 'opponent', rating: 1100, result: 'checkmated' },
      'testuser'
    )).toBe('win')
  })

  it('returns loss when user loses as black', () => {
    expect(determineResult(
      { username: 'opponent', rating: 1100, result: 'win' },
      { username: 'testuser', rating: 1200, result: 'checkmated' },
      'testuser'
    )).toBe('loss')
  })

  it('returns draw on stalemate', () => {
    expect(determineResult(
      { username: 'testuser', rating: 1200, result: 'stalemate' },
      { username: 'opponent', rating: 1100, result: 'stalemate' },
      'testuser'
    )).toBe('draw')
  })

  it('matches username case-insensitively', () => {
    expect(determineResult(
      { username: 'TestUser', rating: 1200, result: 'win' },
      { username: 'opponent', rating: 1100, result: 'checkmated' },
      'testuser'
    )).toBe('win')
  })
})

describe('parseChessComGame', () => {
  const raw = {
    url: 'https://www.chess.com/game/live/123456',
    pgn: '[Event "Live Chess"]\n[Opening "Italian Game"]\n[ECOUrl "https://www.chess.com/openings/Italian-Game"]\n\n1. e4 e5 2. Nf3 Nc6 *',
    time_control: '600',
    time_class: 'rapid',
    rated: true,
    white: { username: 'testuser', rating: 1200, result: 'win' },
    black: { username: 'opponent', rating: 1100, result: 'checkmated' },
    end_time: 1713000000,
  }

  it('parses a chess.com game correctly', () => {
    const result = parseChessComGame(raw, 'testuser')
    expect(result).toEqual({
      chess_com_id: 'https://www.chess.com/game/live/123456',
      pgn: raw.pgn,
      result: 'win',
      user_elo: 1200,
      opponent_elo: 1100,
      opponent_username: 'opponent',
      time_control: 'rapid',
      opening_name: 'Italian Game',
      opening_eco: null,
      played_at: new Date(1713000000 * 1000).toISOString(),
    })
  })

  it('handles user playing black', () => {
    const blackGame = {
      ...raw,
      white: { username: 'opponent', rating: 1100, result: 'resigned' },
      black: { username: 'testuser', rating: 1200, result: 'win' },
    }
    const result = parseChessComGame(blackGame, 'testuser')
    expect(result.user_elo).toBe(1200)
    expect(result.opponent_elo).toBe(1100)
    expect(result.opponent_username).toBe('opponent')
    expect(result.result).toBe('win')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run lib/chess-com.test.ts`
Expected: FAIL — module `./chess-com` not found

- [ ] **Step 3: Write the implementation**

```typescript
// web/lib/chess-com.ts

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
  // If user didn't win and it's not a draw, check if opponent won
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
  // url format: https://api.chess.com/pub/player/{user}/games/2026/04
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run lib/chess-com.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
cd web && git add lib/chess-com.ts lib/chess-com.test.ts && git commit -m "feat: add chess.com API client with game parsing"
```

---

### Task 2: Database schema migration

**Files:**
- Create: `web/supabase/add-sync-columns.sql`

This task adds the new columns to the existing tables. Since we use Supabase directly (no migration tool), this is a SQL script to run manually.

- [ ] **Step 1: Write the migration SQL**

```sql
-- web/supabase/add-sync-columns.sql

-- Add last_sync_month to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sync_month text;

-- Add new columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS chess_com_id text UNIQUE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS user_elo integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent_elo integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent_username text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS time_control text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opening_name text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opening_eco text;

-- Make accuracy_score nullable (it may already be, but ensure it)
ALTER TABLE games ALTER COLUMN accuracy_score DROP NOT NULL;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_games_user_played ON games (user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_chess_com_id ON games (chess_com_id);
```

- [ ] **Step 2: Run the migration on Supabase**

Run the SQL in Supabase dashboard → SQL Editor, or via:
```bash
# If supabase CLI is configured:
# npx supabase db execute --file web/supabase/add-sync-columns.sql
```

Verify: go to Supabase dashboard → Table Editor → check that `users` has `last_sync_month` and `games` has the new columns.

- [ ] **Step 3: Commit**

```bash
cd web && git add supabase/add-sync-columns.sql && git commit -m "feat: add sync columns migration script"
```

---

### Task 3: Sync API route (`/api/sync`)

**Files:**
- Create: `web/app/api/sync/route.ts`

- [ ] **Step 1: Write the sync route**

```typescript
// web/app/api/sync/route.ts
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
```

- [ ] **Step 2: Test manually**

Start dev server: `cd web && npm run dev`

Open browser console and run:
```javascript
const res = await fetch('/api/sync'); const data = await res.json(); console.log(data);
```

Expected: `{ synced: <number>, total: <number> }` — the number depends on how many chess.com games the user has.

- [ ] **Step 3: Commit**

```bash
cd web && git add app/api/sync/route.ts && git commit -m "feat: add /api/sync route for chess.com game synchronization"
```

---

### Task 4: Stats API route (`/api/stats`)

**Files:**
- Create: `web/app/api/stats/route.ts`

- [ ] **Step 1: Write the stats route**

```typescript
// web/app/api/stats/route.ts
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

  // Build query with filters
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

  // Basic stats
  const wins = games.filter(g => g.result === 'win').length
  const draws = games.filter(g => g.result === 'draw').length
  const losses = games.filter(g => g.result === 'loss').length
  const winRate = Math.round((wins / games.length) * 1000) / 10

  // Current elo: last game per time control
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

  // Average accuracy (only for analyzed games)
  const analyzed = games.filter(g => g.accuracy_score != null)
  const avgAccuracy = analyzed.length
    ? Math.round((analyzed.reduce((s, g) => s + Number(g.accuracy_score), 0) / analyzed.length) * 10) / 10
    : null

  // Elo history: group by date, take last elo per time_control per day
  const eloByDate = new Map<string, Record<string, number>>()
  for (const g of games) {
    if (g.user_elo == null || !g.time_control) continue
    const date = g.played_at.slice(0, 10)
    if (!eloByDate.has(date)) eloByDate.set(date, {})
    eloByDate.get(date)![g.time_control] = g.user_elo
  }

  // Forward-fill elo values so each date has all time controls
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

  // Top openings
  const openingStats = new Map<string, { name: string; eco: string | null; games: number; wins: number; totalOpponentElo: number }>()
  for (const g of games) {
    const name = g.opening_name
    if (!name) continue
    const existing = openingStats.get(name) ?? { name, eco: g.opening_eco, games: 0, wins: 0, totalOpponentElo: 0 }
    existing.games++
    if (g.result === 'win') existing.wins++
    if (g.opponent_elo != null) existing.totalOpponentElo += g.opponent_elo
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
```

- [ ] **Step 2: Test manually**

With dev server running, open browser console:
```javascript
const res = await fetch('/api/stats'); const data = await res.json(); console.log(data);
```

Expected: JSON object with all stat fields populated from synced games.

- [ ] **Step 3: Commit**

```bash
cd web && git add app/api/stats/route.ts && git commit -m "feat: add /api/stats route with period and time control filters"
```

---

### Task 5: Games list API route (`/api/games` update)

**Files:**
- Modify: `web/app/api/games/route.ts`

- [ ] **Step 1: Add GET handler to existing file**

Add this `GET` export to `web/app/api/games/route.ts` (keep the existing `POST`):

```typescript
// Add at the top of the file, after existing imports (line 2):
// (existing imports: NextRequest, NextResponse, createServerSupabase are already there)

// Add this new export before the existing POST:
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
```

- [ ] **Step 2: Commit**

```bash
cd web && git add app/api/games/route.ts && git commit -m "feat: add GET /api/games with pagination and filters"
```

---

### Task 6: PeriodFilter component

**Files:**
- Create: `web/components/period-filter.tsx`

- [ ] **Step 1: Write the component**

```typescript
// web/components/period-filter.tsx
'use client'
import { useState } from 'react'

interface Props {
  onFilterChange: (filters: { from: string | null; to: string | null; timeControl: string | null }) => void
}

const PRESETS = [
  { label: "Aujourd'hui", days: 0 },
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
  { label: '3 mois', days: 90 },
  { label: '1 an', days: 365 },
  { label: 'Tout', days: null },
] as const

const TIME_CONTROLS = [
  { label: 'Tout', value: null },
  { label: 'Rapid', value: 'rapid' },
  { label: 'Blitz', value: 'blitz' },
  { label: 'Bullet', value: 'bullet' },
] as const

export function PeriodFilter({ onFilterChange }: Props) {
  const [activePreset, setActivePreset] = useState<number | null>(null)
  const [activeTC, setActiveTC] = useState<string | null>(null)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  function applyPreset(index: number) {
    const preset = PRESETS[index]
    setActivePreset(index)
    setShowCustom(false)
    setCustomFrom('')
    setCustomTo('')

    let from: string | null = null
    if (preset.days !== null) {
      const d = new Date()
      if (preset.days === 0) {
        d.setHours(0, 0, 0, 0)
      } else {
        d.setDate(d.getDate() - preset.days)
      }
      from = d.toISOString()
    }
    onFilterChange({ from, to: null, timeControl: activeTC })
  }

  function applyCustom() {
    setActivePreset(null)
    const from = customFrom ? new Date(customFrom).toISOString() : null
    const to = customTo ? new Date(customTo + 'T23:59:59').toISOString() : null
    onFilterChange({ from, to, timeControl: activeTC })
  }

  function applyTimeControl(tc: string | null) {
    setActiveTC(tc)
    // Re-apply current period filter with new time control
    if (activePreset !== null) {
      const preset = PRESETS[activePreset]
      let from: string | null = null
      if (preset.days !== null) {
        const d = new Date()
        if (preset.days === 0) {
          d.setHours(0, 0, 0, 0)
        } else {
          d.setDate(d.getDate() - preset.days)
        }
        from = d.toISOString()
      }
      onFilterChange({ from, to: null, timeControl: tc })
    } else if (showCustom) {
      const from = customFrom ? new Date(customFrom).toISOString() : null
      const to = customTo ? new Date(customTo + 'T23:59:59').toISOString() : null
      onFilterChange({ from, to, timeControl: tc })
    } else {
      onFilterChange({ from: null, to: null, timeControl: tc })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              activePreset === i
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => { setShowCustom(!showCustom); setActivePreset(null) }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            showCustom
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {TIME_CONTROLS.map(tc => (
          <button
            key={tc.label}
            onClick={() => applyTimeControl(tc.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTC === tc.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tc.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            onClick={applyCustom}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            Appliquer
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/period-filter.tsx && git commit -m "feat: add PeriodFilter component with presets and custom date range"
```

---

### Task 7: StatCard component

**Files:**
- Create: `web/components/stat-card.tsx`

- [ ] **Step 1: Write the component**

```typescript
// web/components/stat-card.tsx
'use client'

interface Props {
  label: string
  value: string
  subtitle?: string
  delta?: number | null
  color?: string
}

export function StatCard({ label, value, subtitle, delta, color = 'text-gray-900' }: Props) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {delta != null && delta !== 0 && (
        <p className={`text-sm font-medium mt-1 ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/stat-card.tsx && git commit -m "feat: add StatCard component"
```

---

### Task 8: EloChart component

**Files:**
- Create: `web/components/elo-chart.tsx`

- [ ] **Step 1: Write the component**

```typescript
// web/components/elo-chart.tsx
'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const TC_COLORS: Record<string, string> = {
  rapid: '#22c55e',
  blitz: '#3b82f6',
  bullet: '#f59e0b',
}

interface Props {
  data: Array<{ date: string } & Record<string, number>>
  timeControls: string[]
}

export function EloChart({ data, timeControls }: Props) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-center py-8">Aucune donnée</p>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
        />
        <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
        <Tooltip
          labelFormatter={d => new Date(d).toLocaleDateString('fr-FR')}
          formatter={(v: number, name: string) => [`${v}`, name.charAt(0).toUpperCase() + name.slice(1)]}
        />
        <Legend />
        {timeControls.map(tc => (
          <Line
            key={tc}
            type="monotone"
            dataKey={tc}
            name={tc.charAt(0).toUpperCase() + tc.slice(1)}
            stroke={TC_COLORS[tc] ?? '#6b7280'}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/elo-chart.tsx && git commit -m "feat: add EloChart component with multi-line time control support"
```

---

### Task 9: WinRateChart component

**Files:**
- Create: `web/components/win-rate-chart.tsx`

- [ ] **Step 1: Write the component**

```typescript
// web/components/win-rate-chart.tsx
'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  wins: number
  draws: number
  losses: number
}

const COLORS = { wins: '#22c55e', draws: '#9ca3af', losses: '#ef4444' }
const LABELS = { wins: 'Victoires', draws: 'Nulles', losses: 'Défaites' }

export function WinRateChart({ wins, draws, losses }: Props) {
  const total = wins + draws + losses
  if (total === 0) {
    return <p className="text-gray-400 text-center py-8">Aucune donnée</p>
  }

  const data = [
    { name: 'wins', value: wins },
    { name: 'draws', value: draws },
    { name: 'losses', value: losses },
  ].filter(d => d.value > 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            stroke="none"
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} (${Math.round((value / total) * 100)}%)`,
              LABELS[name as keyof typeof LABELS],
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold">{Math.round((wins / total) * 100)}%</p>
          <p className="text-xs text-gray-400">win rate</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/win-rate-chart.tsx && git commit -m "feat: add WinRateChart donut component"
```

---

### Task 10: OpeningsTable component

**Files:**
- Create: `web/components/openings-table.tsx`

- [ ] **Step 1: Write the component**

```typescript
// web/components/openings-table.tsx
'use client'

interface Opening {
  name: string
  eco: string | null
  games: number
  winRate: number
}

interface Props {
  openings: Opening[]
}

export function OpeningsTable({ openings }: Props) {
  if (openings.length === 0) {
    return <p className="text-gray-400 text-center py-4">Aucune ouverture enregistrée</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-4">Ouverture</th>
            <th className="py-2 pr-4">ECO</th>
            <th className="py-2 pr-4 text-right">Parties</th>
            <th className="py-2 text-right">Win rate</th>
          </tr>
        </thead>
        <tbody>
          {openings.map(o => (
            <tr key={o.name} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium">{o.name}</td>
              <td className="py-2 pr-4 text-gray-400">{o.eco ?? '—'}</td>
              <td className="py-2 pr-4 text-right">{o.games}</td>
              <td className={`py-2 text-right font-medium ${
                o.winRate >= 55 ? 'text-green-600' : o.winRate <= 45 ? 'text-red-500' : 'text-gray-700'
              }`}>
                {o.winRate}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/openings-table.tsx && git commit -m "feat: add OpeningsTable component"
```

---

### Task 11: GamesTable component

**Files:**
- Create: `web/components/games-table.tsx`

- [ ] **Step 1: Write the component**

```typescript
// web/components/games-table.tsx
'use client'
import Link from 'next/link'

interface Game {
  id: string
  played_at: string
  opponent_username: string | null
  opponent_elo: number | null
  user_elo: number | null
  time_control: string | null
  result: string
  accuracy_score: number | null
}

interface Props {
  games: Game[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const TC_LABELS: Record<string, string> = {
  rapid: 'Rapid',
  blitz: 'Blitz',
  bullet: 'Bullet',
}

export function GamesTable({ games, page, totalPages, onPageChange }: Props) {
  if (games.length === 0) {
    return <p className="text-gray-400 text-center py-4">Aucune partie trouvée</p>
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Adversaire</th>
              <th className="py-2 pr-4">Cadence</th>
              <th className="py-2 pr-4">Résultat</th>
              <th className="py-2 text-right">Analyse</th>
            </tr>
          </thead>
          <tbody>
            {games.map(g => (
              <tr key={g.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 pr-4 text-gray-500">
                  {new Date(g.played_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="py-2 pr-4">
                  <span className="font-medium">{g.opponent_username ?? '—'}</span>
                  {g.opponent_elo != null && (
                    <span className="text-gray-400 ml-1">({g.opponent_elo})</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-gray-500">
                  {g.time_control ? TC_LABELS[g.time_control] ?? g.time_control : '—'}
                </td>
                <td className="py-2 pr-4">
                  <span className={`font-medium ${
                    g.result === 'win' ? 'text-green-600' :
                    g.result === 'loss' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {g.result === 'win' ? 'Victoire' : g.result === 'loss' ? 'Défaite' : 'Nulle'}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <Link
                    href={`/analysis/${g.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-30"
          >
            ←
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/games-table.tsx && git commit -m "feat: add GamesTable component with pagination"
```

---

### Task 12: Dashboard client component

**Files:**
- Create: `web/components/dashboard.tsx`

- [ ] **Step 1: Write the dashboard component**

```typescript
// web/components/dashboard.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { PeriodFilter } from './period-filter'
import { StatCard } from './stat-card'
import { EloChart } from './elo-chart'
import { WinRateChart } from './win-rate-chart'
import { OpeningsTable } from './openings-table'
import { GamesTable } from './games-table'

interface Stats {
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  winRate: number
  currentElo: Record<string, number>
  eloDelta: Record<string, number>
  avgAccuracy: number | null
  eloHistory: Array<{ date: string } & Record<string, number>>
  topOpenings: Array<{ name: string; eco: string | null; games: number; winRate: number }>
}

interface GamesResponse {
  games: Array<{
    id: string
    played_at: string
    opponent_username: string | null
    opponent_elo: number | null
    user_elo: number | null
    time_control: string | null
    result: string
    accuracy_score: number | null
  }>
  total: number
  page: number
  totalPages: number
}

interface Filters {
  from: string | null
  to: string | null
  timeControl: string | null
}

export function Dashboard() {
  const [syncing, setSyncing] = useState(true)
  const [syncResult, setSyncResult] = useState<{ synced: number; total: number } | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [gamesData, setGamesData] = useState<GamesResponse | null>(null)
  const [filters, setFilters] = useState<Filters>({ from: null, to: null, timeControl: null })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Sync on mount
  useEffect(() => {
    async function sync() {
      try {
        const res = await fetch('/api/sync')
        const data = await res.json()
        setSyncResult(data)
      } catch (e) {
        console.error('Sync failed:', e)
      } finally {
        setSyncing(false)
      }
    }
    sync()
  }, [])

  const fetchStats = useCallback(async (f: Filters) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    if (f.timeControl) params.set('timeControl', f.timeControl)

    try {
      const res = await fetch(`/api/stats?${params}`)
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('Stats fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGames = useCallback(async (f: Filters, p: number) => {
    const params = new URLSearchParams()
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    if (f.timeControl) params.set('timeControl', f.timeControl)
    params.set('page', String(p))

    try {
      const res = await fetch(`/api/games?${params}`)
      const data = await res.json()
      setGamesData(data)
    } catch (e) {
      console.error('Games fetch failed:', e)
    }
  }, [])

  // Fetch stats + games after sync completes
  useEffect(() => {
    if (!syncing) {
      fetchStats(filters)
      fetchGames(filters, 1)
    }
  }, [syncing]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterChange(newFilters: Filters) {
    setFilters(newFilters)
    setPage(1)
    fetchStats(newFilters)
    fetchGames(newFilters, 1)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    fetchGames(filters, newPage)
  }

  if (syncing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">Synchronisation des parties chess.com...</p>
      </div>
    )
  }

  // Determine elo display
  const eloDisplay = stats?.currentElo ?? {}
  const eloDelta = stats?.eloDelta ?? {}
  const primaryTC = filters.timeControl ?? Object.keys(eloDisplay).sort()[0]
  const displayElo = primaryTC ? eloDisplay[primaryTC] : null
  const displayDelta = primaryTC ? eloDelta[primaryTC] : null
  const activeTimeControls = filters.timeControl
    ? [filters.timeControl]
    : Object.keys(eloDisplay).filter(tc => ['rapid', 'blitz', 'bullet'].includes(tc))

  return (
    <div className="space-y-6">
      {syncResult && syncResult.synced > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
          {syncResult.synced} nouvelles parties synchronisées ({syncResult.total} au total)
        </div>
      )}

      <PeriodFilter onFilterChange={handleFilterChange} />

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label={primaryTC ? `Elo ${primaryTC.charAt(0).toUpperCase() + primaryTC.slice(1)}` : 'Elo'}
              value={displayElo != null ? String(displayElo) : '—'}
              delta={displayDelta}
              color="text-gray-900"
            />
            <StatCard
              label="Parties jouées"
              value={String(stats.gamesPlayed)}
            />
            <StatCard
              label="Win rate"
              value={`${stats.winRate}%`}
              subtitle={`${stats.wins}V / ${stats.draws}N / ${stats.losses}D`}
              color="text-green-600"
            />
            <StatCard
              label="Précision moyenne"
              value={stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : '—'}
              subtitle={stats.avgAccuracy == null ? 'Aucune partie analysée' : undefined}
              color="text-blue-600"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Évolution Elo</h3>
              <EloChart data={stats.eloHistory} timeControls={activeTimeControls} />
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Répartition V/N/D</h3>
              <WinRateChart wins={stats.wins} draws={stats.draws} losses={stats.losses} />
            </div>
          </div>

          {/* Openings */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Ouvertures les plus jouées</h3>
            <OpeningsTable openings={stats.topOpenings} />
          </div>
        </>
      ) : null}

      {/* Games list */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Parties</h3>
        {gamesData ? (
          <GamesTable
            games={gamesData.games}
            page={gamesData.page}
            totalPages={gamesData.totalPages}
            onPageChange={handlePageChange}
          />
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/dashboard.tsx && git commit -m "feat: add Dashboard client component with sync, stats, and filters"
```

---

### Task 13: Rewrite dashboard page (`app/page.tsx`)

**Files:**
- Modify: `web/app/page.tsx`

- [ ] **Step 1: Rewrite the page**

Replace the entire content of `web/app/page.tsx` with:

```typescript
// web/app/page.tsx
import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Dashboard } from '@/components/dashboard'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('chess_com_username')
    .eq('id', user.id)
    .single()

  if (!profile?.chess_com_username) {
    redirect('/onboarding')
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-gray-500">{profile.chess_com_username} sur chess.com</p>
        </div>
        <Link
          href="/training"
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-green-700 transition"
        >
          Entraînement →
        </Link>
      </div>

      <Dashboard />
    </main>
  )
}
```

- [ ] **Step 2: Verify the build**

Run: `cd web && npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Test in browser**

Run: `cd web && npm run dev`
Open: `http://localhost:3000`

Expected behavior:
1. Spinner "Synchronisation des parties chess.com..." appears
2. After sync completes, dashboard shows with stat cards, charts, openings table, games list
3. Clicking period/cadence filters updates the stats
4. Games table has pagination
5. Clicking "Voir →" on a game navigates to analysis page

- [ ] **Step 4: Commit**

```bash
cd web && git add app/page.tsx && git commit -m "feat: rewrite dashboard page with chess.com sync and full statistics"
```

---

### Task 14: Run all tests and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

Run: `cd web && npx vitest run`
Expected: All tests pass, including the new chess-com tests and existing tests.

- [ ] **Step 2: Run the build**

Run: `cd web && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Final commit (if any test fixes needed)**

```bash
cd web && git add -A && git commit -m "fix: address test/build issues from dashboard implementation"
```

- [ ] **Step 4: Deploy**

```bash
cd web && git push
```

Vercel auto-deploys from push to main.
