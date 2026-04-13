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
