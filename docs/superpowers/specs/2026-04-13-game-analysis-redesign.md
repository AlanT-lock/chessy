# Refonte de l'Analyse de Parties — Design Spec

## Objectif

Transformer la page d'analyse post-game basique (échiquier + liste de coups) en une expérience d'analyse complète et structurée : graphe d'évaluation interactif, résumé de partie intelligent, identification d'ouverture, analyse par phase, et explications détaillées pour chaque coup.

## Architecture

La page `/analysis/[gameId]` devient un écran riche en 3 zones avec un résumé en haut. L'analyse repose sur les données Lichess (déjà intégrées) enrichies côté client avec chess.js pour la navigation et une base ECO statique pour l'identification des ouvertures.

## Stack technique

- Next.js 16 (App Router, client component)
- react-chessboard v5 (échiquier interactif)
- recharts (graphe d'évaluation)
- chess.js (navigation de positions, parsing PGN)
- Base ECO JSON statique (~500 ouvertures)
- Supabase (stockage des analyses existant)

---

## 1. Résumé de partie (header)

Affiché en haut de page, toujours visible.

**Contenu :**
- Noms des joueurs (ou "Toi vs Bot niveau X")
- Résultat (Victoire / Défaite / Nulle) avec badge coloré
- Score de précision global (%) — calculé comme la moyenne des deltas d'évaluation normalisés
- Ouverture jouée : nom + code ECO (ex: "B90 — Sicilienne, Variante Najdorf")
- Répartition des coups sous forme de barres colorées horizontales :
  - Brillant (cyan) / Excellent (vert) / Bon (gris) / Imprécision (jaune) / Erreur (orange) / Gaffe (rouge)
  - Affichage : barre + nombre pour chaque catégorie
- Précision par phase : 3 badges "Ouverture X% | Milieu X% | Finale X%"

**Calcul des phases :**
- Ouverture : coups 1 à 15 (ou jusqu'à sortie de la base ECO)
- Milieu de jeu : coups 16 à N-10 (où N = nombre total de coups)
- Finale : les 10 derniers coups (ou quand il reste peu de matériel — moins de 13 points de matériel total hors rois)

**Calcul de précision :**
- Pour chaque coup du joueur : `moveAccuracy = max(0, 100 - abs(evalAfter - bestEval) * 0.5)`
- Précision globale = moyenne des moveAccuracy
- Précision par phase = moyenne des moveAccuracy de cette phase

---

## 2. Layout principal — 3 colonnes

### Colonne gauche : Échiquier (40% de la largeur)

- react-chessboard v5, taille responsive
- Orientation automatique (blanc en bas si le joueur joue blanc)
- Flèches sur l'échiquier :
  - Flèche **verte** : meilleur coup (bestMove)
  - Flèche **rouge** : coup joué si c'est une erreur/gaffe (movePlayed)
- Cases colorées : case de départ et d'arrivée du coup sélectionné
- Boutons de navigation sous l'échiquier : |< < > >| (premier, précédent, suivant, dernier)
- Raccourcis clavier : flèches gauche/droite pour naviguer

### Colonne centrale : Graphe d'évaluation + Liste de coups (35%)

**Graphe d'évaluation (haut de la colonne, ~150px de haut) :**
- Courbe recharts de type AreaChart
- Axe X : numéro de coup
- Axe Y : évaluation en pions (clamped entre -5 et +5 pour lisibilité)
- Zone au-dessus de 0 : teintée blanc/claire
- Zone en-dessous de 0 : teintée noire/sombre
- Points rouges sur la courbe pour les erreurs et gaffes
- Cliquable : cliquer sur un point navigue vers ce coup
- Ligne verticale qui suit le coup actuellement sélectionné

**Liste de coups (sous le graphe, scrollable) :**
- Format 2 colonnes : coup blanc | coup noir (comme sur chess.com/lichess)
- Chaque coup affiche :
  - Numéro du coup
  - Notation SAN (ex: "Nf3", "Bxe5+")
  - Icône de classification à côté (petit cercle coloré)
- Coup sélectionné : fond surligné
- Cliquer sur un coup : met à jour l'échiquier, le graphe, et le panel de détails
- Auto-scroll vers le coup sélectionné

### Colonne droite : Panel de détails (25%)

Affiché pour le coup actuellement sélectionné.

**Contenu du panel :**

1. **Badge de classification** — Grand badge en haut :
   - Brillant : fond cyan, icône étoile double
   - Excellent : fond vert, icône étoile
   - Bon : fond gris, icône check
   - Imprécision : fond jaune, icône "?!"
   - Erreur : fond orange, icône "?"
   - Gaffe : fond rouge, icône "??"

2. **Coup joué** — En gros : "Tu as joué **Bxe5**"

3. **Meilleur coup** — "Le meilleur coup était **Nf3**" (si différent du coup joué)

4. **Évaluation** — "Éval : +1.2 → -0.5 (perte de 1.7 pions)"

5. **Explication** — Texte généré décrivant pourquoi le coup est bon/mauvais :
   - Pour les erreurs/gaffes : "Ce coup perd du matériel car..." ou "Ce coup affaiblit la structure de pions..."
   - Généré à partir du delta d'éval et du contexte (capture, échec, etc.)
   - Format simple et pédagogique adapté aux débutants

6. **Ligne alternative** — Si erreur : montrer les 2-3 premiers coups de la variante principale

---

## 3. Identification d'ouverture — Base ECO

**Fichier : `web/lib/openings.ts`**

- Fichier JSON statique intégré : `web/data/eco.json`
- ~500 ouvertures les plus courantes
- Format : `{ code: "B90", name: "Sicilian, Najdorf", moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6" }`
- Fonction `identifyOpening(pgn: string): { code: string, name: string, length: number } | null`
  - Parcourt les coups de la partie
  - Match le plus long préfixe correspondant à une ouverture connue
  - Retourne le code ECO, le nom, et le nombre de coups dans l'ouverture

---

## 4. Génération d'explications

**Fichier : `web/lib/explanations.ts`**

Génère des explications textuelles pour chaque coup analysé, sans IA externe — purement basé sur les données de l'analyse.

**Logique :**

- **Gaffe/Erreur avec capture** : "Ce coup capture [pièce] mais permet à l'adversaire de [contre-attaque]. Le meilleur coup était [bestMove] qui maintient l'avantage."
- **Gaffe/Erreur sans capture** : "Ce coup perd [X] centipawns d'évaluation. Le meilleur coup était [bestMove] (éval: [eval])."
- **Gaffe avec mat raté** : "Il y avait un mat en [X] coups avec [bestMove]."
- **Bon/Excellent** : "Bon coup ! Tu as trouvé [le meilleur coup / un coup très proche du meilleur]."
- **Brillant** : "Coup brillant ! Ce coup n'est pas évident mais c'est le meilleur dans cette position."

Les explications utilisent :
- Le delta d'évaluation (avant/après)
- Le type de coup (capture, échec, roque, promotion)
- La comparaison coup joué vs meilleur coup
- chess.js pour déterminer si un coup est un échec, une capture, etc.

---

## 5. Composants React

### Nouveaux composants à créer :

1. **`GameSummary`** — Résumé en haut de page (précision, ouverture, répartition)
2. **`EvalGraph`** — Graphe d'évaluation recharts cliquable
3. **`MoveList`** — Refonte du composant existant (format 2 colonnes, icônes)
4. **`MoveDetail`** — Panel de détail du coup sélectionné
5. **`BoardNavigation`** — Boutons de navigation |< < > >|

### Composants existants à modifier :

- **`ChessBoard`** — Ajouter support pour flèches (arrows prop de react-chessboard)
- **`analysis/[gameId]/page.tsx`** — Refonte complète du layout

---

## 6. Modifications API

### `GET /api/analysis/[gameId]` — enrichir la réponse

La réponse actuelle retourne le game + move_analysis. Enrichir avec :

```typescript
interface AnalysisResponse {
  game: {
    id: string
    pgn: string
    result: 'win' | 'loss' | 'draw'
    played_at: string
  }
  moves: Array<{
    moveNumber: number
    color: 'white' | 'black'
    san: string           // notation SAN (nouveau — convertir depuis UCI)
    movePlayed: string    // UCI
    bestMove: string      // UCI
    bestMoveSan: string   // SAN du meilleur coup (nouveau)
    evaluation: number    // centipawns après le coup
    prevEvaluation: number // centipawns avant le coup (nouveau)
    classification: Classification
    explanation: string   // texte explicatif (nouveau)
    isPlayerMove: boolean // true si c'est un coup du joueur (nouveau)
  }>
  summary: {
    accuracy: number
    opening: { code: string, name: string } | null
    moveBreakdown: Record<Classification, number>
    phaseAccuracy: {
      opening: number
      middlegame: number
      endgame: number
    }
    playerColor: 'white' | 'black'
  }
}
```

L'enrichissement (SAN, explications, ouverture, résumé) est calculé côté serveur dans la route API au moment de la requête, pas stocké en base — ce sont des données dérivées.

---

## 7. Design visuel

**Palette de couleurs (dark theme) :**
- Background principal : `#0f172a` (slate-900)
- Panels : `#1e293b` (slate-800)
- Bordures : `#334155` (slate-700)
- Texte principal : `#f1f5f9` (slate-100)
- Texte secondaire : `#94a3b8` (slate-400)

**Couleurs de classification :**
- Brillant : `#06b6d4` (cyan-500)
- Excellent : `#22c55e` (green-500)
- Bon : `#94a3b8` (slate-400)
- Imprécision : `#eab308` (yellow-500)
- Erreur : `#f97316` (orange-500)
- Gaffe : `#ef4444` (red-500)

**Responsive :**
- Desktop (>1024px) : 3 colonnes
- Tablette (768-1024px) : 2 colonnes (échiquier + coups, détails en dessous)
- Mobile (<768px) : 1 colonne empilée (échiquier, graphe, coups, détails)

---

## 8. Données de test

Pour le développement, créer un fichier `web/data/sample-game.json` avec un PGN de partie exemple et son analyse complète, pour pouvoir tester sans appeler Lichess.

---

## Hors scope (Spec 2 — Module d'entraînement)

- Dashboard d'entraînement
- Modes d'entraînement (tactique, erreurs, ouvertures, finales, vision)
- Système de progression/XP
- Détection automatique des faiblesses
- Ces fonctionnalités seront conçues dans une spec séparée après l'implémentation de cette spec.
