# AGENTS.md — Cortex Wiki Schema & Conventions

This file defines the structure, conventions, and workflows for the Cortex knowledge base.
You are the LLM maintaining this wiki. Follow these conventions precisely.

---

## Directory Structure

```
backend/data/
├── raw/                    # Immutable source documents (YOU READ, NEVER MODIFY)
│   └── {id}_{slug}.md      # Raw articles with YAML frontmatter
├── wiki/                   # LLM-maintained wiki (YOU OWN THIS)
│   ├── _index.md           # Master catalog — rebuild on every compile
│   ├── _log.md             # Append-only activity log — never edit past entries
│   ├── concepts/           # Concept articles (ideas, techniques, frameworks)
│   ├── entities/           # Entity articles (people, companies, products, tools)
│   ├── connections/        # Relationship articles linking two concepts/entities
│   └── insights/           # Q&A synthesis saved as wiki pages
└── output/                 # Miscellaneous generated files
```

---

## Frontmatter Schema

### Raw Source (`raw/*.md`)
```yaml
---
id: "{source_id}"
title: "{title}"
url: "{url}"
source_type: "web|file|note"
status: "pending|compiled"
tags: ["tag1", "tag2"]
entities: ["EntityName"]
domains: ["domain"]
ingested_at: "{iso_datetime}"
---
```

### Wiki Article (`wiki/{type}/{slug}.md`)
```yaml
---
id: "wiki_{slug}"
type: "concept|entity|connection|insight"
title: "{Human Readable Title}"
created: "{iso_datetime}"
updated: "{iso_datetime}"
sources: ["source_id_1", "source_id_2"]
tags: ["tag1", "tag2"]
backlinks: ["other-slug"]
---
```

---

## Cross-Reference Syntax

Use `[[slug]]` for all internal links. The slug must match the filename without `.md`.

**Examples:**
- `[[transformer-architecture]]` → links to `wiki/concepts/transformer-architecture.md`
- `[[openai]]` → links to `wiki/entities/openai.md`
- `[[transformer-to-rag]]` → links to `wiki/connections/transformer-to-rag.md`

When writing wiki articles, always add `[[wiki-links]]` for any concept, entity, or
connection that has its own page. This keeps the graph view healthy.

---

## `_index.md` Format

Rebuilt fully on every compile. Format:

```markdown
# Knowledge Base Index

*Last updated: {iso_datetime}*
*Total articles: {N}*

## Concepts

| Article | Summary | Tags | Sources |
|---------|---------|------|---------|
| [[slug]] | One-line summary | tag1, tag2 | 3 |

## Entities

| Article | Summary | Tags | Sources |
|---------|---------|------|---------|

## Connections

## Insights (Q&A)
```

When answering questions, **read `_index.md` first** to identify relevant articles,
then load those articles for synthesis.

---

## `_log.md` Format

Append-only. Never edit past entries. Format:

```
## [YYYY-MM-DD HH:MM] event_type | Title

- **key**: value
- **articles_created**: slug1, slug2
```

Event types: `ingest`, `compile`, `query`, `lint`, `insight`

---

## Workflows

### Ingest
When a new source arrives:
1. Read the source from `raw/`
2. Extract key concepts, entities, relationships
3. Discuss key takeaways (if interactive session)
4. Write a summary article to `wiki/concepts/` or `wiki/entities/`
5. Update `_index.md`
6. Update existing related articles with cross-references
7. Append to `_log.md`: `## [datetime] ingest | {title}`

### Compile
When compiling a source:
1. Generate concept/entity/connection articles
2. Scan existing wiki for related articles → update their `## Related Concepts`
3. Rebuild `_index.md` from scratch
4. Append to `_log.md`: `## [datetime] compile | {title}`

### Query
When answering a question:
1. Read `_index.md` to find relevant articles
2. Load those articles
3. Synthesize a comprehensive answer with `[[citations]]`
4. Offer to save the answer to `wiki/insights/`
5. If saved: append to `_log.md`: `## [datetime] insight | {question}`

### Lint
When running health checks:
1. Check for orphan articles (no backlinks)
2. Check for missing pages (wiki-links pointing to nonexistent articles)
3. Check for contradictions between articles
4. Check for stale articles (not updated in >30 days)
5. Suggest new questions to investigate
6. Append to `_log.md`: `## [datetime] lint | Health check — {N} issues`

---

## Naming Conventions

- **Slugs**: lowercase, hyphens, max 50 chars. `transformer-architecture`, `openai`, `rag-vs-wiki`
- **Concept slugs**: describe the idea. `retrieval-augmented-generation`, `attention-mechanism`
- **Entity slugs**: use the canonical name. `openai`, `andrej-karpathy`, `pytorch`
- **Connection slugs**: `{concept-a}-to-{concept-b}` or `{entity}-and-{concept}`
- **Insight slugs**: `qa-{question-slug}` e.g. `qa-what-is-rag`

---

## Quality Standards

- Every article must have at least 2 `[[wiki-links]]`
- Every concept article: Summary + Key Facts + Related Concepts + Sources sections
- Every entity article: Summary + Key Facts + Products/Work + Related Concepts + Sources
- Every connection article: explains the relationship, cites both sides, explains why it matters
- Keep summaries factual and concise (2-3 paragraphs max)
- Flag contradictions explicitly: "Note: This contradicts [[other-article]] which states..."
