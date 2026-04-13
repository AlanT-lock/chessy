console.log('[Chess Improvement SW] Service worker started')

let offscreenReady = false

async function ensureOffscreen() {
  if (offscreenReady) return
  try {
    await (chrome as any).offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS'],
      justification: 'Run Stockfish WASM engine for chess analysis',
    })
    console.log('[Chess Improvement SW] Offscreen document created')
  } catch (e: any) {
    if (!e.message?.includes('already exists')) {
      console.error('[Chess Improvement SW] Failed to create offscreen:', e)
      return
    }
  }
  offscreenReady = true
}

// Create offscreen on install
chrome.runtime.onInstalled.addListener(() => ensureOffscreen())

// Also create on startup
ensureOffscreen()

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'ANALYZE') return false
  if (msg._fromSW) return false // don't catch our own forwarded message

  console.log('[Chess Improvement SW] Got ANALYZE, forwarding to offscreen')

  ensureOffscreen().then(() => {
    chrome.runtime.sendMessage({ ...msg, _fromSW: true }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Chess Improvement SW] Offscreen error:', chrome.runtime.lastError.message)
        sendResponse({ type: 'ANALYSIS_RESULT', bestMoves: [], evaluation: 0 })
        return
      }
      console.log('[Chess Improvement SW] Got response:', response?.bestMoves?.length, 'moves')
      sendResponse(response)
    })
  })

  return true
})
