'use client'

interface Props {
  label: string
  value: string
  subtitle?: string
  delta?: number | null
  color?: string
}

export function StatCard({ label, value, subtitle, delta, color = 'text-gray-900' }: Props) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {delta != null && delta !== 0 && (
        <p className={`text-sm font-medium mt-1 ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}
        </p>
      )}
    </div>
  )
}
