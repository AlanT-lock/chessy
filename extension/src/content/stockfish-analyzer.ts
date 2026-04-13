import type { AnalysisResponse } from '../types'

export async function analyzePosition(fen: string, depth: number): Promise<AnalysisResponse> {
  console.log('[Chess Improvement] Requesting analysis via service worker...')
  const response: AnalysisResponse = await chrome.runtime.sendMessage({
    type: 'ANALYZE',
    fen,
    depth,
  })
  return response
}
