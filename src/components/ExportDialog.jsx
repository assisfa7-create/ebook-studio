import React, { useState } from 'react'
import { Loader2, FileDown, FileText, Globe, BookOpen } from 'lucide-react'
import { Overlay } from './Toasts'

const FORMATS = [
  { id: 'pdf', name: 'PDF', desc: 'Diagramado 6x9 pol, pronto para ler ou imprimir.', icon: FileDown },
  { id: 'epub', name: 'EPUB', desc: 'Padrao para Kindle, Apple Books e Kobo.', icon: BookOpen },
  { id: 'html', name: 'HTML', desc: 'Pagina unica com estilo editorial.', icon: Globe },
  { id: 'md', name: 'Markdown', desc: 'Para editar em qualquer editor de texto.', icon: FileText }
]

export default function ExportDialog({ project, onClose, toast, onDone }) {
  const [fmt, setFmt] = useState('pdf')
  const [loading, setLoading] = useState(false)

  const missing = project.chapters.filter(c => !c.content).length

  async function doExport() {
    setLoading(true)
    try {
      const res = await window.api.export(fmt, project)
      if (res.canceled) return
      if (!res.ok) throw new Error(res.error)
      onDone()
      toast('Exportado: ' + res.data, 'success')
      onClose()
    } catch (err) {
      toast('Erro ao exportar: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Overlay title="Exportar e-book" onClose={onClose}>
      {missing > 0 && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {missing} capitulo(s) ainda sem conteudo serao incluidos em branco.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {FORMATS.map(f => (
          <button
            key={f.id}
            onClick={() => setFmt(f.id)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              fmt === f.id ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
            }`}
          >
            <f.icon size={18} className={fmt === f.id ? 'text-amber-400' : 'text-zinc-500'} />
            <span>
              <span className="block text-sm font-semibold text-zinc-100">{f.name}</span>
              <span className="mt-0.5 block text-xs leading-snug text-zinc-500">{f.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn-primary" onClick={doExport} disabled={loading}>
          {loading && <Loader2 size={15} className="animate-spin" />}
          Exportar {fmt.toUpperCase()}
        </button>
      </div>
    </Overlay>
  )
}
