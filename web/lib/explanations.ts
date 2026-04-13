import type { Classification } from '@/lib/lichess'

interface ExplanationInput {
  classification: Classification
  moveSan: string
  bestMoveSan: string
  evalBefore: number
  evalAfter: number
}

export function generateExplanation(input: ExplanationInput): string {
  const { classification, moveSan, bestMoveSan, evalBefore, evalAfter } = input
  const loss = Math.abs(evalBefore - evalAfter) / 100
  const lossStr = loss.toFixed(1)
  const isSameMove = moveSan === bestMoveSan

  switch (classification) {
    case 'brilliant':
      return `Brillant ! ${moveSan} est un coup difficile à trouver mais c'est le meilleur dans cette position.`

    case 'excellent':
      if (isSameMove) {
        return `Excellent ! Tu as trouvé le meilleur coup ${moveSan}.`
      }
      return `Excellent coup ! ${moveSan} est très proche du meilleur coup ${bestMoveSan}.`

    case 'good':
      if (isSameMove) {
        return `Bon coup ! ${moveSan} est le meilleur coup dans cette position.`
      }
      return `Bon coup. ${moveSan} est un coup solide.`

    case 'inaccuracy':
      return `Imprécision. ${moveSan} perd ${lossStr} pions d'évaluation. Le meilleur coup était ${bestMoveSan}.`

    case 'mistake':
      return `Erreur. ${moveSan} perd ${lossStr} pions d'évaluation. Le meilleur coup était ${bestMoveSan}.`

    case 'blunder':
      return `Gaffe ! ${moveSan} perd ${lossStr} pions d'évaluation. Le meilleur coup était ${bestMoveSan}.`
  }
}
