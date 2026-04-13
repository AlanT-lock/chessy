'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  wins: number
  draws: number
  losses: number
}

const COLORS = { wins: '#22c55e', draws: '#9ca3af', losses: '#ef4444' }
const LABELS = { wins: 'Victoires', draws: 'Nulles', losses: 'Défaites' }

export function WinRateChart({ wins, draws, losses }: Props) {
  const total = wins + draws + losses
  if (total === 0) {
    return <p className="text-gray-400 text-center py-8">Aucune donnée</p>
  }

  const data = [
    { name: 'wins', value: wins },
    { name: 'draws', value: draws },
    { name: 'losses', value: losses },
  ].filter(d => d.value > 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            stroke="none"
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} (${Math.round((value / total) * 100)}%)`,
              LABELS[name as keyof typeof LABELS],
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold">{Math.round((wins / total) * 100)}%</p>
          <p className="text-xs text-gray-400">win rate</p>
        </div>
      </div>
    </div>
  )
}
