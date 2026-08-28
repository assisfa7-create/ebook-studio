import React, { useEffect, useState } from 'react'
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { Overlay } from './Toasts'

const FALLBACK_MODELS = [
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
  { id: 'claude-opus-4-1', name: 'Claude Opus 4.1' },
  { id: 'claude-3-5-haiku-latest', name: 'Claude Haiku 3.5' }
]

export default function SettingsDialog({ settings, onClose, onSaved }) {
  const [apiKey, setApiKey] = useState(settings?.apiKey || '')
  const [model, setModel] = useState(settings?.model || 'claude-sonnet-4-5')
  const [show, setShow] = useState(false)
  const [models, setModels] = useState(FALLBACK_MODELS)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.listModels().then(res => {
      if (res.ok && res.data.length) setModels(res.data)
    })
  }, [])

  async function testKey() {
    setTesting(true)
    setTestResult(null)
    const res = await window.api.checkKey(apiKey.trim())
    setTestResult(res.ok)
    setTesting(false)
  }

  async function save() {
    setSaving(true)
    const s = { apiKey: apiKey.trim(), model }
    await window.api.saveSettings(s)
    onSaved(s)
    setSaving(false)
    onClose()
  }

  return (
    <Overlay title="Configuracoes" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <label className="label">API key do Claude</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={show ? 'text' : 'password'}
                className="input pr-10 font-mono text-xs"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
              />
              <button
                onClick={() => setShow(s => !s)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                type="button"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button className="btn-outline shrink-0" onClick={testKey} disabled={testing || !apiKey.trim()}>
              {testing ? <Loader2 size={14} className="animate-spin" /> : null}
              Testar
            </button>
          </div>
          {testResult === true && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 size={13} /> Chave valida e funcionando.
            </p>
          )}
          {testResult === false && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <XCircle size={13} /> Chave invalida ou sem creditos.
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
            Crie sua chave em console.anthropic.com e guarde os creditos ativos. A chave fica
            armazenada apenas no seu computador.
          </p>
        </div>

        <div>
          <label className="label">Modelo</label>
          <select className="input" value={model} onChange={e => setModel(e.target.value)}>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name || m.id}</option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-zinc-600">
            Sonnet e o melhor equilibrio entre qualidade e custo para e-books completos.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </Overlay>
  )
}
