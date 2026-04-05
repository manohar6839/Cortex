"""Raw sources router - list and view ingested sources."""
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from ..config import config

router = APIRouter()


class Source(BaseModel):
    id: str
    title: str
    type: str
    source_url: str
    platform: str
    tags: list[str]
    domains: list[str]
    summary: str
    word_count: int
    captured: str
    status: str
    file_path: str


@router.get("/list")
async def list_sources():
    """List all raw sources."""
    sources = []
    seen_ids: set[str] = set()
    seen_paths: set[str] = set()
    sources_file = config.raw_dir / "_sources.md"

    if sources_file.exists():
        # Parse _sources.md
        content = sources_file.read_text()
        # Simple parsing - in production you'd want a more robust parser
        entries = content.split("---")
        for entry in entries:
            if "**ID:**" in entry:
                source = _parse_source_entry(entry)
                if source and source["id"] and source["id"] not in seen_ids:
                    seen_ids.add(source["id"])
                    sources.append(source)

    # Also scan for files
    for file_path in config.raw_dir.rglob("*.md"):
        if file_path.name == "_sources.md":
            continue
        relative_path = str(file_path.relative_to(config.raw_dir))
        # Skip if already added by file_path
        if relative_path in seen_paths:
            continue
        # Check if already in list by ID
        source_id = _get_source_id_from_path(file_path)
        if source_id and source_id in seen_ids:
            continue
        source = _read_source_from_file(file_path)
        if source:
            seen_paths.add(relative_path)
            if source["id"]:
                seen_ids.add(source["id"])
            sources.append(source)

    return {"sources": sources}


@router.get("/{source_id}")
async def get_source(source_id: str):
    """Get a specific raw source by ID."""
    # Find the file
    for file_path in config.raw_dir.rglob("*.md"):
        if file_path.name.startswith(source_id):
            return _read_source_from_file(file_path)

    return {"error": "Source not found"}


def _parse_source_entry(entry: str) -> dict | None:
    """Parse a source entry from _sources.md."""
    import re

    source = {}

    id_match = re.search(r"\*\*ID:\*\*\s*(.+)", entry)
    if id_match:
        source["id"] = id_match.group(1).strip()

    title_match = re.search(r"^###\s*(.+)", entry, re.MULTILINE)
    if title_match:
        source["title"] = title_match.group(1).strip()

    type_match = re.search(r"\*\*Type:\*\*\s*(.+)", entry)
    if type_match:
        source["type"] = type_match.group(1).strip()

    url_match = re.search(r"\*\*URL:\*\*\s*(.+)", entry)
    if url_match:
        source["source_url"] = url_match.group(1).strip()

    platform_match = re.search(r"\*\*Platform:\*\*\s*(.+)", entry)
    if platform_match:
        source["platform"] = platform_match.group(1).strip()

    tags_match = re.search(r"\*\*Tags:\*\*\s*(.+)", entry)
    if tags_match:
        source["tags"] = [t.strip() for t in tags_match.group(1).split(",")]

    status_match = re.search(r"\*\*Status:\*\*\s*(.+)", entry)
    if status_match:
        source["status"] = status_match.group(1).strip()

    file_match = re.search(r"\*\*File:\*\*\s*`(.+)`", entry)
    if file_match:
        source["file_path"] = file_match.group(1).strip()

    return source if source.get("id") else None


def _get_source_id_from_path(file_path: Path) -> str | None:
    """Extract source ID from filename."""
    return file_path.name.split("_")[0] if file_path.name.startswith("src_") else None


def _read_source_from_file(file_path: Path) -> dict | None:
    """Read source metadata from markdown file frontmatter."""
    import re
    from datetime import datetime

    content = file_path.read_text()

    # Extract frontmatter
    fm_match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not fm_match:
        return None

    fm_text = fm_match.group(1)
    fm = {}

    for line in fm_text.split("\n"):
        if ": " in line:
            key, value = line.split(": ", 1)
            value = value.strip().strip('"')
            fm[key] = value

    # Get body content
    body = content[fm_match.end():].strip()
    # Limit content preview
    if len(body) > 500:
        body = body[:500] + "..."

    return {
        "id": fm.get("id", ""),
        "title": fm.get("title", "Untitled"),
        "type": fm.get("type", "article"),
        "source_url": fm.get("source_url", ""),
        "platform": fm.get("platform", "unknown"),
        "tags": eval(fm.get("tags", "[]")) if fm.get("tags") else [],
        "domains": eval(fm.get("domains", "[]")) if fm.get("domains") else [],
        "summary": fm.get("summary", ""),
        "word_count": int(fm.get("word_count", 0)),
        "captured": fm.get("captured", ""),
        "status": fm.get("status", "pending"),
        "file_path": str(file_path.relative_to(config.raw_dir)),
        "content_preview": body,
    }
