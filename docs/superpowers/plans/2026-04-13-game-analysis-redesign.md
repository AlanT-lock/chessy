# Game Analysis Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the basic post-game analysis page into a comprehensive 3-column layout with eval graph, opening identification, move explanations, and accuracy breakdown by phase.

**Architecture:** The page `/analysis/[gameId]` becomes a rich client component with 5 sub-components (GameSummary, EvalGraph, MoveListRedesign, MoveDetail, BoardNavigation). The API route is enriched to compute SAN notation, explanations, opening identification, and summary statistics server-side. A static ECO JSON file provides opening identification. All new pure logic lives in `web/lib/` with unit tests.

**Tech Stack:** Next.js 16 (App Router), react-chessboard v5 (arrows API), recharts (AreaChart), chess.js, vitest, Supabase, Tailwind CSS v4.

---

## File Structure

### New files to create:
- `web/data/eco.json` — Static ECO opening database (~500 entries)
- `web/lib/openings.ts` — Opening identification logic
- `web/lib/openings.test.ts` — Tests for opening identification
- `web/lib/explanations.ts` — Move explanation generator
- `web/lib/explanations.test.ts` — Tests for explanations
- `web/lib/analysis-utils.ts` — Accuracy calculation, phase detection, SAN conversion
- `web/lib/analysis-utils.test.ts` — Tests for analysis utilities
- `web/components/game-summary.tsx` — Summary header component
- `web/components/eval-graph.tsx` — Interactive evaluation graph
- `web/components/move-detail.tsx` — Detailed move panel
- `web/components/board-navigation.tsx` — Navigation buttons for the board

### Files to modify:
- `web/components/chess-board.tsx` — Add arrows and orientation support
- `web/components/move-list.tsx` — Redesign to 2-column format with icons
- `web/app/analysis/[gameId]/page.tsx` — Complete rewrite with 3-column layout
- `web/app/api/analysis/[gameId]/route.ts` — Enrich response with SAN, explanations, summary
- `web/app/globals.css` — Force dark theme for analysis page
- `web/package.json` — Add vitest devDependency

---

### Task 1: Set up vitest and dark theme CSS

**Files:**
- Modify: `web/package.json`
- Modify: `web/app/globals.css`

- [ ] **Step 1: Install vitest**

```bash
cd /Users/alantouati/chess-improvement/web && npm install -D vitest
```

- [ ] **Step 2: Verify existing tests pass**

```bash
cd /Users/alantouati/chess-improvement/web && npx vitest run
```

Expected: 10 tests pass (5 from sm2.test.ts, 5 from lichess.test.ts)

- [ ] **Step 3: Add dark theme CSS to globals.css**

Add to the end of `web/app/globals.css`:

```css
/* Analysis page dark theme */
.analysis-dark {
  --background: #0f172a;
  --foreground: #f1f5f9;
  background: #0f172a;
  color: #f1f5f9;
}

.analysis-dark .panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
}

.analysis-dark .panel-inner {
  padding: 16px;
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/package.json web/package-lock.json web/app/globals.css
git commit -m "chore: add vitest + dark theme CSS for analysis page"
```

---

### Task 2: ECO opening database and identification

**Files:**
- Create: `web/data/eco.json`
- Create: `web/lib/openings.ts`
- Create: `web/lib/openings.test.ts`

- [ ] **Step 1: Write failing tests for opening identification**

Create `web/lib/openings.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { identifyOpening } from './openings'

describe('identifyOpening', () => {
  it('identifies the Italian Game', () => {
    const result = identifyOpening('1. e4 e5 2. Nf3 Nc6 3. Bc4')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('C50')
    expect(result!.name).toContain('Italian')
  })

  it('identifies the Sicilian Defense', () => {
    const result = identifyOpening('1. e4 c5')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('B20')
    expect(result!.name).toContain('Sicilian')
  })

  it('identifies the French Defense', () => {
    const result = identifyOpening('1. e4 e6')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('C00')
    expect(result!.name).toContain('French')
  })

  it('returns longest matching opening', () => {
    // Sicilian Najdorf is more specific than just Sicilian
    const result = identifyOpening('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6')
    expect(result).not.toBeNull()
    expect(result!.name).toContain('Najdorf')
    expect(result!.length).toBeGreaterThan(2)
  })

  it('returns null for empty or invalid PGN', () => {
    expect(identifyOpening('')).toBeNull()
    expect(identifyOpening('invalid')).toBeNull()
  })

  it('works with full game PGN (matches only the opening part)', () => {
    const result = identifyOpening('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Be7 5. O-O O-O')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('C50')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/alantouati/chess-improvement/web && npx vitest run lib/openings.test.ts
```

Expected: FAIL — module `./openings` not found

- [ ] **Step 3: Create the ECO database**

Create `web/data/eco.json` with the top ~100 most common openings. This is a representative subset — the full file should contain ~500 entries but here are the most important ones:

```json
[
  { "code": "A00", "name": "Uncommon Opening", "moves": "1. g4" },
  { "code": "A04", "name": "Reti Opening", "moves": "1. Nf3" },
  { "code": "A10", "name": "English Opening", "moves": "1. c4" },
  { "code": "A20", "name": "English Opening", "moves": "1. c4 e5" },
  { "code": "A40", "name": "Queen's Pawn Opening", "moves": "1. d4" },
  { "code": "A45", "name": "Queen's Pawn Game", "moves": "1. d4 Nf6" },
  { "code": "A46", "name": "Queen's Pawn Game", "moves": "1. d4 Nf6 2. Nf3" },
  { "code": "A80", "name": "Dutch Defense", "moves": "1. d4 f5" },
  { "code": "B00", "name": "King's Pawn Opening", "moves": "1. e4" },
  { "code": "B01", "name": "Scandinavian Defense", "moves": "1. e4 d5" },
  { "code": "B02", "name": "Alekhine's Defense", "moves": "1. e4 Nf6" },
  { "code": "B06", "name": "Modern Defense", "moves": "1. e4 g6" },
  { "code": "B07", "name": "Pirc Defense", "moves": "1. e4 d6 2. d4 Nf6" },
  { "code": "B10", "name": "Caro-Kann Defense", "moves": "1. e4 c6" },
  { "code": "B12", "name": "Caro-Kann Defense: Advance Variation", "moves": "1. e4 c6 2. d4 d5 3. e5" },
  { "code": "B13", "name": "Caro-Kann Defense: Exchange Variation", "moves": "1. e4 c6 2. d4 d5 3. exd5 cxd5" },
  { "code": "B20", "name": "Sicilian Defense", "moves": "1. e4 c5" },
  { "code": "B21", "name": "Sicilian Defense: Smith-Morra Gambit", "moves": "1. e4 c5 2. d4 cxd4 3. c3" },
  { "code": "B22", "name": "Sicilian Defense: Alapin Variation", "moves": "1. e4 c5 2. c3" },
  { "code": "B23", "name": "Sicilian Defense: Closed", "moves": "1. e4 c5 2. Nc3" },
  { "code": "B27", "name": "Sicilian Defense: Hyperaccelerated Dragon", "moves": "1. e4 c5 2. Nf3 g6" },
  { "code": "B30", "name": "Sicilian Defense", "moves": "1. e4 c5 2. Nf3 Nc6" },
  { "code": "B32", "name": "Sicilian Defense: Open", "moves": "1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4" },
  { "code": "B33", "name": "Sicilian Defense: Sveshnikov", "moves": "1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5" },
  { "code": "B40", "name": "Sicilian Defense", "moves": "1. e4 c5 2. Nf3 e6" },
  { "code": "B50", "name": "Sicilian Defense", "moves": "1. e4 c5 2. Nf3 d6" },
  { "code": "B54", "name": "Sicilian Defense: Open", "moves": "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4" },
  { "code": "B60", "name": "Sicilian Defense: Richter-Rauzer", "moves": "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 Nc6 6. Bg5" },
  { "code": "B70", "name": "Sicilian Defense: Dragon Variation", "moves": "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6" },
  { "code": "B90", "name": "Sicilian Defense: Najdorf Variation", "moves": "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6" },
  { "code": "C00", "name": "French Defense", "moves": "1. e4 e6" },
  { "code": "C01", "name": "French Defense: Exchange Variation", "moves": "1. e4 e6 2. d4 d5 3. exd5 exd5" },
  { "code": "C02", "name": "French Defense: Advance Variation", "moves": "1. e4 e6 2. d4 d5 3. e5" },
  { "code": "C03", "name": "French Defense: Tarrasch Variation", "moves": "1. e4 e6 2. d4 d5 3. Nd2" },
  { "code": "C10", "name": "French Defense: Rubinstein Variation", "moves": "1. e4 e6 2. d4 d5 3. Nc3 dxe4" },
  { "code": "C11", "name": "French Defense: Classical", "moves": "1. e4 e6 2. d4 d5 3. Nc3 Nf6" },
  { "code": "C20", "name": "King's Pawn Game", "moves": "1. e4 e5" },
  { "code": "C21", "name": "Danish Gambit", "moves": "1. e4 e5 2. d4 exd4 3. c3" },
  { "code": "C23", "name": "Bishop's Opening", "moves": "1. e4 e5 2. Bc4" },
  { "code": "C25", "name": "Vienna Game", "moves": "1. e4 e5 2. Nc3" },
  { "code": "C30", "name": "King's Gambit", "moves": "1. e4 e5 2. f4" },
  { "code": "C40", "name": "King's Knight Opening", "moves": "1. e4 e5 2. Nf3" },
  { "code": "C41", "name": "Philidor Defense", "moves": "1. e4 e5 2. Nf3 d6" },
  { "code": "C42", "name": "Petrov's Defense", "moves": "1. e4 e5 2. Nf3 Nf6" },
  { "code": "C44", "name": "Scotch Game", "moves": "1. e4 e5 2. Nf3 Nc6 3. d4" },
  { "code": "C45", "name": "Scotch Game", "moves": "1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4" },
  { "code": "C46", "name": "Three Knights Game", "moves": "1. e4 e5 2. Nf3 Nc6 3. Nc3" },
  { "code": "C47", "name": "Four Knights Game", "moves": "1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6" },
  { "code": "C50", "name": "Italian Game", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bc4" },
  { "code": "C51", "name": "Italian Game: Evans Gambit", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4" },
  { "code": "C52", "name": "Italian Game: Evans Gambit Accepted", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4" },
  { "code": "C54", "name": "Italian Game: Classical Variation", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3" },
  { "code": "C55", "name": "Italian Game: Two Knights Defense", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6" },
  { "code": "C57", "name": "Italian Game: Fried Liver Attack", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5" },
  { "code": "C60", "name": "Ruy Lopez", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bb5" },
  { "code": "C65", "name": "Ruy Lopez: Berlin Defense", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6" },
  { "code": "C68", "name": "Ruy Lopez: Exchange Variation", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6" },
  { "code": "C70", "name": "Ruy Lopez: Morphy Defense", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6" },
  { "code": "C78", "name": "Ruy Lopez: Arkhangelsk Variation", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O b5" },
  { "code": "C80", "name": "Ruy Lopez: Open Variation", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Nxe4" },
  { "code": "C84", "name": "Ruy Lopez: Closed Variation", "moves": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7" },
  { "code": "D00", "name": "Queen's Pawn Game", "moves": "1. d4 d5" },
  { "code": "D02", "name": "London System", "moves": "1. d4 d5 2. Nf3 Nf6 3. Bf4" },
  { "code": "D04", "name": "Queen's Pawn Game: Colle System", "moves": "1. d4 d5 2. Nf3 Nf6 3. e3" },
  { "code": "D06", "name": "Queen's Gambit", "moves": "1. d4 d5 2. c4" },
  { "code": "D07", "name": "Queen's Gambit: Chigorin Defense", "moves": "1. d4 d5 2. c4 Nc6" },
  { "code": "D10", "name": "Queen's Gambit: Slav Defense", "moves": "1. d4 d5 2. c4 c6" },
  { "code": "D20", "name": "Queen's Gambit Accepted", "moves": "1. d4 d5 2. c4 dxc4" },
  { "code": "D30", "name": "Queen's Gambit Declined", "moves": "1. d4 d5 2. c4 e6" },
  { "code": "D35", "name": "Queen's Gambit Declined: Exchange Variation", "moves": "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5 exd5" },
  { "code": "D37", "name": "Queen's Gambit Declined: Classical", "moves": "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7" },
  { "code": "D43", "name": "Semi-Slav Defense", "moves": "1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6" },
  { "code": "D70", "name": "Grunfeld Defense", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 d5" },
  { "code": "D76", "name": "Grunfeld Defense: Russian Variation", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. Nf3 Bg7 5. e3" },
  { "code": "D80", "name": "Grunfeld Defense", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. Bf4" },
  { "code": "E00", "name": "Catalan Opening", "moves": "1. d4 Nf6 2. c4 e6 3. g3" },
  { "code": "E04", "name": "Catalan Opening: Open Defense", "moves": "1. d4 Nf6 2. c4 e6 3. g3 d5 4. Bg2 dxc4" },
  { "code": "E10", "name": "Queen's Pawn Game", "moves": "1. d4 Nf6 2. c4 e6 3. Nf3" },
  { "code": "E12", "name": "Queen's Indian Defense", "moves": "1. d4 Nf6 2. c4 e6 3. Nf3 b6" },
  { "code": "E15", "name": "Queen's Indian Defense: Fianchetto", "moves": "1. d4 Nf6 2. c4 e6 3. Nf3 b6 4. g3" },
  { "code": "E20", "name": "Nimzo-Indian Defense", "moves": "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4" },
  { "code": "E32", "name": "Nimzo-Indian Defense: Classical", "moves": "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Qc2" },
  { "code": "E41", "name": "Nimzo-Indian Defense: Hubner Variation", "moves": "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 c5" },
  { "code": "E60", "name": "King's Indian Defense", "moves": "1. d4 Nf6 2. c4 g6" },
  { "code": "E62", "name": "King's Indian Defense: Fianchetto", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. Nf3 d6 5. g3" },
  { "code": "E70", "name": "King's Indian Defense: Classical", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4" },
  { "code": "E73", "name": "King's Indian Defense: Averbakh Variation", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Be2 O-O 6. Bg5" },
  { "code": "E76", "name": "King's Indian Defense: Four Pawns Attack", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f4" },
  { "code": "E80", "name": "King's Indian Defense: Samisch Variation", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3" },
  { "code": "E90", "name": "King's Indian Defense: Classical, Normal", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3" },
  { "code": "E97", "name": "King's Indian Defense: Mar del Plata", "moves": "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6" }
]
```

- [ ] **Step 4: Implement the opening identification function**

Create `web/lib/openings.ts`:

```typescript
import ecoData from '@/data/eco.json'
import { Chess } from 'chess.js'

interface Opening {
  code: string
  name: string
  moves: string
}

interface OpeningResult {
  code: string
  name: string
  length: number  // number of half-moves in the opening
}

// Pre-process: convert each opening's moves to a normalized sequence of SAN moves
const OPENINGS: Array<Opening & { sanMoves: string[] }> = (ecoData as Opening[])
  .map(o => {
    try {
      const chess = new Chess()
      const parts = o.moves.replace(/\d+\.\s*/g, '').trim().split(/\s+/)
      const sanMoves: string[] = []
      for (const m of parts) {
        const result = chess.move(m)
        if (!result) break
        sanMoves.push(result.san)
      }
      return { ...o, sanMoves }
    } catch {
      return { ...o, sanMoves: [] }
    }
  })
  .filter(o => o.sanMoves.length > 0)
  .sort((a, b) => b.sanMoves.length - a.sanMoves.length) // longest first for greedy match

export function identifyOpening(pgn: string): OpeningResult | null {
  if (!pgn || !pgn.trim()) return null

  try {
    const chess = new Chess()
    chess.loadPgn(pgn)
    const gameMoves = chess.history()
    if (gameMoves.length === 0) return null

    let bestMatch: (typeof OPENINGS)[0] | null = null

    for (const opening of OPENINGS) {
      if (opening.sanMoves.length > gameMoves.length) continue

      let matches = true
      for (let i = 0; i < opening.sanMoves.length; i++) {
        if (opening.sanMoves[i] !== gameMoves[i]) {
          matches = false
          break
        }
      }

      if (matches) {
        // Since sorted longest-first, first match is the most specific
        bestMatch = opening
        break
      }
    }

    if (!bestMatch) return null
    return {
      code: bestMatch.code,
      name: bestMatch.name,
      length: bestMatch.sanMoves.length,
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/alantouati/chess-improvement/web && npx vitest run lib/openings.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/data/eco.json web/lib/openings.ts web/lib/openings.test.ts
git commit -m "feat: add ECO opening database and identification"
```

---

### Task 3: Analysis utility functions (accuracy, phases, SAN conversion)

**Files:**
- Create: `web/lib/analysis-utils.ts`
- Create: `web/lib/analysis-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/lib/analysis-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateMoveAccuracy, detectPhase, calculatePhaseAccuracy, uciToArrow } from './analysis-utils'

describe('calculateMoveAccuracy', () => {
  it('returns 100 for no eval loss', () => {
    expect(calculateMoveAccuracy(0)).toBe(100)
  })

  it('returns lower value for eval loss', () => {
    const acc = calculateMoveAccuracy(200) // lost 200cp
    expect(acc).toBeLessThan(100)
    expect(acc).toBeGreaterThan(0)
  })

  it('returns 0 for massive eval loss', () => {
    expect(calculateMoveAccuracy(1000)).toBe(0)
  })

  it('handles negative delta (improvement)', () => {
    expect(calculateMoveAccuracy(-50)).toBe(100)
  })
})

describe('detectPhase', () => {
  it('returns opening for early moves', () => {
    expect(detectPhase(1, 40)).toBe('opening')
    expect(detectPhase(10, 40)).toBe('opening')
  })

  it('returns middlegame for middle moves', () => {
    expect(detectPhase(20, 40)).toBe('middlegame')
  })

  it('returns endgame for late moves', () => {
    expect(detectPhase(35, 40)).toBe('endgame')
  })

  it('handles short games', () => {
    expect(detectPhase(5, 10)).toBe('opening')
    expect(detectPhase(9, 10)).toBe('endgame')
  })
})

describe('calculatePhaseAccuracy', () => {
  const moves = [
    { phase: 'opening' as const, accuracy: 90 },
    { phase: 'opening' as const, accuracy: 80 },
    { phase: 'middlegame' as const, accuracy: 70 },
    { phase: 'middlegame' as const, accuracy: 60 },
    { phase: 'endgame' as const, accuracy: 50 },
  ]

  it('calculates opening accuracy', () => {
    expect(calculatePhaseAccuracy(moves, 'opening')).toBe(85)
  })

  it('calculates middlegame accuracy', () => {
    expect(calculatePhaseAccuracy(moves, 'middlegame')).toBe(65)
  })

  it('calculates endgame accuracy', () => {
    expect(calculatePhaseAccuracy(moves, 'endgame')).toBe(50)
  })

  it('returns 0 for empty phase', () => {
    expect(calculatePhaseAccuracy([], 'opening')).toBe(0)
  })
})

describe('uciToArrow', () => {
  it('converts UCI move to arrow format', () => {
    const arrow = uciToArrow('e2e4', '#22c55e')
    expect(arrow).toEqual({ startSquare: 'e2', endSquare: 'e4', color: '#22c55e' })
  })

  it('handles promotion moves', () => {
    const arrow = uciToArrow('e7e8q', '#22c55e')
    expect(arrow).toEqual({ startSquare: 'e7', endSquare: 'e8', color: '#22c55e' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/alantouati/chess-improvement/web && npx vitest run lib/analysis-utils.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the utility functions**

Create `web/lib/analysis-utils.ts`:

```typescript
export type Phase = 'opening' | 'middlegame' | 'endgame'

/**
 * Calculate accuracy for a single move based on centipawn loss.
 * 0cp loss = 100%, 200cp loss = 0%. Clamped between 0-100.
 */
export function calculateMoveAccuracy(cpLoss: number): number {
  if (cpLoss <= 0) return 100
  return Math.max(0, Math.round(100 - cpLoss * 0.5))
}

/**
 * Detect which phase of the game a move is in.
 * Opening: moves 1-15
 * Endgame: last 10 moves
 * Middlegame: everything in between
 */
export function detectPhase(moveIndex: number, totalMoves: number): Phase {
  if (moveIndex <= 15) return 'opening'
  if (moveIndex > totalMoves - 10) return 'endgame'
  return 'middlegame'
}

/**
 * Calculate average accuracy for a specific game phase.
 */
export function calculatePhaseAccuracy(
  moves: Array<{ phase: Phase; accuracy: number }>,
  phase: Phase
): number {
  const phaseMoves = moves.filter(m => m.phase === phase)
  if (phaseMoves.length === 0) return 0
  return Math.round(phaseMoves.reduce((sum, m) => sum + m.accuracy, 0) / phaseMoves.length)
}

/**
 * Convert a UCI move string to an arrow object for react-chessboard.
 */
export function uciToArrow(uci: string, color: string): { startSquare: string; endSquare: string; color: string } {
  return {
    startSquare: uci.slice(0, 2),
    endSquare: uci.slice(2, 4),
    color,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/alantouati/chess-improvement/web && npx vitest run lib/analysis-utils.test.ts
```

Expected: All 11 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/lib/analysis-utils.ts web/lib/analysis-utils.test.ts
git commit -m "feat: add analysis utility functions (accuracy, phases, arrows)"
```

---

### Task 4: Move explanation generator

**Files:**
- Create: `web/lib/explanations.ts`
- Create: `web/lib/explanations.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/lib/explanations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateExplanation } from './explanations'
import type { Classification } from '@/lib/lichess'

describe('generateExplanation', () => {
  it('explains a blunder', () => {
    const text = generateExplanation({
      classification: 'blunder',
      moveSan: 'Bxe5',
      bestMoveSan: 'Nf3',
      evalBefore: 150,
      evalAfter: -200,
    })
    expect(text).toContain('Gaffe')
    expect(text).toContain('Nf3')
  })

  it('explains a mistake', () => {
    const text = generateExplanation({
      classification: 'mistake',
      moveSan: 'd4',
      bestMoveSan: 'e4',
      evalBefore: 50,
      evalAfter: -80,
    })
    expect(text).toContain('Erreur')
    expect(text).toContain('e4')
  })

  it('explains an inaccuracy', () => {
    const text = generateExplanation({
      classification: 'inaccuracy',
      moveSan: 'a3',
      bestMoveSan: 'Nf3',
      evalBefore: 30,
      evalAfter: -25,
    })
    expect(text).toContain('Imprécision')
  })

  it('praises a good move', () => {
    const text = generateExplanation({
      classification: 'good',
      moveSan: 'Nf3',
      bestMoveSan: 'Nf3',
      evalBefore: 30,
      evalAfter: 35,
    })
    expect(text).toContain('Bon coup')
  })

  it('praises an excellent move', () => {
    const text = generateExplanation({
      classification: 'excellent',
      moveSan: 'Qh5',
      bestMoveSan: 'Qh5',
      evalBefore: 100,
      evalAfter: 300,
    })
    expect(text).toContain('Excellent')
  })

  it('praises a brilliant move', () => {
    const text = generateExplanation({
      classification: 'brilliant',
      moveSan: 'Rxf7',
      bestMoveSan: 'Rxf7',
      evalBefore: 50,
      evalAfter: 400,
    })
    expect(text).toContain('Brillant')
  })

  it('shows eval loss for mistakes', () => {
    const text = generateExplanation({
      classification: 'blunder',
      moveSan: 'Kf1',
      bestMoveSan: 'Qxd8',
      evalBefore: 500,
      evalAfter: -100,
    })
    expect(text).toMatch(/\d+(\.\d+)?/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/alantouati/chess-improvement/web && npx vitest run lib/explanations.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the explanation generator**

Create `web/lib/explanations.ts`:

```typescript
import type { Classification } from '@/lib/lichess'

interface ExplanationInput {
  classification: Classification
  moveSan: string
  bestMoveSan: string
  evalBefore: number  // centipawns
  evalAfter: number   // centipawns
}

export function generateExplanation(input: ExplanationInput): string {
  const { classification, moveSan, bestMoveSan, evalBefore, evalAfter } = input
  const loss = Math.abs(evalBefore - evalAfter) / 100
  const lossStr = loss.toFixed(1)
  const isSameMove = moveSan === bestMoveSan

  switch (classification) {
    case 'brilliant':
      return `Brillant ! ${moveSan} est un coup difficile à trouver mais c'est le meilleur dans cette position.`

    case 'excellent':
      if (isSameMove) {
        return `Excellent ! Tu as trouvé le meilleur coup ${moveSan}.`
      }
      return `Excellent coup ! ${moveSan} est très proche du meilleur coup ${bestMoveSan}.`

    case 'good':
      if (isSameMove) {
        return `Bon coup ! ${moveSan} est le meilleur coup dans cette position.`
      }
      return `Bon coup. ${moveSan} est un coup solide.`

    case 'inaccuracy':
      return `Imprécision. ${moveSan} perd ${lossStr} pions d'évaluation. Le meilleur coup était ${bestMoveSan}.`

    case 'mistake':
      return `Erreur. ${moveSan} perd ${lossStr} pions d'évaluation. Le meilleur coup était ${bestMoveSan}.`

    case 'blunder':
      return `Gaffe ! ${moveSan} perd ${lossStr} pions d'évaluation. Le meilleur coup était ${bestMoveSan}.`
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/alantouati/chess-improvement/web && npx vitest run lib/explanations.test.ts
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/lib/explanations.ts web/lib/explanations.test.ts
git commit -m "feat: add move explanation generator"
```

---

### Task 5: Enrich the analysis API route

**Files:**
- Modify: `web/app/api/analysis/[gameId]/route.ts`

- [ ] **Step 1: Rewrite the API route with enriched response**

Replace the full content of `web/app/api/analysis/[gameId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { analyzePgn, type Classification } from '@/lib/lichess'
import { identifyOpening } from '@/lib/openings'
import { generateExplanation } from '@/lib/explanations'
import { calculateMoveAccuracy, detectPhase, calculatePhaseAccuracy, type Phase } from '@/lib/analysis-utils'
import { Chess } from 'chess.js'

interface EnrichedMove {
  moveNumber: number
  color: 'white' | 'black'
  san: string
  movePlayed: string
  bestMove: string
  bestMoveSan: string
  evaluation: number
  prevEvaluation: number
  classification: Classification
  explanation: string
  isPlayerMove: boolean
  phase: Phase
  accuracy: number
}

function uciToSan(fen: string, uci: string): string {
  if (!uci) return ''
  try {
    const chess = new Chess(fen)
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] as 'q' | 'r' | 'b' | 'n' | undefined,
    })
    return move ? move.san : uci
  } catch {
    return uci
  }
}

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

  // Get raw analysis (from DB or Lichess)
  let rawMoves = game.move_analysis ?? []
  if (!rawMoves.length) {
    rawMoves = await analyzePgn(game.pgn)
    await supabase.from('move_analysis').insert(
      rawMoves.map((m: any) => ({ ...m, game_id: game.id }))
    )
  }

  // Build position history for SAN conversion
  const chess = new Chess()
  chess.loadPgn(game.pgn)
  const history = chess.history({ verbose: true })

  // Determine player color from game result context
  // Default to white; if we have header info we could use it
  const playerColor: 'white' | 'black' = 'white'
  const totalMoves = rawMoves.length

  // Enrich each move
  const posChess = new Chess()
  const enrichedMoves: EnrichedMove[] = rawMoves.map((raw: any, i: number) => {
    const fen = posChess.fen()
    const color: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black'
    const moveNumber = Math.floor(i / 2) + 1
    const prevEval = i > 0 ? (rawMoves[i - 1].evaluation ?? 0) : 0
    const currEval = raw.evaluation ?? 0

    // Compute eval loss from the current player's perspective
    const evalDelta = color === 'white'
      ? prevEval - currEval  // white wants positive eval
      : currEval - prevEval  // black wants negative eval
    const cpLoss = Math.max(0, evalDelta)

    const san = history[i]?.san ?? raw.movePlayed
    const bestMoveSan = uciToSan(fen, raw.bestMove)
    const phase = detectPhase(moveNumber, Math.ceil(totalMoves / 2))
    const accuracy = calculateMoveAccuracy(cpLoss)

    const explanation = generateExplanation({
      classification: raw.classification,
      moveSan: san,
      bestMoveSan: bestMoveSan || san,
      evalBefore: prevEval,
      evalAfter: currEval,
    })

    // Advance position
    if (history[i]) {
      try { posChess.move(history[i].san) } catch {}
    }

    return {
      moveNumber,
      color,
      san,
      movePlayed: raw.movePlayed,
      bestMove: raw.bestMove,
      bestMoveSan,
      evaluation: currEval,
      prevEvaluation: prevEval,
      classification: raw.classification,
      explanation,
      isPlayerMove: color === playerColor,
      phase,
      accuracy,
    }
  })

  // Build summary
  const opening = identifyOpening(game.pgn)
  const classificationCounts: Record<Classification, number> = {
    brilliant: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0,
  }
  for (const m of enrichedMoves) {
    classificationCounts[m.classification]++
  }

  const playerMoves = enrichedMoves.filter(m => m.isPlayerMove)
  const overallAccuracy = playerMoves.length > 0
    ? Math.round(playerMoves.reduce((s, m) => s + m.accuracy, 0) / playerMoves.length)
    : 0

  const phaseMoves = playerMoves.map(m => ({ phase: m.phase, accuracy: m.accuracy }))

  return NextResponse.json({
    game: {
      id: game.id,
      pgn: game.pgn,
      result: game.result,
      played_at: game.played_at,
    },
    moves: enrichedMoves,
    summary: {
      accuracy: overallAccuracy,
      opening,
      moveBreakdown: classificationCounts,
      phaseAccuracy: {
        opening: calculatePhaseAccuracy(phaseMoves, 'opening'),
        middlegame: calculatePhaseAccuracy(phaseMoves, 'middlegame'),
        endgame: calculatePhaseAccuracy(phaseMoves, 'endgame'),
      },
      playerColor,
    },
  })
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd /Users/alantouati/chess-improvement/web && npx next build 2>&1 | tail -20
```

Expected: Build succeeds without type errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/app/api/analysis/\\[gameId\\]/route.ts
git commit -m "feat: enrich analysis API with SAN, explanations, opening, accuracy"
```

---

### Task 6: Update ChessBoard component (arrows + orientation)

**Files:**
- Modify: `web/components/chess-board.tsx`

- [ ] **Step 1: Rewrite the ChessBoard component**

Replace the full content of `web/components/chess-board.tsx`:

```typescript
'use client'
import { Chessboard } from 'react-chessboard'
import type { Arrow } from 'react-chessboard/dist/types'

interface Props {
  fen: string
  orientation?: 'white' | 'black'
  arrows?: Arrow[]
  onSquareClick?: (square: string) => void
  highlightSquares?: Record<string, React.CSSProperties>
}

export function ChessBoard({ fen, orientation = 'white', arrows = [], onSquareClick, highlightSquares }: Props) {
  return (
    <Chessboard
      options={{
        position: fen,
        boardOrientation: orientation,
        arrows,
        allowDrawingArrows: false,
        allowDragging: false,
        onSquareClick: onSquareClick
          ? ({ square }: { piece: any; square: string }) => onSquareClick(square)
          : undefined,
        squareStyles: highlightSquares,
        boardStyle: { width: '100%', maxWidth: '500px' },
      }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/components/chess-board.tsx
git commit -m "feat: add arrows and orientation support to ChessBoard"
```

---

### Task 7: GameSummary component

**Files:**
- Create: `web/components/game-summary.tsx`

- [ ] **Step 1: Create the GameSummary component**

Create `web/components/game-summary.tsx`:

```typescript
'use client'
import type { Classification } from '@/lib/lichess'

const CLASS_COLORS: Record<Classification, string> = {
  brilliant: 'bg-cyan-500',
  excellent: 'bg-green-500',
  good: 'bg-slate-400',
  inaccuracy: 'bg-yellow-500',
  mistake: 'bg-orange-500',
  blunder: 'bg-red-500',
}

const CLASS_LABELS: Record<Classification, string> = {
  brilliant: 'Brillant',
  excellent: 'Excellent',
  good: 'Bon',
  inaccuracy: 'Imprécision',
  mistake: 'Erreur',
  blunder: 'Gaffe',
}

interface Props {
  result: 'win' | 'loss' | 'draw'
  accuracy: number
  opening: { code: string; name: string } | null
  moveBreakdown: Record<Classification, number>
  phaseAccuracy: { opening: number; middlegame: number; endgame: number }
}

export function GameSummary({ result, accuracy, opening, moveBreakdown, phaseAccuracy }: Props) {
  const resultLabel = result === 'win' ? 'Victoire' : result === 'loss' ? 'Défaite' : 'Nulle'
  const resultColor = result === 'win' ? 'text-green-400' : result === 'loss' ? 'text-red-400' : 'text-slate-400'

  const totalMoves = Object.values(moveBreakdown).reduce((a, b) => a + b, 0)
  const classifications: Classification[] = ['brilliant', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder']

  return (
    <div className="panel">
      <div className="panel-inner">
        {/* Top row: result + accuracy + opening */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-4">
            <span className={`text-2xl font-bold ${resultColor}`}>{resultLabel}</span>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{accuracy}%</div>
              <div className="text-xs text-slate-400">Précision</div>
            </div>
          </div>
          {opening && (
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-200">{opening.name}</div>
              <div className="text-xs text-slate-500">{opening.code}</div>
            </div>
          )}
        </div>

        {/* Move breakdown bar */}
        {totalMoves > 0 && (
          <div className="mb-4">
            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {classifications.map(c => {
                const count = moveBreakdown[c]
                if (count === 0) return null
                const pct = (count / totalMoves) * 100
                return (
                  <div
                    key={c}
                    className={`${CLASS_COLORS[c]} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${CLASS_LABELS[c]}: ${count}`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              {classifications.map(c => {
                const count = moveBreakdown[c]
                if (count === 0) return null
                return (
                  <span key={c} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${CLASS_COLORS[c]}`} />
                    {count} {CLASS_LABELS[c]}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Phase accuracy */}
        <div className="flex gap-3">
          {([
            { label: 'Ouverture', value: phaseAccuracy.opening },
            { label: 'Milieu', value: phaseAccuracy.middlegame },
            { label: 'Finale', value: phaseAccuracy.endgame },
          ] as const).map(p => (
            <div key={p.label} className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-center">
              <div className="text-lg font-bold text-white">{p.value}%</div>
              <div className="text-xs text-slate-500">{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/components/game-summary.tsx
git commit -m "feat: add GameSummary component"
```

---

### Task 8: EvalGraph component

**Files:**
- Create: `web/components/eval-graph.tsx`

- [ ] **Step 1: Create the EvalGraph component**

Create `web/components/eval-graph.tsx`:

```typescript
'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import type { Classification } from '@/lib/lichess'

interface EvalPoint {
  moveIndex: number
  moveNumber: number
  eval: number
  classification: Classification
  san: string
}

interface Props {
  data: EvalPoint[]
  selectedIndex: number
  onSelect: (index: number) => void
}

const CLAMP = 5 // clamp eval between -5 and +5

function clampEval(cp: number): number {
  const pawns = cp / 100
  return Math.max(-CLAMP, Math.min(CLAMP, pawns))
}

export function EvalGraph({ data, selectedIndex, onSelect }: Props) {
  const chartData = data.map(d => ({
    ...d,
    evalClamped: clampEval(d.eval),
    isError: d.classification === 'blunder' || d.classification === 'mistake',
  }))

  return (
    <div className="panel" style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          onClick={(e: any) => {
            if (e?.activeTooltipIndex != null) {
              onSelect(e.activeTooltipIndex)
            }
          }}
          style={{ cursor: 'pointer' }}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#22c55e" stopOpacity={0} />
              <stop offset="50%" stopColor="#ef4444" stopOpacity={0} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="moveNumber"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            domain={[-CLAMP, CLAMP]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            tickFormatter={(v: number) => v > 0 ? `+${v}` : `${v}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200">
                  <div>{d.moveNumber}. {d.san}</div>
                  <div className="text-slate-400">{clampEval(d.eval) > 0 ? '+' : ''}{clampEval(d.eval).toFixed(1)}</div>
                </div>
              )
            }}
          />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
          {selectedIndex >= 0 && selectedIndex < chartData.length && (
            <ReferenceLine x={chartData[selectedIndex]?.moveNumber} stroke="#3b82f6" strokeWidth={2} />
          )}
          <Area
            type="monotone"
            dataKey="evalClamped"
            stroke="#94a3b8"
            strokeWidth={2}
            fill="url(#evalGradient)"
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (!payload.isError) return <circle key={props.index} cx={cx} cy={cy} r={0} />
              return (
                <circle
                  key={props.index}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={payload.classification === 'blunder' ? '#ef4444' : '#f97316'}
                  stroke="none"
                />
              )
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/components/eval-graph.tsx
git commit -m "feat: add interactive EvalGraph component"
```

---

### Task 9: Redesign MoveList component (2-column format)

**Files:**
- Modify: `web/components/move-list.tsx`

- [ ] **Step 1: Rewrite the MoveList component**

Replace the full content of `web/components/move-list.tsx`:

```typescript
'use client'
import { useEffect, useRef } from 'react'
import type { Classification } from '@/lib/lichess'

const CLASS_ICONS: Record<Classification, { icon: string; color: string }> = {
  brilliant:   { icon: '★★', color: '#06b6d4' },
  excellent:   { icon: '★',  color: '#22c55e' },
  good:        { icon: '✓',  color: '#94a3b8' },
  inaccuracy:  { icon: '?!', color: '#eab308' },
  mistake:     { icon: '?',  color: '#f97316' },
  blunder:     { icon: '??', color: '#ef4444' },
}

interface Move {
  moveNumber: number
  color: 'white' | 'black'
  san: string
  classification: Classification
}

interface Props {
  moves: Move[]
  selectedIndex: number
  onSelect: (i: number) => void
}

export function MoveList({ moves, selectedIndex, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  // Group moves into pairs (white, black)
  const rows: Array<{ number: number; white?: { move: Move; index: number }; black?: { move: Move; index: number } }> = []
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]
    if (move.color === 'white') {
      rows.push({ number: move.moveNumber, white: { move, index: i } })
    } else {
      if (rows.length === 0 || rows[rows.length - 1].black) {
        rows.push({ number: move.moveNumber })
      }
      rows[rows.length - 1].black = { move, index: i }
    }
  }

  function renderMoveCell(entry: { move: Move; index: number } | undefined) {
    if (!entry) return <div className="flex-1" />
    const { move, index } = entry
    const icon = CLASS_ICONS[move.classification]
    const isSelected = index === selectedIndex

    return (
      <button
        ref={isSelected ? selectedRef : undefined}
        onClick={() => onSelect(index)}
        className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
          isSelected
            ? 'bg-blue-500/20 text-white'
            : 'text-slate-300 hover:bg-slate-700/50'
        }`}
      >
        <span className="font-mono font-medium">{move.san}</span>
        {move.classification !== 'good' && (
          <span style={{ color: icon.color }} className="text-xs font-bold">{icon.icon}</span>
        )}
      </button>
    )
  }

  return (
    <div ref={containerRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center border-b border-slate-700/30">
          <span className="w-8 text-xs text-slate-500 text-center shrink-0">{row.number}.</span>
          {renderMoveCell(row.white)}
          {renderMoveCell(row.black)}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/components/move-list.tsx
git commit -m "feat: redesign MoveList with 2-column layout and classification icons"
```

---

### Task 10: MoveDetail panel component

**Files:**
- Create: `web/components/move-detail.tsx`

- [ ] **Step 1: Create the MoveDetail component**

Create `web/components/move-detail.tsx`:

```typescript
'use client'
import type { Classification } from '@/lib/lichess'

const CLASS_CONFIG: Record<Classification, { label: string; icon: string; bg: string; text: string }> = {
  brilliant:   { label: 'Brillant',     icon: '★★', bg: 'bg-cyan-500/20',   text: 'text-cyan-400' },
  excellent:   { label: 'Excellent',    icon: '★',  bg: 'bg-green-500/20',  text: 'text-green-400' },
  good:        { label: 'Bon coup',     icon: '✓',  bg: 'bg-slate-500/20',  text: 'text-slate-300' },
  inaccuracy:  { label: 'Imprécision',  icon: '?!', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  mistake:     { label: 'Erreur',       icon: '?',  bg: 'bg-orange-500/20', text: 'text-orange-400' },
  blunder:     { label: 'Gaffe',        icon: '??', bg: 'bg-red-500/20',    text: 'text-red-400' },
}

interface Props {
  moveNumber: number
  color: 'white' | 'black'
  san: string
  bestMoveSan: string
  classification: Classification
  evaluation: number
  prevEvaluation: number
  explanation: string
}

export function MoveDetail({ moveNumber, color, san, bestMoveSan, classification, evaluation, prevEvaluation, explanation }: Props) {
  const config = CLASS_CONFIG[classification]
  const evalBefore = (prevEvaluation / 100)
  const evalAfter = (evaluation / 100)
  const isSameMove = san === bestMoveSan

  const formatEval = (v: number) => v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)

  return (
    <div className="panel">
      <div className="panel-inner space-y-4">
        {/* Classification badge */}
        <div className={`${config.bg} rounded-lg px-4 py-3 flex items-center gap-3`}>
          <span className={`text-2xl ${config.text}`}>{config.icon}</span>
          <span className={`text-lg font-bold ${config.text}`}>{config.label}</span>
        </div>

        {/* Move info */}
        <div>
          <div className="text-xs text-slate-500 mb-1">Coup {moveNumber} ({color === 'white' ? 'Blancs' : 'Noirs'})</div>
          <div className="text-xl font-bold font-mono text-white">{san}</div>
        </div>

        {/* Best move if different */}
        {!isSameMove && bestMoveSan && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <div className="text-xs text-green-500 mb-0.5">Meilleur coup</div>
            <div className="text-lg font-bold font-mono text-green-400">{bestMoveSan}</div>
          </div>
        )}

        {/* Evaluation change */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Éval :</span>
          <span className={`font-mono font-semibold ${evalBefore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatEval(evalBefore)}
          </span>
          <span className="text-slate-600">→</span>
          <span className={`font-mono font-semibold ${evalAfter >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatEval(evalAfter)}
          </span>
        </div>

        {/* Explanation */}
        <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/components/move-detail.tsx
git commit -m "feat: add MoveDetail panel component"
```

---

### Task 11: BoardNavigation component

**Files:**
- Create: `web/components/board-navigation.tsx`

- [ ] **Step 1: Create the BoardNavigation component**

Create `web/components/board-navigation.tsx`:

```typescript
'use client'

interface Props {
  current: number
  total: number
  onNavigate: (index: number) => void
}

export function BoardNavigation({ current, total, onNavigate }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      <button
        onClick={() => onNavigate(-1)}
        disabled={current <= -1}
        className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
      >
        |&lt;
      </button>
      <button
        onClick={() => onNavigate(Math.max(-1, current - 1))}
        disabled={current <= -1}
        className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
      >
        &lt;
      </button>
      <span className="text-xs text-slate-500 px-2">
        {current >= 0 ? current + 1 : 0} / {total}
      </span>
      <button
        onClick={() => onNavigate(Math.min(total - 1, current + 1))}
        disabled={current >= total - 1}
        className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
      >
        &gt;
      </button>
      <button
        onClick={() => onNavigate(total - 1)}
        disabled={current >= total - 1}
        className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
      >
        &gt;|
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/components/board-navigation.tsx
git commit -m "feat: add BoardNavigation component"
```

---

### Task 12: Rewrite the analysis page with full 3-column layout

**Files:**
- Modify: `web/app/analysis/[gameId]/page.tsx`

- [ ] **Step 1: Complete rewrite of the analysis page**

Replace the full content of `web/app/analysis/[gameId]/page.tsx`:

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard } from '@/components/chess-board'
import { GameSummary } from '@/components/game-summary'
import { EvalGraph } from '@/components/eval-graph'
import { MoveList } from '@/components/move-list'
import { MoveDetail } from '@/components/move-detail'
import { BoardNavigation } from '@/components/board-navigation'
import { uciToArrow } from '@/lib/analysis-utils'
import type { Classification } from '@/lib/lichess'

interface AnalysisMove {
  moveNumber: number
  color: 'white' | 'black'
  san: string
  movePlayed: string
  bestMove: string
  bestMoveSan: string
  evaluation: number
  prevEvaluation: number
  classification: Classification
  explanation: string
  isPlayerMove: boolean
  phase: 'opening' | 'middlegame' | 'endgame'
  accuracy: number
}

interface AnalysisData {
  game: {
    id: string
    pgn: string
    result: 'win' | 'loss' | 'draw'
    played_at: string
  }
  moves: AnalysisMove[]
  summary: {
    accuracy: number
    opening: { code: string; name: string } | null
    moveBreakdown: Record<Classification, number>
    phaseAccuracy: { opening: number; middlegame: number; endgame: number }
    playerColor: 'white' | 'black'
  }
}

export default function AnalysisPage({ params }: { params: Promise<{ gameId: string }> }) {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [selected, setSelected] = useState(-1)
  const [fen, setFen] = useState('start')
  const [gameId, setGameId] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    params.then(p => setGameId(p.gameId))
  }, [params])

  useEffect(() => {
    if (!gameId) return
    fetch(`/api/analysis/${gameId}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        // Pre-compute history for navigation
        const chess = new Chess()
        chess.loadPgn(d.game.pgn)
        setHistory(chess.history())
      })
  }, [gameId])

  const navigate = useCallback((index: number) => {
    if (!history.length) return
    const chess = new Chess()
    for (let i = 0; i <= index && i < history.length; i++) {
      chess.move(history[i])
    }
    setFen(index >= 0 ? chess.fen() : 'start')
    setSelected(index)
  }, [history])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigate(Math.max(-1, selected - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (data) navigate(Math.min(data.moves.length - 1, selected + 1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, data, navigate])

  if (!data) {
    return (
      <div className="analysis-dark min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-lg">Chargement de l&apos;analyse...</div>
      </div>
    )
  }

  const selectedMove = selected >= 0 ? data.moves[selected] : null

  // Build arrows for current move
  const arrows = []
  if (selectedMove) {
    if (selectedMove.bestMove) {
      arrows.push(uciToArrow(selectedMove.bestMove, '#22c55e'))
    }
    if (
      selectedMove.movePlayed &&
      selectedMove.movePlayed !== selectedMove.bestMove &&
      (selectedMove.classification === 'mistake' || selectedMove.classification === 'blunder' || selectedMove.classification === 'inaccuracy')
    ) {
      arrows.push(uciToArrow(selectedMove.movePlayed, '#ef4444'))
    }
  }

  // Eval graph data
  const evalData = data.moves.map((m, i) => ({
    moveIndex: i,
    moveNumber: m.moveNumber,
    eval: m.evaluation,
    classification: m.classification,
    san: m.san,
  }))

  return (
    <div className="analysis-dark min-h-screen">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <a href="/" className="text-slate-500 hover:text-slate-300 text-sm">&larr; Tableau de bord</a>
          <h1 className="text-lg font-semibold text-slate-200">Analyse de la partie</h1>
        </div>

        {/* Summary */}
        <GameSummary
          result={data.game.result}
          accuracy={data.summary.accuracy}
          opening={data.summary.opening}
          moveBreakdown={data.summary.moveBreakdown}
          phaseAccuracy={data.summary.phaseAccuracy}
        />

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1fr] gap-4">
          {/* Left: Board */}
          <div>
            <ChessBoard
              fen={fen}
              orientation={data.summary.playerColor}
              arrows={arrows}
            />
            <BoardNavigation
              current={selected}
              total={data.moves.length}
              onNavigate={navigate}
            />
          </div>

          {/* Center: Eval graph + Move list */}
          <div className="space-y-3">
            <EvalGraph data={evalData} selectedIndex={selected} onSelect={navigate} />
            <div className="panel">
              <div className="panel-inner p-0">
                <MoveList
                  moves={data.moves}
                  selectedIndex={selected}
                  onSelect={navigate}
                />
              </div>
            </div>
          </div>

          {/* Right: Move detail */}
          <div>
            {selectedMove ? (
              <MoveDetail
                moveNumber={selectedMove.moveNumber}
                color={selectedMove.color}
                san={selectedMove.san}
                bestMoveSan={selectedMove.bestMoveSan}
                classification={selectedMove.classification}
                evaluation={selectedMove.evaluation}
                prevEvaluation={selectedMove.prevEvaluation}
                explanation={selectedMove.explanation}
              />
            ) : (
              <div className="panel">
                <div className="panel-inner text-center text-slate-500 text-sm py-8">
                  Clique sur un coup pour voir les détails
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd /Users/alantouati/chess-improvement/web && npx next build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/alantouati/chess-improvement && git add web/app/analysis/\\[gameId\\]/page.tsx
git commit -m "feat: complete analysis page redesign with 3-column layout"
```

---

### Task 13: Run all tests and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

```bash
cd /Users/alantouati/chess-improvement/web && npx vitest run
```

Expected: All tests pass (openings, analysis-utils, explanations, sm2, lichess).

- [ ] **Step 2: Run the build**

```bash
cd /Users/alantouati/chess-improvement/web && npx next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Start dev server and verify visually**

```bash
cd /Users/alantouati/chess-improvement/web && npm run dev
```

Open `http://localhost:3000/analysis/<gameId>` in the browser. Verify:
- Dark theme is applied
- Summary header shows result, accuracy, opening, breakdown, phase accuracy
- Eval graph renders with interactive points
- Move list shows 2-column format with classification icons
- Clicking a move updates the board, graph cursor, and detail panel
- Arrows appear on the board (green for best move, red for mistakes)
- Navigation buttons and keyboard arrows work
- Responsive: resize window to verify 1/2/3 column layouts
