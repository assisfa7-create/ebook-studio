import React, { useState } from 'react'
import { Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'

const STYLES = [
  'Minimalista',
  'Tipografico',
  'Geometrico abstrato',
  'Gradiente moderno',
  'Vintage editorial',
  'Natureza',
  'Futurista tech',
  'Art Deco',
  'Aquarela',
  'Dark premium',
  'Bold maximalista',
  'Fotografico monocromatico'
]

export default function CoverStudio({ project, updateProject, toast }) {
  const [style, setStyle] = useState('Minimalista')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function generate() {
    if (!project.title || !project.topic) {
      toast('Preencha titulo e tema do livro antes de gerar a capa.', 'error')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await window.api.cover({ project, style, hint })
      if (!res.ok) throw new Error(res.error)
      updateProject(p => ({ ...p, cover: { svg: res.data.svg, palette: res.data.palette || [] } }))
      toast('Capa gerada com sucesso.', 'success')
    } catch (err) {
      setError(err.message)
      toast('Falha ao gerar capa: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-8 py-8 sm:flex-row">
      <div>
        <div className="book-svg w-64 overflow-hidden rounded-lg border border-zinc-800 shadow-xl" style={{ aspectRatio: '1600/2560' }}>
          {project.cover?.svg ? (
            <div dangerouslySetInnerHTML={{ __html: project.cover.svg }} />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-800 text-zinc-600">
              {loading ? <Loader2 size={22} className="animate-spin text-amber-400" /> : <span className="text-xs">Sem capa</span>}
            </div>
          )}
        </div>
        {project.cover?.palette?.length > 0 && (
          <div className="mt-3 flex gap-1.5">
            {project.cover.palette.map((c, i) => (
              <span key={i} className="h-5 w-5 rounded-full border border-zinc-700" style={{ background: c }} title={c} />
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Capa do e-book</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            A IA cria a capa em SVG vetorial com tipografia e paleta exclusivas, combinando com o
            tema do seu livro. Gere quantas versoes quiser ate encontrar a favorita.
          </p>
        </div>

        <div>
          <label className="label">Estilo visual</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  style === s ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Detalhe extra (opcional)</label>
          <input
            className="input"
            placeholder="Ex.: tons dourados, remeter a cidade a noite, estilo anos 70..."
            value={hint}
            onChange={e => setHint(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : project.cover?.svg ? <RefreshCw size={15} /> : <Sparkles size={15} />}
            {loading ? 'Desenhando...' : project.cover?.svg ? 'Gerar nova capa' : 'Gerar capa com IA'}
          </button>
        </div>
      </div>
    </div>
  )
}
