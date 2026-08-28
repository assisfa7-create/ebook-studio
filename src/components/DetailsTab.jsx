import React, { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

const TONES = ['Profissional', 'Inspirador', 'Didatico', 'Descontraido', 'Direto ao ponto', 'Storytelling']

export default function DetailsTab({ project, updateProject, toast }) {
  const [blurbLoading, setBlurbLoading] = useState(false)

  const set = (k, v) => updateProject(p => ({ ...p, [k]: v }))

  async function genBlurb() {
    setBlurbLoading(true)
    try {
      const res = await window.api.blurb(project)
      if (!res.ok) throw new Error(res.error)
      updateProject(p => ({ ...p, blurb: res.data }))
      toast('Sinopse gerada.', 'success')
    } catch (err) {
      toast('Falha: ' + err.message, 'error')
    } finally {
      setBlurbLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-8 py-8">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Titulo</label>
          <input className="input" value={project.title || ''} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className="label">Subtitulo</label>
          <input className="input" value={project.subtitle || ''} onChange={e => set('subtitle', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Autor</label>
          <input className="input" value={project.author || ''} onChange={e => set('author', e.target.value)} />
        </div>
        <div>
          <label className="label">Publico-alvo</label>
          <input className="input" value={project.audience || ''} onChange={e => set('audience', e.target.value)} />
        </div>
        <div>
          <label className="label">Tom</label>
          <select className="input" value={project.tone || 'Profissional'} onChange={e => set('tone', e.target.value)}>
            {TONES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label mb-0">Sinopse (quarta capa)</label>
          <button className="btn-outline px-3 py-1.5 text-xs" onClick={genBlurb} disabled={blurbLoading}>
            {blurbLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Gerar com IA
          </button>
        </div>
        <textarea
          className="input min-h-24 resize-none"
          placeholder="A sinopse aparece no PDF exportado e no arquivo EPUB."
          value={project.blurb || ''}
          onChange={e => set('blurb', e.target.value)}
        />
      </div>

      <p className="text-xs leading-relaxed text-zinc-600">
        Estes dados sao usados na pagina de titulo, na sinopse, na capa e nos metadados do EPUB.
      </p>
    </div>
  )
}
