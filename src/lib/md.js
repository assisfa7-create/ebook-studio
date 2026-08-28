import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: false })

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function injectImages(html, images = []) {
  if (!html.includes('img:')) return html
  const map = new Map(images.map(im => [im.id, im]))
  return html.replace(/<img src="img:([a-zA-Z0-9]+)"[^>]*>/g, (_m, id) => {
    const im = map.get(id)
    if (!im) return ''
    const cap = im.caption ? `<figcaption>${escapeHtml(im.caption)}</figcaption>` : ''
    return `<figure class="illustration">${im.svg}${cap}</figure>`
  })
}

export function mdToHtml(mdString, images = []) {
  if (!mdString) return ''
  return injectImages(marked.parse(mdString), images)
}
