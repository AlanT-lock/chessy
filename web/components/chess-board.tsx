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
