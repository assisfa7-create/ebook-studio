const ANTHROPIC_BASE = 'https://api.anthropic.com/v1'
const ANTHROPIC_VERSION = '2023-06-01'

function anthropicHeaders(key) {
  return {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': ANTHROPIC_VERSION
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

function stripThinking(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

class Claude {
  constructor(key) {
    this.key = key
  }

  async listModels() {
    const res = await fetch(`${ANTHROPIC_BASE}/models?limit=50`, { headers: anthropicHeaders(this.key) })
    if (!res.ok) throw await parseError(res)
    const body = await res.json()
    return (body.data || []).map(m => ({ id: m.id, name: m.display_name }))
  }

  async check() {
    const res = await fetch(`${ANTHROPIC_BASE}/models?limit=1`, { headers: anthropicHeaders(this.key) })
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
      const r = await fetch(`${ANTHROPIC_BASE}/messages`, {
        method: 'POST',
        headers: anthropicHeaders(this.key),
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

class Ollama {
  constructor(baseUrl) {
    this.base = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '')
  }

  async listModels() {
    let res
    try {
      res = await fetch(`${this.base}/api/tags`)
    } catch (err) {
      throw friendlyConnectionError(err)
    }
    if (!res.ok) throw new Error(`Ollama respondeu ${res.status}`)
    const body = await res.json()
    return (body.models || []).map(m => ({ id: m.name, name: m.name }))
  }

  async check() {
    const models = await this.listModels()
    if (!models.length) {
      throw new Error('O Ollama esta rodando, mas sem modelos instalados. Rode: ollama pull qwen3:14b')
    }
    return true
  }

  async complete({ model, system, messages, maxTokens = 4000, temperature = 0.8, onChunk, jsonMode }) {
    const all = system ? [{ role: 'system', content: system }, ...messages] : messages
    let res
    try {
      res = await fetch(`${this.base}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: all,
          stream: true,
          ...(jsonMode ? { format: 'json' } : {}),
          options: { temperature, num_predict: maxTokens, num_ctx: 16384 }
        })
      })
    } catch (err) {
      throw friendlyConnectionError(err)
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      let msg = `Ollama ${res.status}`
      try { msg += ': ' + JSON.parse(txt).error } catch (_) { if (txt) msg += ': ' + txt.slice(0, 200) }
      if (/not found/i.test(txt)) msg += ` - instale com: ollama pull ${model}`
      throw new Error(msg)
    }

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    let full = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        const t = line.trim()
        if (!t) continue
        let j
        try { j = JSON.parse(t) } catch (_) { continue }
        if (j.error) throw new Error('Ollama: ' + j.error)
        const piece = j.message && j.message.content
        if (piece) {
          full += piece
          if (onChunk) onChunk(piece)
        }
        if (j.done && j.done_reason === 'error') throw new Error('Ollama: geracao interrompida')
      }
    }
    return stripThinking(full)
  }
}

function friendlyConnectionError(err) {
  const code = err && err.cause ? err.cause.code : ''
  if (code === 'ECONNREFUSED' || /ECONNREFUSED|fetch failed/i.test(String(err.message || err))) {
    return new Error('Nao foi possivel conectar ao Ollama. Ele esta aberto? Rode "ollama serve" e verifique a URL.')
  }
  return err
}

function extractJson(text) {
  let clean = stripThinking(text).trim()
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

module.exports = { Claude, Ollama, extractJson, extractSvg }
