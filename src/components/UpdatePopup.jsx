import React, { useEffect, useRef, useState } from 'react'
import { Rocket } from 'lucide-react'

const SHOW = ['available', 'downloading', 'downloaded']

export default function UpdatePopup() {
  const [status, setStatus] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const lastStatus = useRef(null)

  useEffect(() => {
    const off = window.api.onUpdateStatus(s => {
      if (lastStatus.current !== s.status) setDismissed(false)
      lastStatus.current = s.status
      setStatus(s)
    })
    return off
  }, [])

  if (!status || !SHOW.includes(status.status) || dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="anim-fade w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
            <Rocket size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-zinc-100">
              {status.status === 'downloaded' ? 'Atualizacao pronta' : 'Nova versao disponivel'}
              {status.version && <span className="ml-1.5 font-normal text-zinc-500">v{status.version}</span>}
            </h3>
            {status.status === 'downloading' ? (
              <div className="mt-2.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${status.percent || 0}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">Baixando... {status.percent || 0}%</p>
              </div>
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                {status.status === 'downloaded'
                  ? 'Download concluido. Reinicie o app para aplicar a atualizacao.'
                  : 'A atualizacao esta sendo baixada em segundo plano.'}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-outline px-3.5 py-1.5 text-xs" onClick={() => setDismissed(true)}>
            Depois
          </button>
          {status.status === 'downloaded' && (
            <button className="btn-primary px-3.5 py-1.5 text-xs" onClick={() => window.api.installUpdate()}>
              <Rocket size={13} />
              Reiniciar e atualizar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
