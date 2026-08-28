const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  openProject: id => ipcRenderer.invoke('project:open', id),
  saveProject: p => ipcRenderer.invoke('project:save', p),
  deleteProject: id => ipcRenderer.invoke('project:delete', id),
  newProject: () => ipcRenderer.invoke('project:new'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: s => ipcRenderer.invoke('settings:save', s),
  providerTest: cfg => ipcRenderer.invoke('provider:test', cfg),
  providerModels: cfg => ipcRenderer.invoke('provider:models', cfg),
  outline: args => ipcRenderer.invoke('gen:outline', args),
  chapter: (reqId, project, chapterIndex) =>
    ipcRenderer.invoke('gen:chapter', { reqId, project, chapterIndex }),
  blurb: project => ipcRenderer.invoke('gen:blurb', project),
  cover: args => ipcRenderer.invoke('gen:cover', args),
  illustration: (project, chapterIndex, hint) =>
    ipcRenderer.invoke('gen:illustration', { project, chapterIndex, hint }),
  export: (fmt, project) => ipcRenderer.invoke('export:book', { fmt, project }),
  onStream: (reqId, cb) => {
    const channel = 'stream:' + reqId
    const handler = (_e, data) => cb(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
})
