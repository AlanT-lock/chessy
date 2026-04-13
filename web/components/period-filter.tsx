'use client'
import { useState } from 'react'

interface Props {
  onFilterChange: (filters: { from: string | null; to: string | null; timeControl: string | null }) => void
}

const PRESETS = [
  { label: "Aujourd'hui", days: 0 },
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
  { label: '3 mois', days: 90 },
  { label: '1 an', days: 365 },
  { label: 'Tout', days: null },
] as const

const TIME_CONTROLS = [
  { label: 'Tout', value: null },
  { label: 'Rapid', value: 'rapid' },
  { label: 'Blitz', value: 'blitz' },
  { label: 'Bullet', value: 'bullet' },
] as const

export function PeriodFilter({ onFilterChange }: Props) {
  const [activePreset, setActivePreset] = useState<number | null>(null)
  const [activeTC, setActiveTC] = useState<string | null>(null)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  function applyPreset(index: number) {
    const preset = PRESETS[index]
    setActivePreset(index)
    setShowCustom(false)
    setCustomFrom('')
    setCustomTo('')

    let from: string | null = null
    if (preset.days !== null) {
      const d = new Date()
      if (preset.days === 0) {
        d.setHours(0, 0, 0, 0)
      } else {
        d.setDate(d.getDate() - preset.days)
      }
      from = d.toISOString()
    }
    onFilterChange({ from, to: null, timeControl: activeTC })
  }

  function applyCustom() {
    setActivePreset(null)
    const from = customFrom ? new Date(customFrom).toISOString() : null
    const to = customTo ? new Date(customTo + 'T23:59:59').toISOString() : null
    onFilterChange({ from, to, timeControl: activeTC })
  }

  function applyTimeControl(tc: string | null) {
    setActiveTC(tc)
    if (activePreset !== null) {
      const preset = PRESETS[activePreset]
      let from: string | null = null
      if (preset.days !== null) {
        const d = new Date()
        if (preset.days === 0) {
          d.setHours(0, 0, 0, 0)
        } else {
          d.setDate(d.getDate() - preset.days)
        }
        from = d.toISOString()
      }
      onFilterChange({ from, to: null, timeControl: tc })
    } else if (showCustom) {
      const from = customFrom ? new Date(customFrom).toISOString() : null
      const to = customTo ? new Date(customTo + 'T23:59:59').toISOString() : null
      onFilterChange({ from, to, timeControl: tc })
    } else {
      onFilterChange({ from: null, to: null, timeControl: tc })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              activePreset === i
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => { setShowCustom(!showCustom); setActivePreset(null) }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            showCustom
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {TIME_CONTROLS.map(tc => (
          <button
            key={tc.label}
            onClick={() => applyTimeControl(tc.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTC === tc.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tc.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            onClick={applyCustom}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            Appliquer
          </button>
        </div>
      )}
    </div>
  )
}
