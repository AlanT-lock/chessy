export const isComputerGame = () => /\/(play\/computer|play\/coach|practice)(\/|$)/.test(location.pathname)

export function getGameResult(): 'win' | 'loss' | 'draw' | null {
  const el = document.querySelector('[class*="game-result"], .game-over-modal-content')
  if (!el) return null
  const t = el.textContent?.toLowerCase() ?? ''
  if (t.includes('you win') || t.includes('victoire')) return 'win'
  if (t.includes('you lost') || t.includes('défaite')) return 'loss'
  if (t.includes('draw') || t.includes('nulle')) return 'draw'
  return null
}
