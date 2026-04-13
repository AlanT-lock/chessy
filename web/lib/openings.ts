import ecoData from '../data/eco.json'
import { Chess } from 'chess.js'

interface Opening {
  code: string
  name: string
  moves: string
}

interface OpeningResult {
  code: string
  name: string
  length: number
}

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
  .sort((a, b) => b.sanMoves.length - a.sanMoves.length)

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
