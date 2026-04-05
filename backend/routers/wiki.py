"""Wiki router - wiki browsing endpoints."""
from pathlib import Path
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import config

router = APIRouter()


class TreeNode(BaseModel):
    name: str
    path: str
    type: str  # "file" or "directory"
    children: list["TreeNode"] = []


@router.get("/tree")
async def get_wiki_tree():
    """Get the wiki file tree."""
    tree = _build_tree(config.wiki_dir)
    return {"tree": tree}


@router.get("/article/{path:path}")
async def get_article(path: str):
    """Get a wiki article by path with backlinks."""
    file_path = config.wiki_dir / path

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Article not found")

    if file_path.is_dir():
        raise HTTPException(status_code=400, detail="Path is a directory, not an article")

    content = file_path.read_text()

    # Parse frontmatter
    fm_match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    frontmatter = {}
    if fm_match:
        for line in fm_match.group(1).split("\n"):
            if ": " in line:
                key, value = line.split(": ", 1)
                frontmatter[key.strip()] = value.strip().strip('"')

    # Extract body
    body = content[fm_match.end():] if fm_match else content

    # Extract backlinks (which articles link to this one)
    backlinks = _find_backlinks(Path(path).stem)

    # Extract [[wiki-links]] from this article
    wiki_links = re.findall(r"\[\[([^\]]+)\]\]", body)

    return {
        "path": path,
        "frontmatter": frontmatter,
        "content": body,
        "backlinks": backlinks,
        "wiki_links": wiki_links,
    }


@router.get("/index")
async def get_index():
    """Get the master wiki index."""
    index_path = config.wiki_dir / "_index.md"
    if not index_path.exists():
        return {"content": "", "message": "Index not found"}

    content = index_path.read_text()
    return {"content": content}


def _build_tree(directory: Path) -> list[TreeNode]:
    """Recursively build tree structure."""
    nodes = []

    for item in sorted(directory.iterdir()):
        if item.name.startswith("_"):
            continue

        if item.is_dir():
            children = _build_tree(item)
            nodes.append(TreeNode(
                name=item.name,
                path=str(item.relative_to(config.wiki_dir)),
                type="directory",
                children=children,
            ))
        else:
            nodes.append(TreeNode(
                name=item.name,
                path=str(item.relative_to(config.wiki_dir)),
                type="file",
            ))

    return nodes


def _find_backlinks(article_slug: str) -> list[dict]:
    """Find all articles that link to the given article."""
    backlinks = []
    article_lower = article_slug.lower()

    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue

        content = file_path.read_text()
        if f"[[{article_slug}]]" in content or f"[[{article_lower}]]" in content.lower():
            # Extract title
            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            title = title_match.group(1) if title_match else file_path.stem

            backlinks.append({
                "path": str(file_path.relative_to(config.wiki_dir)),
                "title": title,
            })

    return backlinks
