console.log('[Chess Improvement SW] Service worker started')

let offscreenCreated = false

async function ensureOffscreen() {
  if (offscreenCreated) return
  try {
    await (chrome as any).offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS'],
      justification: 'Run Stockfish WASM engine for chess analysis',
    })
    offscreenCreated = true
    console.log('[Chess Improvement SW] Offscreen document created')
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      offscreenCreated = true
    } else {
      console.error('[Chess Improvement SW] Failed to create offscreen:', e)
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'ANALYZE') return

  console.log('[Chess Improvement SW] Relaying ANALYZE to offscreen')
  ensureOffscreen().then(() => {
    // Forward to offscreen document
    chrome.runtime.sendMessage(msg, (response) => {
      console.log('[Chess Improvement SW] Got response from offscreen:', response?.bestMoves?.length, 'moves')
      sendResponse(response)
    })
  })

  return true
})
