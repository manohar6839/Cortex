"""Wiki compiler service - generates wiki articles from raw sources."""
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from ..config import config
from .llm import llm_service
from .log_service import append_log


async def compile_source(source_id: str, source_path: Path, force: bool = False) -> dict[str, Any]:
    """Compile a single raw source into wiki articles."""
    # Check if already compiled
    if not force:
        content = source_path.read_text()
        fm_match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
        if fm_match:
            fm_text = fm_match.group(1)
            if 'status: "compiled"' in fm_text or "status: compiled" in fm_text:
                return {"status": "already_compiled", "source_id": source_id}

    # Read source content
    content = source_path.read_text()
    fm_match = re.match(r"^---\n(.*?)\n---\n(.*)", content, re.DOTALL)
    if not fm_match:
        return {"status": "error", "message": "Invalid source format"}

    fm_text, body = fm_match.groups()
    fm = _parse_frontmatter(fm_text)

    # Read current index for context
    index_path = config.wiki_dir / "_index.md"
    index_content = index_path.read_text() if index_path.exists() else ""

    # Read taxonomy
    taxonomy_path = config.wiki_dir / "_taxonomy.md"
    taxonomy_content = taxonomy_path.read_text() if taxonomy_path.exists() else ""

    # Generate wiki content via LLM
    wiki_articles = await _generate_wiki_articles(
        source_id=source_id,
        source_title=fm.get("title", ""),
        source_content=body,
        source_tags=fm.get("tags", []),
        source_entities=fm.get("entities", []),
        index_content=index_content,
        taxonomy_content=taxonomy_content,
        source_path=source_path,
    )

    # Save articles (merge with existing if slug already exists)
    created_articles = []
    updated_articles = []
    for article in wiki_articles:
        article_path = _get_article_path(article["type"], article["slug"])
        article_path.parent.mkdir(parents=True, exist_ok=True)

        if article_path.exists():
            # Merge: update sources + updated timestamp, append new related links
            _merge_wiki_article(article_path, article, source_id)
            updated_articles.append(str(article_path.relative_to(config.wiki_dir)))
        else:
            article_content = _format_wiki_article(article)
            article_path.write_text(article_content)
            created_articles.append(str(article_path.relative_to(config.wiki_dir)))

    all_touched = created_articles + updated_articles

    # Update cross-references in related existing articles
    await _update_cross_references(wiki_articles, source_id)

    # Rebuild index from scratch using LLM
    await _rebuild_index(index_path)

    # Update taxonomy
    await _update_taxonomy(taxonomy_path, fm)

    # Mark source as compiled
    _mark_source_compiled(source_path)

    # Log the compile event
    append_log(
        event_type="compile",
        title=fm.get("title", source_id),
        details={
            "source_id": source_id,
            "articles_created": len(created_articles),
            "articles_updated": len(updated_articles),
            "articles": ", ".join(Path(a).stem for a in all_touched[:5]),
        },
    )

    return {
        "status": "compiled",
        "source_id": source_id,
        "articles_created": created_articles,
        "articles_updated": updated_articles,
    }


async def compile_all(force: bool = False) -> dict[str, Any]:
    """Compile all pending sources."""
    pending_sources = []
    for file_path in config.raw_dir.rglob("*.md"):
        if file_path.name == "_sources.md":
            continue
        content = file_path.read_text()
        if 'status: "pending"' in content or "status: pending" in content:
            pending_sources.append(file_path)

    results = []
    for source_path in pending_sources:
        source_id = _get_source_id(source_path)
        result = await compile_source(source_id, source_path, force=force)
        results.append(result)

    return {
        "total": len(pending_sources),
        "compiled": sum(1 for r in results if r["status"] == "compiled"),
        "already_compiled": sum(1 for r in results if r["status"] == "already_compiled"),
        "errors": sum(1 for r in results if r["status"] == "error"),
        "results": results,
    }


async def _generate_wiki_articles(
    source_id: str,
    source_title: str,
    source_content: str,
    source_tags: list[str],
    source_entities: list[str],
    index_content: str,
    taxonomy_content: str,
    source_path: Path | None = None,
) -> list[dict[str, Any]]:
    """Generate wiki articles from a raw source using LLM."""

    system_prompt = """You are a research wiki compiler for a personal knowledge base.
You write structured markdown articles with [[wiki-links]] for cross-references.

For each source, you will:
1. Identify key concepts and create/update concept articles
2. Identify entities (companies, people, products) and create/update entity articles
3. Create connection articles that link related concepts
4. Generate cross-references using [[wiki-link]] syntax

Return a JSON array of articles to create/update. Each article has:
- type: "concept", "entity", or "connection"
- slug: URL-safe identifier (lowercase, hyphens, max 50 chars)
- title: Human-readable title
- summary: 2-3 paragraph summary
- key_facts: Array of specific facts
- related_links: Array of [[wiki-link]] references to other articles
- sources: Array of source IDs
- tags: Array of tags

Keep articles focused and modular. Use existing article slugs when updating.
Always include at least 2 [[wiki-links]] per article."""

    content_preview = source_content[:8000]

    user_prompt = f"""Source: {source_title}
Source ID: {source_id}

Tags: {', '.join(source_tags)}
Entities: {', '.join(source_entities)}

Content:
{content_preview}

Current wiki index (use slug names from here for cross-references):
{index_content[:2000]}

Generate the wiki articles. Return as JSON array."""

    try:
        articles = await llm_service.complete_json(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.5,
        )

        if isinstance(articles, dict) and "articles" in articles:
            result_articles = articles["articles"]
        elif isinstance(articles, list):
            result_articles = articles
        else:
            result_articles = []

        # Add source relative path and correct source ID to each article
        source_rel = str(source_path.relative_to(config.wiki_dir.parent)) if source_path else source_id
        for article in result_articles:
            article["source_relative_path"] = source_rel
            article["sources"] = [source_id]  # Always use actual source ID, not LLM hallucination

        return result_articles

    except Exception as e:
        print(f"Wiki generation failed: {e}")
        slug = _slugify(source_title)
        source_rel = str(source_path.relative_to(config.wiki_dir.parent)) if source_path else source_id
        return [{
            "type": "concept",
            "slug": slug,
            "title": source_title,
            "summary": f"Concept derived from {source_title}.",
            "key_facts": [],
            "related_links": [],
            "sources": [source_id],
            "source_relative_path": source_rel,
            "tags": source_tags,
        }]


async def _update_cross_references(new_articles: list[dict], source_id: str) -> None:
    """Update existing wiki articles with cross-references to newly compiled articles."""
    if not new_articles:
        return

    new_slugs = {a["slug"]: a["title"] for a in new_articles}
    new_titles_lower = {a["title"].lower(): a["slug"] for a in new_articles}

    # Scan all existing articles for mentions of new slugs/titles
    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue
        if file_path.stem in new_slugs:
            continue  # Skip newly created articles themselves

        content = file_path.read_text()
        content_lower = content.lower()
        additions = []

        for title, slug in new_titles_lower.items():
            # Check if the concept is mentioned but not yet wiki-linked
            if title in content_lower and f"[[{slug}]]" not in content:
                additions.append(f"[[{slug}]]")

        if additions:
            # Append to Related Concepts section or add it
            if "## Related Concepts" in content:
                content = content.replace(
                    "## Related Concepts\n",
                    "## Related Concepts\n" + "".join(f"- {a}\n" for a in additions),
                )
            else:
                content += f"\n## Related Concepts\n\n" + "".join(f"- {a}\n" for a in additions)

            # Update the `updated` timestamp
            content = re.sub(
                r'updated: "[^"]*"',
                f'updated: "{datetime.now().isoformat()}"',
                content,
            )
            file_path.write_text(content)


async def _rebuild_index(index_path: Path) -> None:
    """Rebuild _index.md using LLM for intelligent structuring."""
    now = datetime.now().isoformat()

    # Collect all article data first
    sections: dict[str, list[dict]] = {
        "concepts": [],
        "entities": [],
        "connections": [],
        "insights": [],
    }

    total = 0
    for subdir in sections.keys():
        dir_path = config.wiki_dir / subdir
        if not dir_path.exists():
            continue
        for file_path in sorted(dir_path.glob("*.md")):
            content = file_path.read_text()
            slug = file_path.stem

            # Extract frontmatter
            fm_match = re.match(r"^---\n(.*?)\n---\n(.*)", content, re.DOTALL)
            tags: list[str] = []
            title = slug
            summary = ""
            sources_count = 0

            if fm_match:
                fm_text = fm_match.group(1)
                fm = _parse_frontmatter(fm_text)
                tags = fm.get("tags", [])
                title = fm.get("title", slug)
                sources_count = len(fm.get("sources", []))

                # Extract first meaningful paragraph as summary
                body = fm_match.group(2)
                for line in body.splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and not line.startswith("-"):
                        summary = line[:150]
                        break

            sections[subdir].append({
                "slug": slug,
                "title": title,
                "summary": summary,
                "tags": tags,
                "sources_count": sources_count,
            })
            total += 1

    # Use LLM to generate a clean, well-organized index
    try:
        index_content = await _llm_generate_index(sections, total, now)
    except Exception as e:
        print(f"LLM index generation failed, using fallback: {e}")
        index_content = _fallback_index(sections, total, now)

    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(index_content)


async def _llm_generate_index(sections: dict[str, list[dict]], total: int, now: str) -> str:
    """Use LLM to generate a clean, structured index."""
    system_prompt = """You are a knowledge base curator. Generate a clean, well-organized index for a wiki.
Create a concise summary for each article based on its existing summary.
Group related articles logically within each section.
The index should be scannable and informative."""

    # Prepare article data for LLM
    article_data = []
    for section_type, articles in sections.items():
        for article in articles:
            article_data.append({
                "section": section_type,
                "slug": article["slug"],
                "title": article["title"],
                "summary": article["summary"],
                "tags": article["tags"],
                "sources_count": article["sources_count"],
            })

    user_prompt = f"""Generate a clean wiki index for {total} articles.

Sections: concepts, entities, connections, insights
Current time: {now}

Articles:
{article_data[:50]}  # Limit to first 50 for prompt size

Format the index as:
1. Header with total count and timestamp
2. Sections for each type
3. Each entry: | [[slug]] | one-line summary | tags | sources |

Make summaries concise but informative (max 100 chars)."""

    try:
        result = await llm_service.complete(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.3,
        )
        return f"# Knowledge Base Index\n\n*Last updated: {now}*\n*Total articles: {total}*\n\n{result}"
    except Exception as e:
        raise e


def _fallback_index(sections: dict[str, list[dict]], total: int, now: str) -> str:
    """Fallback naive index generation."""
    lines = [
        "# Knowledge Base Index\n",
        f"\n*Last updated: {now}*\n",
        f"*Total articles: {total}*\n",
    ]

    section_labels = {
        "concepts": "Concepts",
        "entities": "Entities",
        "connections": "Connections",
        "insights": "Insights (Q&A)",
    }

    for key, label in section_labels.items():
        articles = sections[key]
        lines.append(f"\n## {label}\n")
        if articles:
            lines.append("\n| Article | Summary | Tags | Sources |\n")
            lines.append("|---------|---------|------|--------|\n")
            for article in articles:
                tag_str = ", ".join(article["tags"][:3]) if article["tags"] else "—"
                lines.append(f"| [[{article['slug']}]] | {article['summary'] or '—'} | {tag_str} | {article['sources_count']} |\n")
        else:
            lines.append("\n*No articles yet.*\n")

    return "".join(lines)


async def _update_taxonomy(taxonomy_path: Path, source_fm: dict) -> None:
    """Update the wiki taxonomy (tag registry)."""
    tags = source_fm.get("tags", [])

    if not taxonomy_path.exists():
        content = f"# Taxonomy\n\n*Last updated: {datetime.now().isoformat()}*\n\n## Tags\n\n"
    else:
        content = taxonomy_path.read_text()

    for tag in tags:
        if f"- {tag}" not in content:
            content += f"- {tag}\n"

    taxonomy_path.write_text(content)


def _merge_wiki_article(article_path: Path, new_data: dict, source_id: str) -> None:
    """Merge new source data into an existing wiki article."""
    content = article_path.read_text()

    # Add source_id to sources list in frontmatter
    content = re.sub(
        r"(sources: \[)([^\]]*?)(\])",
        lambda m: m.group(1) + (m.group(2).rstrip() + f", \"{source_id}\"" if m.group(2).strip() else f'"{source_id}"') + m.group(3),
        content,
        count=1,
    )

    # Update timestamp
    content = re.sub(
        r'updated: "[^"]*"',
        f'updated: "{datetime.now().isoformat()}"',
        content,
    )

    # Append any new key facts not already present
    for fact in new_data.get("key_facts", []):
        if fact and fact not in content:
            if "## Key Facts" in content:
                content = content.replace("## Key Facts\n", f"## Key Facts\n- {fact}\n", 1)

    article_path.write_text(content)


def _get_article_path(article_type: str, slug: str) -> Path:
    """Get path for a wiki article."""
    if article_type == "concept":
        return config.wiki_dir / "concepts" / f"{slug}.md"
    elif article_type == "entity":
        return config.wiki_dir / "entities" / f"{slug}.md"
    elif article_type == "connection":
        return config.wiki_dir / "connections" / f"{slug}.md"
    elif article_type == "insight":
        return config.wiki_dir / "insights" / f"{slug}.md"
    else:
        return config.wiki_dir / "concepts" / f"{slug}.md"


def _format_wiki_article(article: dict) -> str:
    """Format a wiki article with frontmatter."""
    now = datetime.now().isoformat()
    sources_list = article.get("sources", [])
    tags_list = article.get("tags", [])

    frontmatter = f"""---
id: "wiki_{article['slug']}"
type: "{article['type']}"
title: "{article['title']}"
created: "{now}"
updated: "{now}"
sources: {sources_list}
tags: {tags_list}
backlinks: []
---

"""

    body = f"# {article['title']}\n\n"
    body += f"## Summary\n\n{article.get('summary', '')}\n\n"

    if article.get("key_facts"):
        body += "## Key Facts\n\n"
        for fact in article["key_facts"]:
            body += f"- {fact}\n"
        body += "\n"

    if article.get("related_links"):
        body += "## Related Concepts\n\n"
        for link in article["related_links"]:
            body += f"- {link}\n"
        body += "\n"

    if article.get("sources"):
        body += "## Sources\n\n"
        for i, source in enumerate(article["sources"]):
            source_rel = article.get("source_relative_path", source)
            body += f"- [{source}](../{source_rel})\n"
        body += "\n"

    return frontmatter + body


def _mark_source_compiled(source_path: Path) -> None:
    """Mark a source as compiled in its frontmatter."""
    content = source_path.read_text()
    content = content.replace('status: "pending"', 'status: "compiled"')
    content = content.replace("status: pending", "status: compiled")
    source_path.write_text(content)


def _parse_frontmatter(fm_text: str) -> dict[str, Any]:
    """Parse YAML frontmatter."""
    fm: dict[str, Any] = {}
    for line in fm_text.split("\n"):
        if ": " in line:
            key, value = line.split(": ", 1)
            value = value.strip().strip('"')
            if key in ("tags", "entities", "domains", "key_facts", "sources", "backlinks"):
                try:
                    fm[key] = eval(value) if value else []
                except Exception:
                    fm[key] = []
            else:
                fm[key] = value
    return fm


def _get_source_id(path: Path) -> str:
    """Extract source ID from path."""
    return path.name.split("_")[0]


def _slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:50]
