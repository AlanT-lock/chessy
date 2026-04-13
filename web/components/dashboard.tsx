'use client'
import { useState, useEffect, useCallback } from 'react'
import { PeriodFilter } from './period-filter'
import { StatCard } from './stat-card'
import { EloChart } from './elo-chart'
import { WinRateChart } from './win-rate-chart'
import { OpeningsTable } from './openings-table'
import { GamesTable } from './games-table'

interface Stats {
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  winRate: number
  currentElo: Record<string, number>
  eloDelta: Record<string, number>
  avgAccuracy: number | null
  eloHistory: Array<{ date: string } & Record<string, number>>
  topOpenings: Array<{ name: string; eco: string | null; games: number; winRate: number }>
}

interface GamesResponse {
  games: Array<{
    id: string
    played_at: string
    opponent_username: string | null
    opponent_elo: number | null
    user_elo: number | null
    time_control: string | null
    result: string
    accuracy_score: number | null
  }>
  total: number
  page: number
  totalPages: number
}

interface Filters {
  from: string | null
  to: string | null
  timeControl: string | null
}

export function Dashboard() {
  const [syncing, setSyncing] = useState(true)
  const [syncResult, setSyncResult] = useState<{ synced: number; total: number } | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [gamesData, setGamesData] = useState<GamesResponse | null>(null)
  const [filters, setFilters] = useState<Filters>({ from: null, to: null, timeControl: null })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function sync() {
      try {
        const res = await fetch('/api/sync')
        const data = await res.json()
        setSyncResult(data)
      } catch (e) {
        console.error('Sync failed:', e)
      } finally {
        setSyncing(false)
      }
    }
    sync()
  }, [])

  const fetchStats = useCallback(async (f: Filters) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    if (f.timeControl) params.set('timeControl', f.timeControl)

    try {
      const res = await fetch(`/api/stats?${params}`)
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('Stats fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGames = useCallback(async (f: Filters, p: number) => {
    const params = new URLSearchParams()
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    if (f.timeControl) params.set('timeControl', f.timeControl)
    params.set('page', String(p))

    try {
      const res = await fetch(`/api/games?${params}`)
      const data = await res.json()
      setGamesData(data)
    } catch (e) {
      console.error('Games fetch failed:', e)
    }
  }, [])

  useEffect(() => {
    if (!syncing) {
      fetchStats(filters)
      fetchGames(filters, 1)
    }
  }, [syncing]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterChange(newFilters: Filters) {
    setFilters(newFilters)
    setPage(1)
    fetchStats(newFilters)
    fetchGames(newFilters, 1)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    fetchGames(filters, newPage)
  }

  if (syncing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">Synchronisation des parties chess.com...</p>
      </div>
    )
  }

  const eloDisplay = stats?.currentElo ?? {}
  const eloDelta = stats?.eloDelta ?? {}
  const primaryTC = filters.timeControl ?? Object.keys(eloDisplay).sort()[0]
  const displayElo = primaryTC ? eloDisplay[primaryTC] : null
  const displayDelta = primaryTC ? eloDelta[primaryTC] : null
  const activeTimeControls = filters.timeControl
    ? [filters.timeControl]
    : Object.keys(eloDisplay).filter(tc => ['rapid', 'blitz', 'bullet'].includes(tc))

  return (
    <div className="space-y-6">
      {syncResult && syncResult.synced > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
          {syncResult.synced} nouvelles parties synchronisées ({syncResult.total} au total)
        </div>
      )}

      <PeriodFilter onFilterChange={handleFilterChange} />

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label={primaryTC ? `Elo ${primaryTC.charAt(0).toUpperCase() + primaryTC.slice(1)}` : 'Elo'}
              value={displayElo != null ? String(displayElo) : '—'}
              delta={displayDelta}
              color="text-gray-900"
            />
            <StatCard
              label="Parties jouées"
              value={String(stats.gamesPlayed)}
            />
            <StatCard
              label="Win rate"
              value={`${stats.winRate}%`}
              subtitle={`${stats.wins}V / ${stats.draws}N / ${stats.losses}D`}
              color="text-green-600"
            />
            <StatCard
              label="Précision moyenne"
              value={stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : '—'}
              subtitle={stats.avgAccuracy == null ? 'Aucune partie analysée' : undefined}
              color="text-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Évolution Elo</h3>
              <EloChart data={stats.eloHistory} timeControls={activeTimeControls} />
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Répartition V/N/D</h3>
              <WinRateChart wins={stats.wins} draws={stats.draws} losses={stats.losses} />
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Ouvertures les plus jouées</h3>
            <OpeningsTable openings={stats.topOpenings} />
          </div>
        </>
      ) : null}

      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Parties</h3>
        {gamesData ? (
          <GamesTable
            games={gamesData.games}
            page={gamesData.page}
            totalPages={gamesData.totalPages}
            onPageChange={handlePageChange}
          />
        ) : null}
      </div>
    </div>
  )
}
