import React, { useState } from 'react'
import { ArrowRight, Sparkles, Loader2, ArrowLeft, Check } from 'lucide-react'
import { Overlay } from './Toasts'

const TONES = ['Profissional', 'Inspirador', 'Didatico', 'Descontraido', 'Direto ao ponto', 'Storytelling']
const SIZES = [
  { id: 'curto', label: 'Curto', desc: '~900 palavras/cap.' },
  { id: 'medio', label: 'Medio', desc: '~1.700 palavras/cap.' },
  { id: 'longo', label: 'Longo', desc: '~2.600 palavras/cap.' }
]

export default function Wizard({ settings, toast, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    topic: '',
    audience: '',
    tone: 'Profissional',
    chapterCount: 8,
    chapterSize: 'medio',
    author: '',
    language: 'Portugues (Brasil)'
  })
  const [outline, setOutline] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const canSubmit = form.topic.trim().length > 3

  async function generateOutline() {
    const ready = settings && (settings.provider === 'ollama' ? settings.ollamaModel : settings.apiKey)
    if (!ready) {
      toast('Configure o provedor de IA (Claude ou Ollama) nas Configuracoes antes de comecar.', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await window.api.outline({
        ...form,
        chapterCount: Number(form.chapterCount)
      })
      if (!res.ok) throw new Error(res.error)
      setOutline(res.data)
      setStep(2)
    } catch (err) {
      toast('Falha ao gerar estrutura: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function createBook() {
    setLoading(true)
    try {
      const res = await window.api.newProject()
      if (!res.ok) throw new Error('Nao foi possivel criar o projeto')
      const project = {
        ...res.data,
        ...form,
        chapterCount: undefined,
        title: outline.title || form.title || form.topic,
        subtitle: outline.subtitle || '',
        blurb: outline.blurb || '',
        chapters: (outline.chapters || []).map(c => ({
          title: c.title,
          summary: c.summary,
          keyPoints: c.keyPoints || [],
          content: '',
          status: 'pending'
        }))
      }
      await window.api.saveProject(project)
      onCreated(project.id)
    } catch (err) {
      toast(err.message, 'error')
      setLoading(false)
    }
  }

  return (
    <Overlay title={step === 1 ? 'Novo e-book' : 'Revise a estrutura'} onClose={onClose} wide={step === 2}>
      {step === 1 ? (
        <div className="space-y-5">
          <div>
            <label className="label">Tema ou ideia do livro *</label>
            <input
              className="input"
              placeholder="Ex.: Financas pessoais para quem comeca do zero"
              value={form.topic}
              onChange={e => set('topic', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Titulo (opcional)</label>
              <input className="input" placeholder="Deixe vazio para a IA sugerir" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="label">Autor</label>
              <input className="input" placeholder="Seu nome" value={form.author} onChange={e => set('author', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Publico-alvo</label>
              <input className="input" placeholder="Ex.: jovens adultos" value={form.audience} onChange={e => set('audience', e.target.value)} />
            </div>
            <div>
              <label className="label">Tom</label>
              <select className="input" value={form.tone} onChange={e => set('tone', e.target.value)}>
                {TONES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Capitulos: <span className="text-amber-400">{form.chapterCount}</span></label>
            <input
              type="range" min="4" max="18" step="1" value={form.chapterCount}
              onChange={e => set('chapterCount', e.target.value)}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <label className="label">Tamanho dos capitulos</label>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set('chapterSize', s.id)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition ${
                    form.chapterSize === s.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-sm font-medium text-zinc-100">{s.label}</div>
                  <div className="text-[11px] text-zinc-500">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button className="btn-primary" disabled={!canSubmit || loading} onClick={generateOutline}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Desenhando a estrutura...' : 'Gerar estrutura com IA'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="label">Titulo</label>
            <input className="input" value={outline?.title || ''} onChange={e => setOutline(o => ({ ...o, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Subtitulo</label>
            <input className="input" value={outline?.subtitle || ''} onChange={e => setOutline(o => ({ ...o, subtitle: e.target.value }))} />
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
              {outline?.chapters?.length || 0} capitulos
            </div>
            <ol className="space-y-2.5">
              {outline?.chapters?.map((c, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <input
                      className="w-full bg-transparent text-sm font-medium text-zinc-100 outline-none"
                      value={c.title}
                      onChange={e => setOutline(o => ({
                        ...o,
                        chapters: o.chapters.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                      }))}
                    />
                    <p className="text-xs leading-relaxed text-zinc-500">{c.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex justify-between pt-1">
            <button className="btn-outline" onClick={() => setStep(1)} disabled={loading}>
              <ArrowLeft size={15} />
              Voltar
            </button>
            <button className="btn-primary" onClick={createBook} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Criar e-book
            </button>
          </div>
        </div>
      )}
    </Overlay>
  )
}
