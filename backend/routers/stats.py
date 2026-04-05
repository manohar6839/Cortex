"""Stats router - dashboard statistics."""
from pathlib import Path

from fastapi import APIRouter

from ..config import config

router = APIRouter()


@router.get("")
async def get_stats():
    """Get dashboard statistics."""
    # Count sources
    sources_count = 0
    pending_sources = 0
    compiled_sources = 0

    for file_path in config.raw_dir.rglob("*.md"):
        if file_path.name == "_sources.md":
            continue
        sources_count += 1

        content = file_path.read_text()
        if 'status: "pending"' in content or "status: pending" in content:
            pending_sources += 1
        elif 'status: "compiled"' in content or "status: compiled" in content:
            compiled_sources += 1

    # Count wiki articles
    concepts_count = len(list((config.wiki_dir / "concepts").glob("*.md")))
    entities_count = len(list((config.wiki_dir / "entities").glob("*.md")))
    connections_count = len(list((config.wiki_dir / "connections").glob("*.md")))
    total_articles = concepts_count + entities_count + connections_count

    # Count outputs
    outputs_count = len(list(config.output_dir.glob("*.md")))

    # Get tag counts
    tags: dict[str, int] = {}
    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue
        content = file_path.read_text()

        # Look for tags in frontmatter or body
        import re
        tag_matches = re.findall(r"(?:tags?:?\s*)\[([^\]]+)\]", content, re.IGNORECASE)
        for match in tag_matches:
            for tag in match.split(","):
                tag = tag.strip().strip("'\"")
                if tag:
                    tags[tag] = tags.get(tag, 0) + 1

    # Top domains
    top_tags = sorted(tags.items(), key=lambda x: -x[1])[:10]

    # Health score (simplified)
    health_score = 100
    if total_articles > 0:
        # Deduct for pending sources
        health_score -= pending_sources * 2

    return {
        "sources": {
            "total": sources_count,
            "pending": pending_sources,
            "compiled": compiled_sources,
        },
        "articles": {
            "total": total_articles,
            "concepts": concepts_count,
            "entities": entities_count,
            "connections": connections_count,
        },
        "outputs": outputs_count,
        "health_score": max(0, min(100, health_score)),
        "top_tags": top_tags,
    }
