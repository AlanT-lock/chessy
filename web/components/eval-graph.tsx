'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Classification } from '@/lib/lichess'

interface EvalPoint {
  moveIndex: number
  moveNumber: number
  eval: number
  classification: Classification
  san: string
}

interface Props {
  data: EvalPoint[]
  selectedIndex: number
  onSelect: (index: number) => void
}

const CLAMP = 5

function clampEval(cp: number): number {
  const pawns = cp / 100
  return Math.max(-CLAMP, Math.min(CLAMP, pawns))
}

export function EvalGraph({ data, selectedIndex, onSelect }: Props) {
  const chartData = data.map(d => ({
    ...d,
    evalClamped: clampEval(d.eval),
    isError: d.classification === 'blunder' || d.classification === 'mistake',
  }))

  return (
    <div className="panel" style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          onClick={(e: any) => {
            if (e?.activeTooltipIndex != null) {
              onSelect(e.activeTooltipIndex)
            }
          }}
          style={{ cursor: 'pointer' }}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#22c55e" stopOpacity={0} />
              <stop offset="50%" stopColor="#ef4444" stopOpacity={0} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="moveNumber"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            domain={[-CLAMP, CLAMP]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            tickFormatter={(v: number) => v > 0 ? `+${v}` : `${v}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200">
                  <div>{d.moveNumber}. {d.san}</div>
                  <div className="text-slate-400">{clampEval(d.eval) > 0 ? '+' : ''}{clampEval(d.eval).toFixed(1)}</div>
                </div>
              )
            }}
          />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
          {selectedIndex >= 0 && selectedIndex < chartData.length && (
            <ReferenceLine x={chartData[selectedIndex]?.moveNumber} stroke="#3b82f6" strokeWidth={2} />
          )}
          <Area
            type="monotone"
            dataKey="evalClamped"
            stroke="#94a3b8"
            strokeWidth={2}
            fill="url(#evalGradient)"
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (!payload.isError) return <circle key={props.index} cx={cx} cy={cy} r={0} />
              return (
                <circle
                  key={props.index}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={payload.classification === 'blunder' ? '#ef4444' : '#f97316'}
                  stroke="none"
                />
              )
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
