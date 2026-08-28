# Ebook Studio

Aplicativo desktop (Windows) para criacao de e-books completos com IA (Claude):
estrutura, capitulos escritos em Markdown, capa vetorial e exportacao em PDF,
EPUB, HTML e Markdown.

## Requisitos

- Node.js 18+
- Provedor de IA (escolha nas Configuracoes do app):
  * **Claude (API)**: API key com creditos de console.anthropic.com.
    A assinatura Claude Pro nao inclui uso de API; a API e cobrada a parte, por uso.
  * **Ollama (local)**: gratis e offline. Instale o Ollama (ollama.com), deixe-o
    rodando (`ollama serve`) e baixe um modelo, ex.: `ollama pull qwen3:14b`.
    Modelos locais sao bem mais lentos e imprecisos que o Claude para capitulos
    longos, capas SVG e JSON estruturado.

## Como rodar

```
npm install
npm start
```

Na primeira execucao, abra **Configuracoes** e cole sua API key.

## Fluxo

1. **Novo e-book** -> tema, publico, tom, numero e tamanho de capitulos.
2. A IA gera a **estrutura completa** (titulo, subtitulo, capitulos e pontos-chave).
3. Revise e ajuste os titulos, depois **crie o e-book**.
4. Gere capitulo por capitulo ou **todos de uma vez** (com streaming em tempo real).
5. Na aba **Capa**, escolha um entre **12 estilos visuais** e gere a arte vetorial.
6. Use o botao de **ilustracao** no capitulo para a IA criar graficos internos,
   que aparecem no preview, no PDF e no EPUB automaticamente.
7. **Exportar**: PDF diagramado 6x9, EPUB, HTML ou Markdown.

## Instalador Windows

```
npm run dist
```

Gera `release\EbookStudio-Setup-1.0.0.exe`, instalador NSIS com atalho na
area de trabalho.

## Mapa do codigo (para continuar o desenvolvimento)

| O que | Arquivo |
|---|---|
| Telas e componentes da interface | `src/components/` |
| Cores, fontes e visual geral | `src/styles.css` |
| Prompts da IA (estrutura, capitulos, capa, ilustracoes) | `electron/main.js` |
| Provedores de IA (Anthropic + Ollama) | `electron/claude.js` |
| Exportacao (PDF, EPUB, HTML, MD) | `electron/exporter.js` |
| Ponte interface <-> sistema | `electron/preload.js` |

## Migrar para outro computador

1. Copie a pasta inteira do projeto (pen drive, OneDrive, GitHub...).
   A pasta `node_modules` pode ficar de fora, nao e necessaria.
2. Instale o Node.js LTS (nodejs.org) na maquina nova.
3. Na pasta do projeto rode:

```
npm install
npm start        <- roda o app
npm run dist     <- gera o instalador .exe
```

## Tech

Electron + React + Vite + Tailwind CSS 4, API Anthropic com streaming SSE,
geracao de EPUB propria (JSZip) e PDF via printToPDF.
