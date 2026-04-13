# Dashboard & Chess.com Sync — Design Spec

## Goal

Synchroniser automatiquement les parties chess.com de l'utilisateur à chaque visite, et afficher un dashboard statistique complet avec filtres temporels et par cadence.

## Scope

- Sync automatique des parties rapid/blitz/bullet depuis l'API chess.com
- Dashboard avec stats globales, graphiques d'évolution, ouvertures, et liste des parties
- Filtres par période (prédéfinis + custom) et par cadence

---

## 1. Sync chess.com

### Flow

1. L'utilisateur arrive sur `/` (dashboard)
2. Le client appelle `GET /api/sync`
3. L'API récupère le `chess_com_username` de l'utilisateur authentifié
4. Elle appelle l'API chess.com :
   - `GET https://api.chess.com/pub/player/{username}/games/archives` → liste des URLs de mois (ex: `https://api.chess.com/pub/player/{username}/games/2026/04`)
   - Compare avec `last_sync_month` stocké sur la table `users`
   - Fetch uniquement les mois manquants + le mois en cours (qui peut avoir de nouvelles parties)
5. Pour chaque partie retournée par chess.com :
   - Filtre : uniquement `time_class` in (`rapid`, `blitz`, `bullet`)
   - Extrait : PGN, résultat (win/loss/draw), elo des deux joueurs, cadence, date, ouverture
   - Détermine quel joueur est l'utilisateur via `chess_com_username`
6. Upsert en BDD avec `chess_com_id` (URL unique de la partie) pour dédoublication
7. Met à jour `last_sync_month` sur la table `users`

### Parsing d'une partie chess.com

L'API chess.com retourne pour chaque partie :
```json
{
  "url": "https://www.chess.com/game/live/123456",
  "pgn": "...",
  "time_control": "600",
  "time_class": "rapid",
  "rated": true,
  "white": { "username": "player1", "rating": 1200, "result": "win" },
  "black": { "username": "player2", "rating": 1150, "result": "checkmated" }
}
```

Pour déterminer le résultat de l'utilisateur :
- Identifier le côté (white/black) via `chess_com_username` (case-insensitive)
- `result` chess.com : `win` = victoire. Tout le reste : checker le result de l'adversaire. Si adversaire `win` → défaite. Sinon → nulle.
- Les résultats possibles côté chess.com : `win`, `checkmated`, `timeout`, `resigned`, `stalemate`, `insufficient`, `50move`, `repetition`, `agreed`, `timevsinsufficient`, `abandoned`

Pour l'ouverture :
- Extraire depuis le header PGN `[ECOUrl "..."]` ou `[Opening "..."]` fourni par chess.com
- Fallback : utiliser notre `identifyOpening()` existant

---

## 2. Modifications BDD

### Table `users` — ajouter colonne

| Colonne | Type | Description |
|---------|------|-------------|
| `last_sync_month` | text, nullable | Dernier mois synchronisé, format "YYYY/MM" |

### Table `games` — nouvelles colonnes

| Colonne | Type | Description |
|---------|------|-------------|
| `chess_com_id` | text, unique, nullable | URL de la partie pour dédoublication |
| `user_elo` | int, nullable | Elo de l'utilisateur au moment de la partie |
| `opponent_elo` | int, nullable | Elo de l'adversaire |
| `opponent_username` | text, nullable | Nom d'utilisateur de l'adversaire |
| `time_control` | text, nullable | 'rapid', 'blitz', 'bullet' |
| `opening_name` | text, nullable | Nom de l'ouverture |
| `opening_eco` | text, nullable | Code ECO |

La colonne `accuracy_score` existante reste nullable — elle n'est remplie que lors d'une analyse détaillée (clic sur la partie).

---

## 3. API Routes

### `GET /api/sync`

- Auth requise
- Récupère `chess_com_username` et `last_sync_month` du user
- Appelle l'API chess.com pour les mois manquants + mois courant
- Filtre rapid/blitz/bullet
- Upsert les parties en BDD
- Met à jour `last_sync_month`
- Retourne `{ synced: number, total: number }`

### `GET /api/stats?from=&to=&timeControl=`

- Auth requise
- Query params :
  - `from` (ISO date, optionnel) — début de période
  - `to` (ISO date, optionnel) — fin de période
  - `timeControl` (string, optionnel) — 'rapid', 'blitz', 'bullet', ou absent = tout
- Retourne :
```json
{
  "gamesPlayed": 150,
  "wins": 80,
  "draws": 15,
  "losses": 55,
  "winRate": 53.3,
  "currentElo": { "rapid": 1250, "blitz": 1100, "bullet": 950 },
  "eloDelta": { "rapid": +50, "blitz": -20, "bullet": +10 },
  "avgAccuracy": 72.5,
  "eloHistory": [
    { "date": "2026-04-01", "rapid": 1200, "blitz": 1120, "bullet": 940 },
    ...
  ],
  "topOpenings": [
    { "name": "Italian Game", "eco": "C50", "games": 25, "winRate": 60.0 },
    ...
  ]
}
```

### `GET /api/games` (modifié)

- Ajouter query params : `from`, `to`, `timeControl`, `page`, `limit`
- Retourne liste paginée avec métadonnées de chaque partie
- Tri par `played_at` DESC

---

## 4. Dashboard UI

### Barre de filtres (en haut)

- **Période prédéfinie** : boutons toggle — Aujourd'hui / 7j / 30j / 3 mois / 1 an / Tout
- **Date custom** : deux inputs date (début, fin) — apparaissent quand aucun prédéfini sélectionné ou via un bouton "Custom"
- **Cadence** : boutons toggle — Tout / Rapid / Blitz / Bullet

Tous les filtres sont des query params URL pour permettre le partage/bookmark.

### Cartes de stats (première ligne, 4 colonnes)

1. **Elo actuel** — elo le plus récent de la cadence sélectionnée (ou le plus élevé si "Tout"), avec delta (↑↓) par rapport au premier elo de la période
2. **Parties jouées** — nombre total dans la période
3. **Win rate** — pourcentage, avec sous-texte "V/N/D" (ex: "80V / 15N / 55D")
4. **Précision moyenne** — moyenne des `accuracy_score` non-null dans la période (affiche "—" si aucune partie analysée)

### Graphiques (deuxième ligne, 2 colonnes)

1. **Courbe d'Elo** (recharts LineChart) — une ligne par cadence active, axe X = dates, axe Y = elo. Si filtre cadence = "Tout", affiche les 3 lignes. Sinon, une seule.
2. **Répartition V/N/D** (recharts PieChart) — donut avec 3 segments : vert (victoires), gris (nulles), rouge (défaites), pourcentages au centre

### Ouvertures (troisième ligne)

- **Tableau top 10 ouvertures** — colonnes : Ouverture, ECO, Parties, Win rate (%), Elo moyen adverse
- Trié par nombre de parties DESC

### Liste des parties (quatrième ligne)

- **Tableau scrollable** — colonnes : Date, Adversaire (+ elo), Cadence, Résultat, Lien analyse
- Pagination (20 parties par page)
- Clic sur une ligne → `/analysis/[gameId]`

---

## 5. Composants

| Composant | Fichier | Description |
|-----------|---------|-------------|
| PeriodFilter | `components/period-filter.tsx` | Barre de filtres période + cadence, client component |
| StatCard | `components/stat-card.tsx` | Carte stat réutilisable (valeur, label, delta, couleur) |
| EloChart | `components/elo-chart.tsx` | Courbe d'elo recharts LineChart |
| WinRateChart | `components/win-rate-chart.tsx` | Donut V/N/D recharts PieChart |
| OpeningsTable | `components/openings-table.tsx` | Tableau des ouvertures |
| GamesTable | `components/games-table.tsx` | Liste paginée des parties |

---

## 6. Flow de données complet

```
Utilisateur arrive sur /
  → page.tsx (server) vérifie auth + chess_com_username
  → Rend <Dashboard /> (client component)
  → Dashboard monte :
      1. Appelle GET /api/sync → affiche loader "Synchronisation..."
      2. Sync terminée → appelle GET /api/stats?from=...&to=...
      3. Appelle GET /api/games?from=...&to=...&page=1
      4. Affiche les données
  → Utilisateur change un filtre :
      → Re-fetch /api/stats et /api/games avec nouveaux params
      → Pas de re-sync (sync = une seule fois par visite)
```

---

## 7. Contraintes et décisions

- **Pas de nouvelle dépendance** : recharts déjà installé, date picker HTML natif
- **Sync une seule fois par visite** : pas à chaque changement de filtre
- **L'analyse détaillée reste à la demande** : la sync ne stocke que les métadonnées légères
- **Cadences supportées** : rapid, blitz, bullet uniquement (pas daily)
- **Dédoublication** via `chess_com_id` (URL unique chess.com) — les parties déjà en BDD ne sont pas re-insérées
- **Les parties venant de l'extension Chrome** n'ont pas de `chess_com_id` — elles coexistent sans conflit
