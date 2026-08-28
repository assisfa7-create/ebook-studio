import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Download, Play, PlayCircle, CheckCircle2, Loader2, AlertCircle,
  Eye, PencilLine, Plus, Trash2, ChevronUp, ChevronDown, Square, Image, ImagePlus
} from 'lucide-react'
import CoverStudio from './CoverStudio'
import DetailsTab from './DetailsTab'
import { mdToHtml } from '../lib/md'

export default function Editor({ project, updateProject, toast, onExport, onBack }) {
  const [tab, setTab] = useState('write')
  const [sel, setSel] = useState(0)
  const [stream, setStream] = useState(null)
  const [genAll, setGenAll] = useState(false)
  const cancelRef = useRef(false)
  const projectRef = useRef(project)
  projectRef.current = project

  const chapters = project.chapters || []
  const chapter = chapters[sel]

  useEffect(() => () => { cancelRef.current = true }, [])

  async function generateChapter(i) {
    const reqId = 'r' + Date.now()
    const off = window.api.onStream(reqId, d => {
      if (d.type === 'chunk') setStream(s => (s && s.i === i ? { ...s, text: s.text + d.text } : s))
    })
    setStream({ i, text: '' })
    updateProject(p => {
      const c = [...p.chapters]
      c[i] = { ...c[i], status: 'generating' }
      return { ...p, chapters: c }
    })
    try {
      const res = await window.api.chapter(reqId, projectRef.current, i)
      if (!res.ok) throw new Error(res.error)
      updateProject(p => {
        const c = [...p.chapters]
        c[i] = { ...c[i], content: res.data, status: 'done' }
        return { ...p, chapters: c }
      })
      return true
    } catch (err) {
      toast('Erro ao gerar capitulo: ' + err.message, 'error')
      updateProject(p => {
        const c = [...p.chapters]
        c[i] = { ...c[i], status: 'error' }
        return { ...p, chapters: c }
      })
      return false
    } finally {
      off()
      setStream(null)
    }
  }

  async function generateAll() {
    if (!projectRef.current.chapters.length) return
    cancelRef.current = false
    setGenAll(true)
    for (let i = 0; i < projectRef.current.chapters.length; i++) {
      if (cancelRef.current) break
      const ch = projectRef.current.chapters[i]
      if (ch.content) continue
      setSel(i)
      const ok = await generateChapter(i)
      if (!ok) break
    }
    setGenAll(false)
  }

  function moveChapter(i, dir) {
    const j = i + dir
    if (j < 0 || j >= chapters.length) return
    updateProject(p => {
      const c = [...p.chapters]
      ;[c[i], c[j]] = [c[j], c[i]]
      return { ...p, chapters: c }
    })
    setSel(s => (s === i ? j : s === j ? i : s))
  }

  function deleteChapter(i) {
    updateProject(p => ({ ...p, chapters: p.chapters.filter((_, j) => j !== i) }))
    setSel(s => Math.max(0, s >= i ? s - 1 : s))
  }

  function addChapter() {
    updateProject(p => ({
      ...p,
      chapters: [...p.chapters, { title: 'Novo capitulo', summary: '', keyPoints: [], content: '', status: 'pending' }]
    }))
    setSel(chapters.length)
  }

  const doneCount = chapters.filter(c => c.content).length
  const progress = chapters.length ? Math.round((doneCount / chapters.length) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-800 px-5 py-3">
        <button onClick={onBack} className="btn-ghost px-2" title="Voltar para biblioteca">
          <ArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-zinc-50">{project.title || 'Sem titulo'}</h1>
          <p className="truncate text-xs text-zinc-500">{project.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-2 hidden w-40 sm:block">
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: progress + '%' }} />
            </div>
            <div className="mt-1 text-right text-[10px] text-zinc-500">{doneCount}/{chapters.length} capitulos</div>
          </div>
          <button className="btn-outline" onClick={() => setTab('cover')}>
            <Image size={15} />
            Capa
          </button>
          <button className="btn-primary" onClick={onExport}>
            <Download size={15} />
            Exportar
          </button>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-zinc-800 px-5">
        {[
          { id: 'write', label: 'Escrita' },
          { id: 'cover', label: 'Capa' },
          { id: 'details', label: 'Detalhes' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === t.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'write' && (
        <div className="flex min-h-0 flex-1">
          <div className="flex w-72 shrink-0 flex-col border-r border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Capitulos</span>
              <button onClick={addChapter} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="Adicionar capitulo">
                <Plus size={15} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {chapters.map((c, i) => (
                <ChapterRow
                  key={i} c={c} i={i} sel={sel} setSel={setSel}
                  moveChapter={moveChapter} deleteChapter={deleteChapter}
                  streaming={stream && stream.i === i}
                />
              ))}
            </div>
            <div className="border-t border-zinc-800 p-3">
              {genAll ? (
                <button className="btn-outline w-full border-red-500/40 text-red-400 hover:border-red-500 hover:text-red-300" onClick={() => { cancelRef.current = true }}>
                  <Square size={14} />
                  Parar geracao
                </button>
              ) : (
                <button className="btn-primary w-full" onClick={generateAll} disabled={doneCount === chapters.length}>
                  <PlayCircle size={16} />
                  Gerar capitulos
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto">
            {chapter ? (
              <ChapterPane
                chapter={chapter}
                index={sel}
                content={stream && stream.i === sel ? stream.text : chapter.content}
                streaming={stream && stream.i === sel}
                updateProject={updateProject}
                generateChapter={generateChapter}
                toast={toast}
                project={project}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                Adicione um capitulo comecando pelo + na lista.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'cover' && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CoverStudio project={project} updateProject={updateProject} toast={toast} />
        </div>
      )}

      {tab === 'details' && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DetailsTab project={project} updateProject={updateProject} toast={toast} />
        </div>
      )}
    </div>
  )
}

function ChapterRow({ c, i, sel, setSel, moveChapter, deleteChapter, streaming }) {
  const icon = streaming ? (
    <Loader2 size={13} className="animate-spin text-amber-400" />
  ) : c.status === 'done' || c.content ? (
    <CheckCircle2 size={13} className="text-emerald-500" />
  ) : c.status === 'error' ? (
    <AlertCircle size={13} className="text-red-500" />
  ) : (
    <span className="block h-1.5 w-1.5 rounded-full bg-zinc-600" />
  )
  return (
    <div
      className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition ${
        sel === i ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800/60'
      }`}
      onClick={() => setSel(i)}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{c.title || 'Capitulo ' + (i + 1)}</span>
      <span className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
        <button onClick={e => { e.stopPropagation(); moveChapter(i, -1) }} className="p-0.5 text-zinc-500 hover:text-zinc-200"><ChevronUp size={13} /></button>
        <button onClick={e => { e.stopPropagation(); moveChapter(i, 1) }} className="p-0.5 text-zinc-500 hover:text-zinc-200"><ChevronDown size={13} /></button>
        <button onClick={e => { e.stopPropagation(); deleteChapter(i) }} className="p-0.5 text-zinc-500 hover:text-red-400"><Trash2 size={13} /></button>
      </span>
    </div>
  )
}

function ChapterPane({ chapter, index, content, streaming, updateProject, generateChapter, toast, project }) {
  const [preview, setPreview] = useState(false)
  const [text, setText] = useState(chapter.content || '')
  const [illusLoading, setIllusLoading] = useState(false)

  useEffect(() => {
    if (streaming) return
    setText(chapter.content || '')
  }, [chapter.content, index, streaming])

  async function addIllustration() {
    setIllusLoading(true)
    try {
      const res = await window.api.illustration(project, index, '')
      if (!res.ok) throw new Error(res.error)
      const { id, svg, caption } = res.data
      updateProject(p => ({
        ...p,
        images: [...(p.images || []), { id, svg, caption }],
        chapters: p.chapters.map((c, i) =>
          i === index ? { ...c, content: (c.content || '') + `\n\n![${caption || 'ilustracao'}](img:${id})\n` } : c
        )
      }))
      toast('Ilustracao adicionada ao capitulo.', 'success')
    } catch (err) {
      toast('Falha na ilustracao: ' + err.message, 'error')
    } finally {
      setIllusLoading(false)
    }
  }

  const saveRef = useRef()
  saveRef.current = { content: text, index }
  useEffect(() => {
    const t = setTimeout(() => {
      const { content: val, index: i } = saveRef.current
      updateProject(p => {
        if (p.chapters[i] && p.chapters[i].content === val) return p
        const c = [...p.chapters]
        c[i] = { ...c[i], content: val }
        return { ...p, chapters: c }
      })
    }, 700)
    return () => clearTimeout(t)
  }, [text])

  const words = (streaming ? content : text).trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <input
          className="w-full bg-transparent text-lg font-bold text-zinc-50 outline-none"
          value={chapter.title}
          onChange={e => {
            const v = e.target.value
            updateProject(p => {
              const c = [...p.chapters]
              c[index] = { ...c[index], title: v }
              return { ...p, chapters: c }
            })
          }}
        />
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <span className="text-xs text-zinc-500">{words} palavras</span>
          <button
            onClick={addIllustration}
            disabled={streaming || illusLoading}
            className="btn-ghost px-2.5 py-1.5"
            title="Gerar ilustracao com IA para este capitulo"
          >
            {illusLoading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          </button>
          <button
            onClick={() => setPreview(p => !p)}
            className="btn-ghost px-2.5 py-1.5"
            title={preview ? 'Editar' : 'Visualizar'}
          >
            {preview ? <PencilLine size={15} /> : <Eye size={15} />}
          </button>
          <button
            className="btn-outline px-3 py-1.5 text-xs"
            disabled={streaming}
            onClick={() => generateChapter(index)}
          >
            <Play size={13} />
            {chapter.content ? 'Regerar' : 'Gerar'}
          </button>
        </div>
      </div>

      {streaming || preview ? (
        <article className="prose-book anim-fade min-h-[60vh]">
          <div dangerouslySetInnerHTML={{ __html: mdToHtml(content || '', project.images || []) }} />
          {streaming && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-amber-400 align-middle" />}
        </article>
      ) : (
        <textarea
          className="min-h-[60vh] w-full resize-none bg-transparent font-mono text-[13.5px] leading-relaxed text-zinc-200 outline-none"
          placeholder="Escreva aqui ou clique em Gerar para a IA escrever este capitulo..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
      )}
    </div>
  )
}
