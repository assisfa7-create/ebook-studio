const http = require('http')
const { Ollama, extractJson } = require('./electron/claude')

const server = http.createServer((req, res) => {
  if (req.url === '/api/tags') {
    res.end(JSON.stringify({ models: [{ name: 'qwen3:14b' }] }))
    return
  }
  if (req.url === '/api/chat') {
    res.setHeader('content-type', 'application/x-ndjson')
    const parts = ['Co', 'nando', ' ', 'um', ' livro']
    for (const p of parts) res.write(JSON.stringify({ message: { content: p }, done: false }) + '\n')
    res.end(JSON.stringify({ message: { content: '' }, done: true }))
  }
})

server.listen(11499, async () => {
  const ollama = new Ollama('http://localhost:11499')
  const models = await ollama.listModels()
  console.log('models:', JSON.stringify(models))

  let streamed = ''
  const text = await ollama.complete({
    model: 'qwen3:14b',
    messages: [{ role: 'user', content: 'oi' }],
    onChunk: t => { streamed += t }
  })
  console.log('streamed:', JSON.stringify(streamed))
  console.log('final:', JSON.stringify(text))

  const bad = 'Aqui esta o JSON:\n```json\n{"title": "Livro", "svg": "<svg>&</svg>"}\n```'
  const j = extractJson(bad)
  console.log('extractJson com fence e thinking:', JSON.stringify(j))

  const ok =
    models.length === 1 &&
    streamed === 'Conando um livro' &&
    text === 'Conando um livro' &&
    j.title === 'Livro'
  console.log(ok ? 'TESTE OK' : 'TESTE FALHOU')
  server.close()
  process.exit(ok ? 0 : 1)
})
