const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const fsp = fs.promises
const { Claude, Ollama, extractJson, extractSvg } = require('./claude')
const exporter = require('./exporter')

let win = null

const dataDir = () => path.join(app.getPath('userData'), 'data')
const projectsDir = () => path.join(dataDir(), 'projects')
const settingsFile = () => path.join(dataDir(), 'settings.json')

async function ensureDirs() {
  await fsp.mkdir(projectsDir(), { recursive: true })
}

async function readSettings() {
  try {
    return JSON.parse(await fsp.readFile(settingsFile(), 'utf8'))
  } catch (_) {
    return { provider: 'anthropic', apiKey: '', model: 'claude-sonnet-4-5', ollamaUrl: 'http://localhost:11434', ollamaModel: '' }
  }
}

async function writeSettings(s) {
  await ensureDirs()
  await fsp.writeFile(settingsFile(), JSON.stringify(s, null, 2), 'utf8')
}

function makeClient(s) {
  if (s.provider === 'ollama') return new Ollama(s.ollamaUrl || 'http://localhost:11434')
  if (!s.apiKey) {
    const err = new Error('Configure sua API key do Claude (ou troque para Ollama) nas Configuracoes.')
    err.code = 'NO_KEY'
    throw err
  }
  return new Claude(s.apiKey)
}

function modelFor(s) {
  if (s.provider === 'ollama') {
    if (!s.ollamaModel) {
      const err = new Error('Selecione um modelo do Ollama nas Configuracoes.')
      err.code = 'NO_KEY'
      throw err
    }
    return s.ollamaModel
  }
  return s.model || 'claude-sonnet-4-5'
}

async function completeJson(c, model, { system, messages, maxTokens, temperature }) {
  const text = await c.complete({ model, system, messages, maxTokens, temperature, jsonMode: true })
  try {
    return extractJson(text)
  } catch (_) {}
  const retry = await c.complete({
    model,
    system,
    messages: [
      ...messages,
      { role: 'assistant', content: text },
      { role: 'user', content: 'Sua resposta anterior nao continha JSON valido. Responda novamente com APENAS o JSON pedido, sem markdown, sem comentarios, sem texto fora do JSON.' }
    ],
    maxTokens,
    temperature: 0.3,
    jsonMode: true
  })
  return extractJson(retry)
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#09090b',
    icon: undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  Menu.setApplicationMenu(null)
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())

ipcMain.handle('projects:list', async () => {
  await ensureDirs()
  const files = await fsp.readdir(projectsDir())
  const list = []
  for (const f of files.filter(f => f.endsWith('.json'))) {
    try {
      const p = JSON.parse(await fsp.readFile(path.join(projectsDir(), f), 'utf8'))
      list.push({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        author: p.author,
        updatedAt: p.updatedAt,
        chapterCount: (p.chapters || []).length,
        cover: p.cover && p.cover.svg ? p.cover.svg : null
      })
    } catch (_) {}
  }
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  return { ok: true, data: list }
})

ipcMain.handle('project:open', async (_e, id) => {
  const file = path.join(projectsDir(), id + '.json')
  const p = JSON.parse(await fsp.readFile(file, 'utf8'))
  return { ok: true, data: p }
})

ipcMain.handle('project:save', async (_e, project) => {
  await ensureDirs()
  project.updatedAt = Date.now()
  await fsp.writeFile(path.join(projectsDir(), project.id + '.json'), JSON.stringify(project, null, 2), 'utf8')
  return { ok: true }
})

ipcMain.handle('project:delete', async (_e, id) => {
  await fsp.rm(path.join(projectsDir(), id + '.json'), { force: true })
  return { ok: true }
})

ipcMain.handle('project:new', async () => {
  const project = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: '',
    subtitle: '',
    author: '',
    topic: '',
    audience: '',
    tone: 'Profissional',
    language: 'Portugues (Brasil)',
    chapterSize: 'medio',
    blurb: '',
    keywords: [],
    chapters: [],
    cover: null
  }
  await ensureDirs()
  await fsp.writeFile(path.join(projectsDir(), project.id + '.json'), JSON.stringify(project, null, 2), 'utf8')
  return { ok: true, data: project }
})

ipcMain.handle('settings:get', async () => ({ ok: true, data: await readSettings() }))

ipcMain.handle('settings:save', async (_e, s) => {
  await writeSettings(s)
  return { ok: true }
})

ipcMain.handle('provider:test', async (_e, cfg) => {
  try {
    if (cfg.provider === 'ollama') await new Ollama(cfg.ollamaUrl).check()
    else await new Claude(cfg.apiKey).check()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('provider:models', async (_e, cfg) => {
  try {
    if (cfg.provider === 'ollama') {
      return { ok: true, data: await new Ollama(cfg.ollamaUrl).listModels() }
    }
    const s = await readSettings()
    const key = cfg.apiKey || s.apiKey
    return { ok: true, data: await new Claude(key).listModels() }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('gen:outline', async (_e, args) => {
  try {
    const s = await readSettings()
    const c = makeClient(s)
    const data = await completeJson(c, modelFor(s), {
      system: outlineSystem(args.language),
      messages: [{ role: 'user', content: outlineUser(args) }],
      maxTokens: 4000,
      temperature: 0.7
    })
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('gen:chapter', async (e, args) => {
  const { reqId, project, chapterIndex } = args
  try {
    const s = await readSettings()
    const c = makeClient(s)
    const messages = chapterMessages(project, chapterIndex)
    const text = await c.complete({
      model: modelFor(s),
      system: chapterSystem(project),
      messages,
      maxTokens: { curto: 3000, medio: 5000, longo: 7500 }[project.chapterSize || 'medio'] || 5000,
      temperature: 0.8,
      onChunk: t => { e.sender.send('stream:' + reqId, { type: 'chunk', text: t }) }
    })
    return { ok: true, data: text }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('gen:blurb', async (_e, project) => {
  try {
    const s = await readSettings()
    const c = makeClient(s)
    const chapterList = (project.chapters || []).map((c2, i) => `${i + 1}. ${c2.title}: ${c2.summary || ''}`).join('\n')
    const text = await c.complete({
      model: modelFor(s),
      system: 'Voce e um redator publicitario especializado em livros. Responda apenas com o texto pedido, sem comentarios.',
      messages: [{
        role: 'user',
        content: `Escreva a quarta capa (sinopse) de um e-book em ${project.language}.\n\nTitulo: ${project.title}\nSubtitulo: ${project.subtitle || '-'}\nPublico: ${project.audience}\nTom: ${project.tone}\n\nEstrutura:\n${chapterList}\n\nA sinopse deve ter 3 a 4 frases, persuasiva, mostrando a promessa do livro e para quem ele e. Responda apenas com a sinopse.`
      }],
      maxTokens: 500,
      temperature: 0.8
    })
    return { ok: true, data: text.trim() }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('gen:cover', async (_e, args) => {
  try {
    const s = await readSettings()
    const c = makeClient(s)
    const data = await completeJson(c, modelFor(s), {
      system: coverSystem(),
      messages: [{ role: 'user', content: coverUser(args) }],
      maxTokens: 8000,
      temperature: 0.85
    })
    const svg = extractSvg(typeof data.svg === 'string' ? data.svg : '')
    if (!data.palette) data.palette = []
    data.svg = svg
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('export:book', async (_e, { fmt, project }) => {
  try {
    const exts = { pdf: 'pdf', epub: 'epub', html: 'html', md: 'md' }
    const res = await dialog.showSaveDialog(win, {
      title: 'Exportar e-book',
      defaultPath: `${(project.title || 'ebook').replace(/[\\/:*?"<>|]/g, '')}.${exts[fmt]}`,
      filters: [{ name: fmt.toUpperCase(), extensions: [exts[fmt]] }]
    })
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    if (fmt === 'pdf') await exporter.exportPdf(win, res.filePath, project)
    else if (fmt === 'epub') await exporter.exportEpub(res.filePath, project)
    else if (fmt === 'html') await exporter.exportHtml(res.filePath, project)
    else await exporter.exportMarkdown(res.filePath, project)
    return { ok: true, data: res.filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

const COVER_STYLES = {
  'Minimalista': 'design minimalista, muito espaco em branco, uma unica forma grafica marcante',
  'Tipografico': 'capa tipografica: o titulo e a arte, letras gigantes em varias cores sobrepostas',
  'Geometrico abstrato': 'formas geometricas abstratas ousadas, estilo Bauhaus, composicao em blocos',
  'Gradiente moderno': 'gradiente suave de duas cores vibrantes, formas translucidas sobrepostas',
  'Vintage editorial': 'estilo editorial vintage anos 60-70, cores terrosas, molduras classicas',
  'Natureza': 'elementos organicos, folhas e paisagens estilizadas, tons terrosos e verdes',
  'Futurista tech': 'estetica futurista, linhas neon em grid, fundo escuro, brilho ciano e magenta',
  'Art Deco': 'art deco com simetria dourada, linhas elegantes e fundo profundo',
  'Aquarela': 'manchas de aquarela suaves e sobrepostas, visual organico e acolhedor',
  'Dark premium': 'fundo quase preto, tipografia clara com detalhes dourados, luxo e sofisticacao',
  'Bold maximalista': 'estilo maximalista ousado, cores saturadas em blocos, energia e contraste alto',
  'Fotografico monocromatico': 'composicao monocromatica elegante que simula fotografia com formas vetoriais'
}

function outlineSystem(language) {
  return `Voce e um editor-chefe de uma editora digital de elite, especializado em e-books de nao-ficcao de alto desempenho e sucesso comercial.
Crie estruturas de e-books coesos, profundos e praticos, com progressao logica entre capitulos.
Responda SEMPRE em ${language}.
Retorne SOMENTE JSON valido, no formato:
{
  "title": "titulo forte e comercial",
  "subtitle": "subtitulo com promessa clara",
  "blurb": "sinopse de 3 frases",
  "chapters": [
    { "title": "titulo do capitulo", "summary": "resumo de 1-2 frases do que sera coberto", "keyPoints": ["ponto 1", "ponto 2", "ponto 3"] }
  ]
}`
}

function outlineUser(args) {
  return `Crie a estrutura completa de um e-book.

Tema/ideia: ${args.topic}
Publico-alvo: ${args.audience}
Tom: ${args.tone}
Numero de capitulos: ${args.chapterCount}
${args.title ? `Titulo desejado (respeite): ${args.title}` : 'Sugira o melhor titulo possivel.'}

Requisitos:
- Cada capitulo deve ter entre 3 e 5 keyPoints acionaveis.
- A sequencia de capitulos deve ter progressao: fundamentos primeiro, topicos avancos depois, e um capitulo final de sintese/plano de acao.
- Nao repita topicos entre capitulos.`
}

function chapterSystem(project) {
  return `Voce e um autor especialista e escritor profissional, escrevendo o e-book "${project.title}" (${project.subtitle || 'sem subtitulo'}).
Publico-alvo: ${project.audience}. Tom: ${project.tone}. Idioma: ${project.language}.

Regras de escrita:
- Escreva em Markdown. Comece o capitulo com um gancho forte (pergunta, historia curta ou dado impactante), sem titre com heading no inicio.
- Use ## para secoes internas quando fizer sentido.
- Seja concreto: exemplos praticos, passos, mini-casos e uma sintese final com "### Pontos-chave do capitulo" em lista.
- Nao escreva meta-comentarios ("neste capitulo vamos...") em excesso; va direto ao conteudo.
- Nao invente dados estatisticos precisos; prefira principios e exemplos genericos.
- Entregue ao menos ${wordsTarget(project.chapterSize)} palavras.`
}

function chapterMessages(project, index) {
  const ch = project.chapters[index]
  const prev = project.chapters.slice(Math.max(0, index - 2), index)
  const prevSummary = prev.map(p => `- ${p.title}: ${p.summary || ''}`).join('\n')
  const messages = []
  messages.push({
    role: 'user',
    content: `Estrutura do livro:\n${project.chapters.map((c, i) => `${i + 1}. ${c.title}`).join('\n')}\n\nResumo dos capitulos anteriores:\n${prevSummary || '(este e o primeiro capitulo)'}`
  })
  messages.push({
    role: 'assistant',
    content: 'Entendido. Aguardo a instrucao do capitulo a escrever, mantendo coesao com os anteriores.'
  })
  messages.push({
    role: 'user',
    content: `Escreva agora o capitulo ${index + 1}: "${ch.title}".\n\nResumo definido: ${ch.summary || '-'}\nPontos que precisa cobrir:\n${(ch.keyPoints || []).map(k => '- ' + k).join('\n')}`
  })
  return messages
}

function wordsTarget(size) {
  return { curto: 900, medio: 1700, longo: 2600 }[size] || 1700
}

function coverSystem() {
  return `Voce e um diretor de arte de capas de best-sellers. Gera capas como SVG limpo e moderno.
Retorne SOMENTE JSON no formato:
{ "palette": ["#hex", "#hex", "#hex"], "svg": "<svg ...>...</svg>" }

Regras do SVG:
- viewBox="0 0 1600 2560". Proporcao 5:8.
- Estilo editorial premium: composicao ousada, hierarquia tipografica clara, espaco em branco generoso.
- Apenas elementos vetoriais simples (rects, circles, paths, gradients, text). Sem imagens externas, sem <style>, sem scripts.
- font-family: use apenas 'Georgia, serif' ou 'Arial, sans-serif'.
- Inclua: titulo em destaque (grande, quebrado em poucas linhas), subtitulo menor, nome do autor na base.
- Todo <text> entre x=120 e x=1480, com escapes corretos (& vira &amp;).
- Contraste alto entre texto e fundo.`
}

function coverUser({ project, style, hint }) {
  const desc = COVER_STYLES[style] || ''
  return `Crie a capa do e-book:
Titulo: ${project.title}
Subtitulo: ${project.subtitle || '-'}
Autor: ${project.author || '-'}
Tema: ${project.topic}
Publico: ${project.audience}
Estilo desejado: ${style}${desc ? ` (${desc})` : ''}
${hint ? `Detalhe extra: ${hint}` : ''}

Gere um SVG (0 0 1600 2560) memoravel e profissional.`
}

ipcMain.handle('gen:illustration', async (_e, { project, chapterIndex, hint }) => {
  try {
    const s = await readSettings()
    const c = makeClient(s)
    const ch = project.chapters[chapterIndex]
    const excerpt = (ch.content || '').slice(0, 2500)
    const palette = project.cover && project.cover.palette ? project.cover.palette.join(', ') : ''
    const data = await completeJson(c, modelFor(s), {
      system: `Voce e um ilustrador editorial. Cria ilustracoes vetoriais SVG limpas e modernas para e-books.
Retorne SOMENTE JSON: { "caption": "legenda curta em ${project.language}", "svg": "<svg ...>...</svg>" }

Regras do SVG:
- viewBox="0 0 1200 800", sem atributos width/height fixos.
- Apenas formas vetoriais (rect, circle, path, ellipse, polygon, gradients). SEM <text> e sem imagens externas.
- Estilo flat/minimalista premium, coeso com a identidade visual do livro.
- Escape & como &amp; dentro do SVG.`,
      messages: [{
        role: 'user',
        content: `Ilustracao para o capitulo "${ch.title}" do e-book "${project.title}".
Resumo do capitulo: ${ch.summary || '-'}
${palette ? `Paleta do livro (use estas cores): ${palette}` : ''}
${hint ? `Pedido especifico: ${hint}` : ''}

Conteudo inicial do capitulo para inspiracao:
${excerpt}

Crie uma ilustracao que represente o conceito central do capitulo.`
      }],
      maxTokens: 6000,
      temperature: 0.8
    })
    const svg = extractSvg(typeof data.svg === 'string' ? data.svg : '')
    return { ok: true, data: { id: 'img' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), svg, caption: (data.caption || '').slice(0, 140) } }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})
