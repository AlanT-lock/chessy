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

    const evalDelta = color === 'white'
      ? prevEval - currEval
      : currEval - prevEval
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
