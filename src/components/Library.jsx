import React from 'react'
import { BookOpen, Plus, Trash2, FileText } from 'lucide-react'

export default function Library({ projects, onSelect, onNew }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-10 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Biblioteca</h1>
            <p className="mt-1 text-sm text-zinc-500">Crie e-books completos do zero com o Claude.</p>
          </div>
          <button onClick={onNew} className="btn-primary">
            <Plus size={16} />
            Novo e-book
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="card flex flex-col items-center px-10 py-20 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-amber-400">
              <BookOpen size={26} />
            </div>
            <h2 className="text-lg font-semibold text-zinc-100">Nenhum e-book ainda</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
              Comece informando o tema do seu livro. A IA cria a estrutura, escreve os capitulos
              e desenha a capa para voce.
            </p>
            <button onClick={onNew} className="btn-primary mt-6">
              <Plus size={16} />
              Criar meu primeiro e-book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectCard({ project: p, onSelect }) {
  const date = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
  return (
    <div
      onClick={() => onSelect(p.id)}
      className="group card cursor-pointer overflow-hidden transition hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      tabIndex={0}
      role="button"
      onKeyDown={e => e.key === 'Enter' && onSelect(p.id)}
    >
      <div className="book-svg aspect-[5/8] w-full overflow-hidden rounded-t-xl border-b border-zinc-800 bg-zinc-800">
        {p.cover ? (
          <div dangerouslySetInnerHTML={{ __html: p.cover }} />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-700">
            <BookOpen size={36} />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="truncate font-semibold text-zinc-100">{p.title || 'Sem titulo'}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
          <FileText size={12} />
          {p.chapterCount} capitulos · {date}
        </div>
      </div>
    </div>
  )
}
