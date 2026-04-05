"""Graph router - knowledge graph endpoints."""
import re
from pathlib import Path

from fastapi import APIRouter
from fastapi.logger import logger

from ..config import config

router = APIRouter()


def _slugify(text: str) -> str:
    """Convert text to a slug matching file stem format."""
    # Remove special chars, lowercase, replace spaces with hyphens
    return text.lower().replace(" ", "-").replace("_", "-").replace("--", "-").strip("-")


@router.get("")
async def get_graph_data(filter_type: str = "all"):
    """Get nodes and edges for the knowledge graph."""
    nodes = []
    edges = []
    seen_nodes = set()
    seen_edges = set()

    # Determine which node types to include
    include_concepts = filter_type in ("all", "concepts")
    include_entities = filter_type in ("all", "entities")
    include_connections = filter_type in ("all", "connections")
    include_raw = filter_type in ("all", "raw")

    # First pass: build a map of existing wiki article stems to their full info
    wiki_nodes_map: dict[str, dict] = {}

    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue

        content = file_path.read_text()
        article_type = _get_article_type(file_path)

        # Skip based on filter
        if article_type == "concept" and not include_concepts:
            continue
        if article_type == "entity" and not include_entities:
            continue
        if article_type == "connection" and not include_connections:
            continue

        # Extract title
        title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        title = title_match.group(1) if title_match else file_path.stem

        # Count outgoing links (for node size)
        links = re.findall(r"\[\[([^\]]+)\]\]", content)
        link_count = len(links)

        # Create node
        node_id = file_path.stem
        node_info = {
            "id": node_id,
            "label": title,
            "type": article_type,
            "size": min(10, 3 + link_count),
            "connections": link_count,
            "path": str(file_path.relative_to(config.wiki_dir)),
        }
        wiki_nodes_map[node_id] = node_info

        if node_id not in seen_nodes:
            seen_nodes.add(node_id)
            nodes.append(node_info)

        # Create edges - normalize link target to match node ID format
        for link in links:
            link_slug = _slugify(link)
            edge_key = f"{node_id}->{link_slug}"
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges.append({
                    "source": node_id,
                    "target": link_slug,
                    "label": "",
                })

    # Add raw sources as nodes if included
    if include_raw:
        for file_path in config.raw_dir.rglob("*.md"):
            if file_path.name == "_sources.md":
                continue

            # Extract title from frontmatter
            content = file_path.read_text()
            fm_match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
            title = file_path.stem
            if fm_match:
                for line in fm_match.group(1).split("\n"):
                    if line.startswith("title:"):
                        title = line.split(": ", 1)[1].strip().strip('"')
                        break

            node_id = f"raw_{file_path.stem}"
            if node_id not in seen_nodes:
                seen_nodes.add(node_id)
                nodes.append({
                    "id": node_id,
                    "label": title[:30],
                    "type": "raw",
                    "size": 3,
                    "connections": 0,
                    "path": str(file_path.relative_to(config.raw_dir)),
                })

    # Filter out edges where target node doesn't exist (orphan edges)
    valid_node_ids = set(n["id"] for n in nodes)
    edges = [e for e in edges if e["target"] in valid_node_ids]

    return {"nodes": nodes, "edges": edges}


def _get_article_type(path: Path) -> str:
    """Determine article type from path."""
    parent = path.parent.name
    if parent == "concepts":
        return "concept"
    elif parent == "entities":
        return "entity"
    elif parent == "connections":
        return "connection"
    else:
        return "concept"  # Default
