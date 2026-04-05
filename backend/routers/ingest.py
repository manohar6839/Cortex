"""Ingest router - content ingestion endpoints."""
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from ..config import config
from ..services.extractors.utils import detect_url_type
from ..services.extractors import youtube, github, pdf, web
from ..services.post_processor import process_content

router = APIRouter()


def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:50]


def generate_id() -> str:
    """Generate a unique source ID."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    short_id = uuid.uuid4().hex[:6]
    return f"src_{timestamp}_{short_id}"


class IngestURLRequest(BaseModel):
    url: str


class IngestNoteRequest(BaseModel):
    title: str
    content: str


class SourceResponse(BaseModel):
    id: str
    status: str
    preview: dict | None = None


async def save_raw_source(content: dict) -> tuple[str, Path]:
    """Save processed content to raw directory.

    Returns:
        Tuple of (source_id, file_path)
    """
    source_id = generate_id()
    content_type = content.get("content_type", "article")
    title_slug = slugify(content.get("title", "untitled"))

    # Determine subdirectory
    if content_type in ["tweet", "twitter"]:
        subdir = "twitter"
    elif content_type == "github":
        subdir = "github"
    elif content_type == "youtube":
        subdir = "youtube"
    elif content_type == "pdf":
        subdir = "pdf"
    elif content_type in ["reddit"]:
        subdir = "reddit"
    else:
        subdir = "articles"

    # Ensure directory exists
    raw_dir = config.raw_dir / subdir
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Write file with frontmatter
    file_path = raw_dir / f"{source_id}_{title_slug}.md"
    _write_markdown_with_frontmatter(file_path, source_id, content)

    return source_id, file_path


def _write_markdown_with_frontmatter(file_path: Path, source_id: str, content: dict) -> None:
    """Write content as markdown with YAML frontmatter."""
    from datetime import datetime

    frontmatter = f"""---
id: "{source_id}"
type: "{content.get('type', 'article')}"
source_url: "{content.get('source_url', '')}"
title: "{content.get('title', 'Untitled')}"
author: "{content.get('author', '')}"
platform: "{content.get('platform', 'web')}"
date: "{datetime.now().isoformat()}"
captured: "{datetime.now().isoformat()}"
status: "pending"
tags: {content.get('tags', [])}
entities: {content.get('entities', [])}
domains: {content.get('domains', [])}
summary: "{content.get('summary', '')[:200]}"
key_facts: {content.get('key_facts', [])}
content_type: "{content.get('content_type', 'article')}"
word_count: {content.get('word_count', 0)}
has_transcript: {content.get('has_transcript', False)}
duration: "{content.get('duration', '')}"
---

"""

    with open(file_path, "w") as f:
        f.write(frontmatter)
        f.write(content.get("content", ""))


@router.post("/url", response_model=SourceResponse)
async def ingest_url(request: IngestURLRequest):
    """Ingest content from a URL."""
    url_type = detect_url_type(request.url)

    try:
        # Extract content based on type
        if url_type == "youtube":
            raw_content = await youtube.extract_youtube(request.url)
        elif url_type == "github":
            raw_content = await github.extract_github(request.url)
        elif url_type == "pdf":
            raw_content = await pdf.extract_pdf(url=request.url)
        else:
            raw_content = await web.extract_web(request.url)

        # Process with LLM to generate metadata
        content = await process_content(raw_content)

        # Save to raw directory
        source_id, file_path = await save_raw_source(content)

        # Update sources registry
        _update_sources_registry(source_id, file_path, content)

        return SourceResponse(
            id=source_id,
            status="saved",
            preview={
                "title": content.get("title"),
                "summary": content.get("summary", "")[:200],
                "tags": content.get("tags", []),
                "word_count": content.get("word_count", 0),
                "file_path": str(file_path),
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=SourceResponse)
async def ingest_upload(file: UploadFile = File(...)):
    """Ingest an uploaded file (PDF only for now)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if file.filename.lower().endswith(".pdf"):
        content = await file.read()
        raw_content = await pdf.extract_pdf_upload(content, file.filename)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF is supported.")

    # Process with LLM
    content = await process_content(raw_content)

    # Save
    source_id, file_path = await save_raw_source(content)
    _update_sources_registry(source_id, file_path, content)

    return SourceResponse(
        id=source_id,
        status="saved",
        preview={
            "title": content.get("title"),
            "summary": content.get("summary", "")[:200],
            "tags": content.get("tags", []),
            "word_count": content.get("word_count", 0),
        },
    )


@router.post("/note", response_model=SourceResponse)
async def ingest_note(request: IngestNoteRequest):
    """Create a quick note (manual entry)."""
    content = {
        "type": "note",
        "source_url": "",
        "title": request.title,
        "author": "",
        "platform": "manual",
        "content": request.content,
        "content_type": "note",
        "word_count": len(request.content.split()),
    }

    content = await process_content(content)

    source_id, file_path = await save_raw_source(content)
    _update_sources_registry(source_id, file_path, content)

    return SourceResponse(
        id=source_id,
        status="saved",
        preview={
            "title": content.get("title"),
            "summary": content.get("summary", "")[:200],
            "tags": content.get("tags", []),
            "word_count": content.get("word_count", 0),
        },
    )


def _update_sources_registry(source_id: str, file_path: Path, content: dict) -> None:
    """Append new source to the _sources.md registry."""
    sources_file = config.raw_dir / "_sources.md"

    entry = f"""
### {content.get('title', 'Untitled')}

- **ID:** {source_id}
- **Type:** {content.get('type', 'article')}
- **URL:** {content.get('source_url', 'N/A')}
- **Platform:** {content.get('platform', 'unknown')}
- **Tags:** {', '.join(content.get('tags', []))}
- **Captured:** {datetime.now().isoformat()}
- **Status:** pending
- **File:** `{file_path.relative_to(config.raw_dir)}`

---
"""

    with open(sources_file, "a") as f:
        f.write(entry)
