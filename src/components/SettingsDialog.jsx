import React, { useEffect, useState } from 'react'
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, Cloud, HardDrive, RefreshCw, Rocket } from 'lucide-react'
import { Overlay } from './Toasts'

const STATUS_TEXT = {
  checking: 'Verificando atualizacoes...',
  available: 'Nova versao disponivel. Baixando...',
  'up-to-date': 'Voce ja esta na versao mais recente.',
  downloading: 'Baixando atualizacao...',
  downloaded: 'Atualizacao baixada! Reinicie para aplicar.',
  error: 'Nao foi possivel verificar atualizacoes agora.'
}

const FALLBACK_MODELS = [
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
  { id: 'claude-opus-4-1', name: 'Claude Opus 4.1' },
  { id: 'claude-3-5-haiku-latest', name: 'Claude Haiku 3.5' }
]

export default function SettingsDialog({ settings, onClose, onSaved, toast }) {
  const [provider, setProvider] = useState(settings?.provider || 'anthropic')
  const [apiKey, setApiKey] = useState(settings?.apiKey || '')
  const [model, setModel] = useState(settings?.model || 'claude-sonnet-4-5')
  const [ollamaUrl, setOllamaUrl] = useState(settings?.ollamaUrl || 'http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState(settings?.ollamaModel || '')
  const [models, setModels] = useState(FALLBACK_MODELS)
  const [modelsError, setModelsError] = useState(null)
  const [loadingModels, setLoadingModels] = useState(false)
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState(null)
  const [updateError, setUpdateError] = useState(null)

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion)
    const off = window.api.onUpdateStatus(setUpdateStatus)
    return off
  }, [])

  function loadModels(cfg) {
    setLoadingModels(true)
    setModelsError(null)
    window.api.providerModels(cfg).then(res => {
      setLoadingModels(false)
      if (res.ok && res.data.length) {
        setModels(res.data)
        if (cfg.provider === 'ollama' && !cfg.currentModel && res.data.length) {
          setOllamaModel(current => current || res.data[0].id)
        }
      } else {
        setModels(cfg.provider === 'anthropic' ? FALLBACK_MODELS : [])
        setModelsError(res.ok ? 'Nenhum modelo instalado no Ollama. Rode: ollama pull qwen3:14b' : res.error)
      }
    })
  }

  useEffect(() => {
    loadModels({ provider, ollamaUrl, apiKey, currentModel: provider === 'ollama' ? ollamaModel : model })
  }, [provider])

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    const res = await window.api.providerTest({ provider, apiKey: apiKey.trim(), ollamaUrl: ollamaUrl.trim() })
    setTestResult(res.ok)
    if (res.ok) loadModels({ provider, ollamaUrl: ollamaUrl.trim(), apiKey: apiKey.trim(), currentModel: provider === 'ollama' ? ollamaModel : model })
    setTesting(false)
  }

  async function save() {
    setSaving(true)
    const s = {
      provider,
      apiKey: apiKey.trim(),
      model,
      ollamaUrl: ollamaUrl.trim() || 'http://localhost:11434',
      ollamaModel
    }
    await window.api.saveSettings(s)
    onSaved(s)
    setSaving(false)
    onClose()
  }

  return (
    <Overlay title="Configuracoes" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <label className="label">Provedor de IA</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setProvider('anthropic')}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                provider === 'anthropic' ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
              }`}
            >
              <Cloud size={18} className={provider === 'anthropic' ? 'text-amber-400' : 'text-zinc-500'} />
              <span>
                <span className="block text-sm font-semibold text-zinc-100">Claude (API)</span>
                <span className="text-[11px] text-zinc-500">Maxima qualidade, pago por uso</span>
              </span>
            </button>
            <button
              onClick={() => setProvider('ollama')}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                provider === 'ollama' ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
              }`}
            >
              <HardDrive size={18} className={provider === 'ollama' ? 'text-amber-400' : 'text-zinc-500'} />
              <span>
                <span className="block text-sm font-semibold text-zinc-100">Ollama (local)</span>
                <span className="text-[11px] text-zinc-500">Gratis, roda no seu PC</span>
              </span>
            </button>
          </div>
        </div>

        {provider === 'anthropic' ? (
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
              <button className="btn-outline shrink-0" onClick={testConnection} disabled={testing || !apiKey.trim()}>
                {testing && <Loader2 size={14} className="animate-spin" />}
                Testar
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
              Crie sua chave em console.anthropic.com. A chave fica armazenada apenas no seu computador.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Servidor Ollama</label>
              <div className="flex gap-2">
                <input
                  className="input font-mono text-xs"
                  placeholder="http://localhost:11434"
                  value={ollamaUrl}
                  onChange={e => { setOllamaUrl(e.target.value); setTestResult(null) }}
                />
                <button className="btn-outline shrink-0" onClick={testConnection} disabled={testing}>
                  {testing && <Loader2 size={14} className="animate-spin" />}
                  Testar
                </button>
              </div>
              <p className="mt-2 text-[11px] text-zinc-600">
                Baixe em ollama.com e deixe o programa aberto (ollama serve).
              </p>
            </div>
          </div>
        )}

        {testResult === true && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 size={13} /> Conexao testada com sucesso.
          </p>
        )}
        {testResult === false && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <XCircle size={13} /> Falha na conexao. Verifique os dados e tente de novo.
          </p>
        )}

        <div>
          <label className="label">Modelo</label>
          {loadingModels ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 size={13} className="animate-spin" /> Carregando modelos...
            </div>
          ) : models.length ? (
            <select
              className="input"
              value={provider === 'ollama' ? ollamaModel : model}
              onChange={e => (provider === 'ollama' ? setOllamaModel(e.target.value) : setModel(e.target.value))}
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name || m.id}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-red-400">{modelsError}</p>
          )}
          {provider === 'anthropic' && (
            <p className="mt-2 text-[11px] text-zinc-600">
              Sonnet e o melhor equilibrio entre qualidade e custo para e-books completos.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            className="btn-primary"
            onClick={save}
            disabled={saving || (provider === 'ollama' ? !ollamaModel : !apiKey.trim())}
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Salvar
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Atualizacoes</span>
            <span className="text-[11px] text-zinc-500">Versao {appVersion}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-outline px-3 py-1.5 text-xs"
              onClick={async () => {
                setUpdateStatus({ status: 'checking' })
                setUpdateError(null)
                const res = await window.api.checkUpdate()
                if (!res.ok) {
                  setUpdateStatus({ status: 'error' })
                  setUpdateError(res.error)
                }
              }}
            >
              <RefreshCw size={13} />
              Verificar atualizacoes
            </button>
            {updateStatus.status === 'downloaded' && (
              <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => window.api.installUpdate()}>
                <Rocket size={13} />
                Reiniciar e atualizar
              </button>
            )}
          </div>
          {updateStatus && (
            <p className={`mt-2.5 text-xs ${updateStatus.status === 'error' ? 'text-red-400' : updateStatus.status === 'downloaded' ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {STATUS_TEXT[updateStatus.status]}
              {updateStatus.percent != null ? ` ${updateStatus.percent}%` : ''}
              {updateError ? ` (${updateError})` : ''}
            </p>
          )}
          <p className="mt-2 text-[11px] text-zinc-600">
            O app verifica novidades ao abrir. Seus e-books nunca sao afetados por atualizacoes.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-1.5 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Backup local</div>
          <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
            A cada abertura o app guarda uma copia automatica dos seus e-books (ultimas 10 versoes).
            Voce tambem pode gerar um arquivo .zip para guardar ou levar no pendrive.
          </p>
          <div className="flex gap-2">
            <button
              className="btn-outline px-3 py-1.5 text-xs"
              onClick={async () => {
                const res = await window.api.backupCreate()
                if (res.ok) toast('Backup salvo em: ' + res.data, 'success')
                else if (!res.canceled) toast('Erro no backup: ' + res.error, 'error')
              }}
            >
              Backup agora
            </button>
            <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => window.api.backupRestore()}>
              Restaurar backup
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}
