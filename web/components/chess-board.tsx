'use client'
import { Chessboard } from 'react-chessboard'

interface Props {
  fen: string
  onSquareClick?: (square: string) => void
  highlightSquares?: Record<string, React.CSSProperties>
}

export function ChessBoard({ fen, onSquareClick, highlightSquares }: Props) {
  return (
    <Chessboard
      options={{
        position: fen,
        onSquareClick: onSquareClick
          ? ({ square }: { piece: string | null; square: string }) => onSquareClick(square)
          : undefined,
        squareStyles: highlightSquares,
        allowDrawingArrows: false,
        boardStyle: { width: '400px', maxWidth: '100%' },
      }}
    />
  )
}
