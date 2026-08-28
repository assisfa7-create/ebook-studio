const API_BASE = 'https://api.anthropic.com/v1'
const VERSION = '2023-06-01'

function headers(key) {
  return {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': VERSION
  }
}

async function withRetry(fn) {
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (err) {
      const status = err.status || 0
      const retryable = status === 429 || status === 529 || (status >= 500 && status < 600)
      if (retryable && attempt < 2) {
        await new Promise(r => setTimeout(r, [1000, 4000][attempt]))
        attempt++
        continue
      }
      throw err
    }
  }
}

async function parseError(res) {
  let detail = ''
  try {
    const body = await res.json()
    detail = body.error && body.error.message ? body.error.message : JSON.stringify(body)
  } catch (_) {}
  const err = new Error(`API ${res.status}: ${detail || res.statusText}`)
  err.status = res.status
  return err
}

class Claude {
  constructor(key) {
    this.key = key
  }

  async listModels() {
    const res = await fetch(`${API_BASE}/models?limit=50`, { headers: headers(this.key) })
    if (!res.ok) throw await parseError(res)
    const body = await res.json()
    return (body.data || []).map(m => ({ id: m.id, name: m.display_name }))
  }

  async check() {
    const res = await fetch(`${API_BASE}/models?limit=1`, { headers: headers(this.key) })
    if (!res.ok) throw await parseError(res)
    return true
  }

  async complete({ model, system, messages, maxTokens = 4000, temperature = 0.8, onChunk }) {
    const payload = {
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages,
      stream: true
    }
    const res = await withRetry(async () => {
      const r = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: headers(this.key),
        body: JSON.stringify(payload)
      })
      if (!r.ok) throw await parseError(r)
      return r
    })

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    let full = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const events = buf.split('\n\n')
      buf = events.pop()
      for (const evt of events) {
        const line = evt.split('\n').find(l => l.startsWith('data:'))
        if (!line) continue
        let data
        try { data = JSON.parse(line.slice(5).trim()) } catch (_) { continue }
        if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'text_delta') {
          full += data.delta.text
          if (onChunk) onChunk(data.delta.text)
        } else if (data.type === 'error') {
          throw new Error(data.error ? data.error.message : 'Erro na API')
        }
      }
    }
    return full
  }
}

function extractJson(text) {
  let clean = text.trim()
  const fence = clean.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) clean = fence[1].trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Resposta sem JSON valido')
  return JSON.parse(clean.slice(start, end + 1))
}

function extractSvg(text) {
  const match = text.match(/<svg[\s\S]*?<\/svg>/i)
  if (!match) throw new Error('SVG nao encontrado na resposta')
  return match[0]
}

module.exports = { Claude, extractJson, extractSvg }
