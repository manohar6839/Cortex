"""Lint router - health check endpoints."""
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import config
from ..services.lint_engine import run_lint_checks, LintIssue

router = APIRouter()


class LintRequest(BaseModel):
    checks: list[str] | None = None


class FixRequest(BaseModel):
    issue_type: str
    details: dict


@router.post("")
async def run_lint(request: LintRequest):
    """Run lint checks on the wiki."""
    result = await run_lint_checks(checks=request.checks)
    return result


@router.post("/fix")
async def fix_issue(request: FixRequest):
    """Attempt to auto-fix a lint issue."""
    issue_type = request.issue_type
    details = request.details

    try:
        if issue_type == "completeness":
            return await _fix_completeness(details)
        elif issue_type == "orphan":
            return await _fix_orphan(details)
        elif issue_type == "missing_links":
            return await _fix_missing_links(details)
        else:
            return {"status": "manual_required", "message": f"Issue type '{issue_type}' requires manual intervention"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fix issue: {str(e)}")


async def _fix_completeness(details: dict) -> dict:
    """Create a stub article for a referenced concept that has no article."""
    concept = details.get("referenced_in")
    if not concept:
        return {"status": "error", "message": "Missing concept name"}

    # Determine which subdirectory to create in
    wiki_dir = config.wiki_dir

    # Create a stub article
    article_path = wiki_dir / "concepts" / f"{concept.lower().replace(' ', '-')}.md"

    if article_path.exists():
        return {"status": "skipped", "message": f"Article '{concept}' already exists"}

    # Create stub with frontmatter
    content = f"""---
title: "{concept}"
type: "concept"
created: "{datetime.now().isoformat()}"
source: "auto-generated"
tags: []
status: "stub"
---

# {concept}

This article is a stub and needs to be expanded with more detailed content.

## Summary

<!-- Add summary here -->

## Key Points

<!-- Add key points here -->

## Related Concepts

<!-- Add related concepts using [[wiki-links]] -->

## Sources

<!-- Add source references here -->
"""

    article_path.write_text(content)

    return {
        "status": "fixed",
        "message": f"Created stub article for '{concept}'",
        "file_created": str(article_path.relative_to(config.data_base_path)),
    }


async def _fix_orphan(details: dict) -> dict:
    """Fix an orphan article - either add it to a related article or delete if empty."""
    article_path_str = details.get("article")
    if not article_path_str:
        return {"status": "error", "message": "Missing article path"}

    article_path = config.wiki_dir / article_path_str
    if not article_path.exists():
        return {"status": "error", "message": f"Article not found: {article_path}"}

    content = article_path.read_text()

    # Check if article is essentially empty (stub only)
    lines = [l.strip() for l in content.split("\n") if l.strip()]
    body_lines = [l for l in lines if not l.startswith("---") and not l.startswith("#")]

    if len(body_lines) < 10:
        # Article is essentially empty, delete it
        article_path.unlink()
        return {
            "status": "fixed",
            "message": f"Deleted empty orphan article '{article_path.stem}'",
        }
    else:
        # Try to find a related article to add a link
        # Find other articles that might be related by similar content
        article_name = article_path.stem.lower()

        for other_path in config.wiki_dir.rglob("concepts/*.md"):
            if other_path == article_path:
                continue
            other_content = other_path.read_text()
            # If they share any significant words, add a link
            if _shares_content(article_name, other_path.stem):
                # Add link to the other article
                link_text = f"\n<!-- Linked from [[{article_path.stem}]] -->\n"
                other_content = other_content + link_text
                other_path.write_text(other_content)
                return {
                    "status": "fixed",
                    "message": f"Added backlink to '{other_path.stem}' for orphan '{article_path.stem}'",
                }

        return {"status": "manual_required", "message": f"Orphan '{article_path.stem}' could not be auto-fixed - no related articles found"}


async def _fix_missing_links(details: dict) -> dict:
    """Add missing wiki links between related articles."""
    article1_name = details.get("article1")
    article2_name = details.get("article2")

    if not article1_name or not article2_name:
        return {"status": "error", "message": "Missing article names"}

    # Find the articles
    article1_path = None
    article2_path = None

    for path in config.wiki_dir.rglob("concepts/*.md"):
        if path.stem.lower() == article1_name.lower():
            article1_path = path
        if path.stem.lower() == article2_name.lower():
            article2_path = path

    if not article1_path or not article2_path:
        return {"status": "error", "message": "One or both articles not found"}

    # Add links in both directions
    modified = []

    content1 = article1_path.read_text()
    if f"[[{article2_path.stem}]]" not in content1:
        content1 += f"\n\nSee also: [[{article2_path.stem}]]\n"
        article1_path.write_text(content1)
        modified.append(str(article1_path.relative_to(config.wiki_dir)))

    content2 = article2_path.read_text()
    if f"[[{article1_path.stem}]]" not in content2:
        content2 += f"\n\nSee also: [[{article1_path.stem}]]\n"
        article2_path.write_text(content2)
        modified.append(str(article2_path.relative_to(config.wiki_dir)))

    if modified:
        return {
            "status": "fixed",
            "message": f"Added links between '{article1_name}' and '{article2_name}'",
            "files_modified": modified,
        }
    else:
        return {"status": "skipped", "message": "Links already exist"}


def _shares_content(name1: str, name2: str) -> bool:
    """Check if two article names share significant words."""
    words1 = set(name1.lower().replace("-", " ").split())
    words2 = set(name2.lower().replace("-", " ").split())
    common = words1 & words2
    # They share at least one word of 4+ characters
    return any(len(w) >= 4 for w in common)
