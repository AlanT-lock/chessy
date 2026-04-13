'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const TC_COLORS: Record<string, string> = {
  rapid: '#22c55e',
  blitz: '#3b82f6',
  bullet: '#f59e0b',
}

interface Props {
  data: Array<{ date: string } & Record<string, number>>
  timeControls: string[]
}

export function EloChart({ data, timeControls }: Props) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-center py-8">Aucune donnée</p>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
        />
        <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
        <Tooltip
          labelFormatter={d => new Date(d).toLocaleDateString('fr-FR')}
          formatter={(v: number, name: string) => [`${v}`, name.charAt(0).toUpperCase() + name.slice(1)]}
        />
        <Legend />
        {timeControls.map(tc => (
          <Line
            key={tc}
            type="monotone"
            dataKey={tc}
            name={tc.charAt(0).toUpperCase() + tc.slice(1)}
            stroke={TC_COLORS[tc] ?? '#6b7280'}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
