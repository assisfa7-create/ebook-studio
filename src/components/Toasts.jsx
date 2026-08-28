import React from 'react'
import { BookOpen, CheckCircle2, AlertCircle, Info, Settings, Plus, X } from 'lucide-react'

export default function Toasts({ toasts }) {
  const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-400" />,
    error: <AlertCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-amber-400" />
  }
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="anim-fade pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-lg">
          {icons[t.type] || icons.info}
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export function Overlay({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`anim-fade flex max-h-[90vh] w-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

export { BookOpen, Settings, Plus }
