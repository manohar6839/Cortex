# Cortex — AI-Powered Personal Knowledge Base

Cortex is a self-hosted web application that lets you build a personal, AI-maintained knowledge base from any source on the internet. Paste URLs (YouTube, GitHub, articles, PDFs) or upload files, and an LLM automatically extracts content, organizes it into a structured wiki of interlinked markdown articles, and serves as a research assistant for Q&A.

## Features

- **Content Ingestion**: Support for YouTube videos, GitHub repositories, PDFs, web articles, Reddit posts, and more
- **Wiki Compilation**: Automatically generate structured concept, entity, and connection articles from sources
- **Knowledge Graph**: Interactive force-directed visualization of your knowledge network
- **Q&A Engine**: Ask questions and get synthesized answers with citations
- **Health Monitoring**: Automated consistency checks and gap detection
- **Command Palette**: Quick navigation with Cmd+K
- **Dark Theme**: Modern, eye-friendly UI

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.11 |
| LLM | MiniMax 2.7 API (OpenAI-compatible) |
| Crawling | crawl4ai + Jina Reader fallback |
| Data | Local filesystem (markdown files) |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MiniMax API key

### Backend Setup

```bash
cd backend
cp config.yaml.example config.yaml  # Edit with your API keys
uv sync
uv run uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
Cortex/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings from config.yaml
│   ├── requirements.txt
│   ├── routers/             # API endpoints
│   │   ├── ingest.py        # URL/file ingestion
│   │   ├── compile.py      # Wiki compilation (SSE streaming)
│   │   ├── wiki.py         # Wiki browsing
│   │   ├── qa.py           # Q&A engine
│   │   ├── search.py       # TF-IDF search
│   │   ├── lint.py          # Health checks
│   │   ├── graph.py         # Knowledge graph
│   │   └── stats.py        # Dashboard stats
│   ├── services/
│   │   ├── extractors/     # Content extraction
│   │   │   ├── youtube.py
│   │   │   ├── github.py
│   │   │   ├── pdf.py
│   │   │   └── web.py       # crawl4ai + Jina
│   │   ├── compiler.py      # Wiki compilation
│   │   ├── qa_engine.py     # Q&A synthesis
│   │   ├── lint_engine.py   # Health checks
│   │   └── llm.py           # MiniMax API
│   └── data/
│       ├── raw/             # Ingested sources
│       ├── wiki/            # Compiled wiki
│       │   ├── concepts/
│       │   ├── entities/
│       │   ├── connections/
│       │   └── insights/
│       └── output/
├── frontend/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx        # Dashboard
│   │   ├── ingest/         # Content ingestion
│   │   ├── wiki/           # Wiki browser
│   │   ├── graph/          # Knowledge graph
│   │   ├── ask/            # Q&A interface
│   │   └── health/         # Health dashboard
│   └── components/          # UI components
├── config.yaml             # Configuration
├── AGENTS.md              # LLM agent conventions
└── README.md
```

## API Endpoints

### Content Ingestion
- `POST /api/ingest/url` — Ingest from URL
- `POST /api/ingest/upload` — Upload PDF files
- `POST /api/ingest/note` — Create quick note

### Wiki
- `GET /api/wiki/tree` — Get article tree
- `GET /api/wiki/article/{path}` — Get article with backlinks
- `GET /api/wiki/index` — Get master index

### Compilation
- `POST /api/compile` — Compile pending sources (SSE streaming)

### Q&A
- `POST /api/qa` — Ask question (SSE streaming with research progress)

### Health
- `POST /api/lint` — Run health checks
- `POST /api/lint/fix` — Auto-fix issue

### Graph
- `GET /api/graph` — Get graph data (nodes + edges)

### Search
- `GET /api/search?q=` — TF-IDF search

## Configuration

Edit `config.yaml`:

```yaml
llm:
  provider: "minimax"
  api_key: "your-api-key"
  base_url: "https://api.minimax.chat/v1"
  model: "MiniMax-2.7-API"

data_dir: "./backend/data"
port: 8000
```

## Data Format

### Raw Source
```yaml
---
id: "src_20260405_183042_7a6657"
type: "article"
source_url: "https://example.com/article"
title: "Article Title"
status: "pending"
tags: ["tag1", "tag2"]
---
Content here...
```

### Wiki Article
```yaml
---
id: "wiki_article-slug"
type: "concept"
title: "Article Title"
created: "2026-04-05T18:30:00"
updated: "2026-04-05T18:30:00"
sources: ["src_xxx"]
tags: ["tag1"]
backlinks: []
---

# Title

## Summary

Content...

## Key Facts

- Fact 1
- Fact 2

## Related Concepts

- [[other-article]]

## Sources

- [Source](../raw/src_xxx.md)
```

## Supported URL Types

| Platform | Extractor | Notes |
|----------|-----------|-------|
| YouTube | youtube-transcript-api | Transcript extraction |
| GitHub | GitHub REST API | README + metadata |
| PDF (URL) | pymupdf | Download + extract |
| PDF (upload) | pymupdf | Direct upload |
| Substack | crawl4ai + Jina | CSS selectors for article content |
| Medium | crawl4ai + Jina | Article body extraction |
| Reddit | Jina Reader | Post content |
| Web (generic) | crawl4ai → Jina fallback | Clean markdown |

## Commands

### Ingest a URL
```bash
curl -X POST http://localhost:8000/api/ingest/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=..."}'
```

### Compile Sources
```bash
curl -X POST http://localhost:8000/api/compile \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Run Health Check
```bash
curl -X POST http://localhost:8000/api/lint
```

### Ask a Question
```bash
curl -X POST http://localhost:8000/api/qa \
  -H "Content-Type: application/json" \
  -d '{"question": "What is RAG?"}'
```

## Development

### Run Backend Tests
```bash
cd backend
uv run pytest
```

### Run Frontend Dev
```bash
cd frontend
npm run dev
```

## Known Limitations

- LLM content generation quality depends on MiniMax API responses
- Web scraping may fail for sites with heavy JavaScript rendering (crawl4ai recommended)
- Some articles may be generated as stubs if LLM returns minimal content

## License

MIT
