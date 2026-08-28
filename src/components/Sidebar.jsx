import React from 'react'
import { BookOpen, Settings, Plus, BookMarked, CircleAlert } from 'lucide-react'

export default function Sidebar({ projects, project, settings, onSelect, onNew, onSettings, onGoHome }) {
  const iaReady = settings && (settings.provider === 'ollama' ? settings.ollamaModel : settings.apiKey)
  const warningText =
    settings?.provider === 'ollama'
      ? { strong: 'Ollama nao configurado', detail: 'Instale um modelo ou troque de provedor.' }
      : { strong: 'API key nao configurada', detail: 'Clique para configurar o Claude.' }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40">
      <button onClick={onGoHome} className="flex items-center gap-2.5 px-5 pt-5 pb-4 text-left">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-zinc-950">
          <BookOpen size={18} strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-zinc-50">Ebook Studio</div>
          <div className="text-[11px] text-zinc-500">crie com IA</div>
        </div>
      </button>

      <div className="px-4 pb-3">
        <button onClick={onNew} className="btn-primary w-full">
          <Plus size={16} />
          Novo e-book
        </button>
      </div>

      <div className="mb-2 px-5 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">
        Biblioteca
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {projects.length === 0 && (
          <p className="px-2 py-3 text-xs leading-relaxed text-zinc-600">
            Seus e-books aparecerao aqui.
          </p>
        )}
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
              project?.id === p.id ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
            }`}
          >
            <BookMarked size={14} className="shrink-0 text-zinc-500" />
            <span className="truncate">{p.title || 'Sem titulo'}</span>
          </button>
        ))}
      </nav>

      {!iaReady && (
        <button
          onClick={onSettings}
          className="mx-3 mb-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-left text-xs text-amber-200 hover:bg-amber-500/15"
        >
          <CircleAlert size={15} className="mt-0.5 shrink-0 text-amber-400" />
          <span>
            <strong className="font-semibold">{warningText.strong}</strong>
            <br />
            {warningText.detail}
          </span>
        </button>
      )}

      <div className="border-t border-zinc-800 p-3">
        <button onClick={onSettings} className="btn-ghost w-full justify-start">
          <Settings size={15} />
          Configuracoes
        </button>
      </div>
    </aside>
  )
}
