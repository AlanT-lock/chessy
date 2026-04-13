'use client'

interface Props {
  current: number
  total: number
  onNavigate: (index: number) => void
}

export function BoardNavigation({ current, total, onNavigate }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      <button
        onClick={() => onNavigate(-1)}
        disabled={current <= -1}
        className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
      >
        |&lt;
      </button>
      <button
        onClick={() => onNavigate(Math.max(-1, current - 1))}
        disabled={current <= -1}
        className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
      >
        &lt;
      </button>
      <span className="text-xs text-slate-500 px-2">
        {current >= 0 ? current + 1 : 0} / {total}
      </span>
      <button
        onClick={() => onNavigate(Math.min(total - 1, current + 1))}
        disabled={current >= total - 1}
        className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
      >
        &gt;
      </button>
      <button
        onClick={() => onNavigate(total - 1)}
        disabled={current >= total - 1}
        className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
      >
        &gt;|
      </button>
    </div>
  )
}
