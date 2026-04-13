import type { AnalysisResponse } from '../types'

const LABEL: Record<string, string> = { brilliant: '★ Brillant', excellent: '✓ Excellent', good: '· Bon' }

export function createOverlay(): HTMLElement {
  const el = document.createElement('div')
  el.id = 'ci-overlay'
  el.style.cssText = `position:fixed;bottom:20px;right:20px;background:rgba(15,15,15,0.92);color:#fff;
    border-radius:12px;padding:12px 16px;font:14px system-ui;z-index:9999;min-width:180px;
    box-shadow:0 4px 24px rgba(0,0,0,.4);backdrop-filter:blur(8px);`
  el.innerHTML = `<div style="color:#666;font-size:11px;margin-bottom:6px">Chess Improvement</div><div id="ci-body">En attente...</div>`
  document.body.appendChild(el)
  return el
}

export function updateOverlay(el: HTMLElement, r: AnalysisResponse) {
  const body = el.querySelector('#ci-body')
  if (!body) return
  const evalStr = r.evaluation > 0 ? `+${(r.evaluation / 100).toFixed(2)}` : `${(r.evaluation / 100).toFixed(2)}`
  body.innerHTML = `<div style="color:#888;font-size:11px;margin-bottom:4px">Éval : ${evalStr}</div>` +
    r.bestMoves.map((m, i) =>
      `<div style="display:flex;justify-content:space-between;margin-top:4px;${i === 0 ? 'font-size:16px;font-weight:bold' : 'opacity:.55;font-size:13px'}">
        <span style="font-family:monospace">${m.move}</span>
        <span style="font-size:11px;color:${i === 0 ? '#22c55e' : '#888'}">${LABEL[m.classification] ?? m.classification}</span>
      </div>`
    ).join('')
}
