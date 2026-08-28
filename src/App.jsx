import React, { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Library from './components/Library'
import Editor from './components/Editor'
import Wizard from './components/Wizard'
import SettingsDialog from './components/SettingsDialog'
import ExportDialog from './components/ExportDialog'
import Toasts from './components/Toasts'

export default function App() {
  const [projects, setProjects] = useState([])
  const [project, setProject] = useState(null)
  const [settings, setSettings] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }, [])

  const loadProjects = useCallback(async () => {
    const res = await window.api.listProjects()
    if (res.ok) setProjects(res.data)
  }, [])

  useEffect(() => {
    loadProjects()
    window.api.getSettings().then(r => setSettings(r.data))
  }, [loadProjects])

  const openProject = useCallback(async id => {
    const res = await window.api.openProject(id)
    if (res.ok) setProject(res.data)
  }, [])

  const updateProject = useCallback((updater, { persist = true } = {}) => {
    setProject(prev => {
      if (!prev) return prev
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (persist) window.api.saveProject(next)
      return next
    })
  }, [])

  const handleExported = () => toast('E-book exportado com sucesso.', 'success')

  return (
    <div className="flex h-full">
      <Sidebar
        projects={projects}
        project={project}
        settings={settings}
        onSelect={openProject}
        onNew={() => setDialog({ type: 'wizard' })}
        onSettings={() => setDialog({ type: 'settings' })}
        onGoHome={() => setProject(null)}
      />

      <main className="min-w-0 flex-1">
        {project ? (
          <Editor
            key={project.id}
            project={project}
            settings={settings}
            updateProject={updateProject}
            toast={toast}
            onExport={() => setDialog({ type: 'export' })}
            onBack={() => setProject(null)}
          />
        ) : (
          <Library projects={projects} onSelect={openProject} onNew={() => setDialog({ type: 'wizard' })} />
        )}
      </main>

      {dialog?.type === 'wizard' && (
        <Wizard
          settings={settings}
          toast={toast}
          onClose={() => setDialog(null)}
          onCreated={async id => {
            setDialog(null)
            await loadProjects()
            openProject(id)
          }}
        />
      )}

      {dialog?.type === 'settings' && (
        <SettingsDialog
          settings={settings}
          onClose={() => setDialog(null)}
          onSaved={s => {
            setSettings(s)
            toast('Configuracoes salvas.', 'success')
          }}
          toast={toast}
        />
      )}

      {dialog?.type === 'export' && project && (
        <ExportDialog
          project={project}
          onClose={() => setDialog(null)}
          toast={toast}
          onDone={handleExported}
        />
      )}

      <Toasts toasts={toasts} />
    </div>
  )
}
