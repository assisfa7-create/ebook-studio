const { marked } = require('marked')
const JSZip = require('jszip')
const fs = require('fs')
const fsp = fs.promises

marked.setOptions({ gfm: true, breaks: false })

const esc = s =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const md = s => marked.parse(String(s || ''))

function sanitizeSvg(svg) {
  return String(svg || '').replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;')
}

function injectImages(html, images = []) {
  if (!html || !html.includes('img:')) return html
  const map = new Map(images.map(im => [im.id, im]))
  return html.replace(/<img src="img:([a-zA-Z0-9]+)"[^>]*>/g, (_m, id) => {
    const im = map.get(id)
    if (!im) return ''
    const cap = im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''
    return `<figure class="illustration">${sanitizeSvg(im.svg)}${cap}</figure>`
  })
}

const css = `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #1c1917; background: #fff; }
  .page { page-break-after: always; padding: 60px 55px; }
  .page.cover { padding: 0; page-break-after: always; }
  .page.cover svg { width: 100%; height: 100vh; display: block; }
  .titlepage { display: flex; flex-direction: column; justify-content: center; text-align: center; }
  .titlepage h1 { font-size: 34px; margin: 0 0 10px; letter-spacing: -0.5px; }
  .titlepage h2 { font-size: 18px; font-weight: normal; color: #57534e; margin: 0 0 40px; }
  .titlepage .author { font-size: 16px; color: #78716c; margin-top: auto; padding-top: 40px; }
  .toc h2 { font-size: 26px; margin-bottom: 28px; }
  .toc ol { padding-left: 22px; line-height: 2.1; font-size: 15px; }
  h1.chap { font-size: 26px; margin: 0 0 6px; letter-spacing: -0.3px; }
  .chap-number { font-size: 13px; letter-spacing: 2.5px; text-transform: uppercase; color: #a8a29e; margin-bottom: 4px; }
  .chap-rule { border: none; border-top: 2px solid #d6d3d1; margin: 18px 0 26px; width: 64px; margin-left: 0; }
  h2 { font-size: 19px; margin: 28px 0 10px; }
  h3 { font-size: 16px; margin: 22px 0 8px; }
  p { font-size: 15px; line-height: 1.75; margin: 0 0 14px; text-align: justify; }
  ul, ol { font-size: 15px; line-height: 1.7; }
  blockquote { border-left: 3px solid #d6d3d1; margin: 18px 0; padding: 4px 18px; color: #57534e; font-style: italic; }
  code { font-family: Consolas, monospace; background: #f5f5f4; padding: 1px 5px; border-radius: 3px; font-size: 13px; }
  .illustration { margin: 26px 0; page-break-inside: avoid; }
  .illustration svg { width: 100%; height: auto; display: block; border-radius: 6px; }
  .illustration figcaption { font-size: 12.5px; color: #78716c; text-align: center; margin-top: 8px; font-style: italic; }
`

function coverPageSvg(project) {
  if (project.cover && project.cover.svg) return project.cover.svg
  const t = esc(project.title)
  const s = esc(project.subtitle)
  const a = esc(project.author)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 2560"><rect width="1600" height="2560" fill="#111114"/><rect x="120" y="880" width="620" height="8" fill="#f59e0b"/><text x="120" y="1080" font-family="Georgia, serif" font-size="150" fill="#fafaf9">${t}</text><text x="120" y="1180" font-family="Georgia, serif" font-size="52" fill="#d6d3d1">${s}</text><text x="120" y="2380" font-family="Arial, sans-serif" font-size="44" fill="#a8a29e">${a}</text></svg>`
}

function bookHtml(project) {
  const images = project.images || []
  const chapters = project.chapters.map((c, i) => {
    const body = c.content ? injectImages(md(c.content), images) : '<p><em>(Capitulo ainda nao gerado)</em></p>'
    return `<div class="page"><div class="chap-number">Capitulo ${i + 1}</div><h1 class="chap">${esc(c.title)}</h1><hr class="chap-rule"/>${body}</div>`
  }).join('\n')

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(project.title)}</title><style>${css}</style></head><body>
  <div class="page cover">${coverPageSvg(project)}</div>
  <div class="page titlepage"><h1>${esc(project.title)}</h1><h2>${esc(project.subtitle)}</h2><div class="author">${esc(project.author)}</div></div>
  <div class="page toc"><h2>Sumario</h2><ol>${project.chapters.map(c => `<li>${esc(c.title)}</li>`).join('')}</ol></div>
  ${chapters}
  </body></html>`
}

async function exportPdf(win, filePath, project) {
  const html = bookHtml(project)
  const tmp = require('path').join(require('os').tmpdir(), 'ebook-export.html')
  await fsp.writeFile(tmp, html, 'utf8')
  const w = new BrowserWindow(win, { show: false })
  await w.loadFile(tmp)
  const buf = await w.webContents.printToPDF({
    printBackground: true,
    pageSize: { width: 6, height: 9 },
    margins: { top: 0, bottom: 0, left: 0, right: 0 }
  })
  await fsp.writeFile(filePath, buf)
  w.destroy()
  await fsp.rm(tmp, { force: true })
}

function BrowserWindow(_win, opts) {
  const { BrowserWindow: BW } = require('electron')
  return new BW({ show: false, ...opts })
}

function epubXhtml(project) {
  const chapters = project.chapters.map((c, i) => ({
    id: 'chap' + (i + 1),
    file: 'chap' + (i + 1) + '.xhtml',
    title: c.title,
    content: c.content || ''
  }))
  const lang = 'pt-BR'
  const chapterDoc = (title, number, inner) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}"><head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body>
${number ? `<p class="chap-number">Capitulo ${number}</p>` : ''}
<h1${number ? ' class="chap"' : ''}>${esc(title)}</h1>
${inner}</body></html>`

  return { chapters, chapterDoc, lang }
}

async function exportEpub(filePath, project) {
  const zip = new JSZip()
  const { chapters, chapterDoc } = epubXhtml(project)
  const uuid = 'urn:uuid:' + project.id + '-ebook-studio'

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)

  zip.file('OEBPS/styles.css', css.replace('@page { margin: 0; }', ''))

  zip.file('OEBPS/cover.xhtml', chapterDoc(project.title, null, coverPageSvg(project)))

  for (const c of chapters) {
    const num = chapters.indexOf(c) + 1
    const img = project.images || []
    const body = injectImages(md(c.content || ''), img) || '<p><em>A gerar</em></p>'
    zip.file('OEBPS/' + c.file, chapterDoc(c.title, num, body))
  }

  const nav = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR"><head><meta charset="utf-8"/><title>Sumario</title></head>
<body><nav epub:type="toc" id="toc"><h1>Sumario</h1><ol>
<li><a href="cover.xhtml">Capa</a></li>
${chapters.map((c, i) => `<li><a href="${c.file}">${i + 1}. ${esc(c.title)}</a></li>`).join('\n')}
</ol></nav></body></html>`
  zip.file('OEBPS/nav.xhtml', nav)

  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${esc(project.title)}</dc:title>
    <dc:creator>${esc(project.author || 'Autor')}</dc:creator>
    <dc:language>pt-BR</dc:language>
    <dc:description>${esc(project.blurb || '')}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    ${chapters.map((c, i) => `<item id="c${i + 1}" href="${c.file}" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine>
    <itemref idref="cover"/>
    ${chapters.map((c, i) => `<itemref idref="c${i + 1}"/>`).join('\n    ')}
  </spine>
</package>`
  zip.file('OEBPS/content.opf', opf)

  const buf = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' })
  await fsp.writeFile(filePath, buf)
}

async function exportHtml(filePath, project) {
  await fsp.writeFile(filePath, bookHtml(project), 'utf8')
}

async function exportMarkdown(filePath, project) {
  const parts = []
  parts.push(`# ${project.title}`)
  if (project.subtitle) parts.push(`## ${project.subtitle}`)
  if (project.author) parts.push(`**${project.author}**`)
  parts.push('\n---\n')
  parts.push('## Sumario\n')
  project.chapters.forEach((c, i) => parts.push(`${i + 1}. ${c.title}`))
  parts.push('\n---\n')
  project.chapters.forEach((c, i) => {
    parts.push(`\n# ${i + 1}. ${c.title}\n`)
    parts.push(c.content || '_(capitulo nao gerado)_')
  })
  await fsp.writeFile(filePath, parts.join('\n'), 'utf8')
}

module.exports = { exportPdf, exportEpub, exportHtml, exportMarkdown }
