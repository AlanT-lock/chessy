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
