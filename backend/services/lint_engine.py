"""Lint Engine - wiki health checks."""
import re
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from ..config import config
from .log_service import append_log


class LintIssue:
    """Represents a lint issue found in the wiki."""

    def __init__(
        self,
        issue_type: str,
        severity: str,
        message: str,
        details: dict | None = None,
        auto_fixable: bool = False,
    ):
        self.issue_type = issue_type
        self.severity = severity
        self.message = message
        self.details = details or {}
        self.auto_fixable = auto_fixable

    def to_dict(self) -> dict:
        return {
            "type": self.issue_type,
            "severity": self.severity,
            "message": self.message,
            "details": self.details,
            "auto_fixable": self.auto_fixable,
        }


async def run_lint_checks(checks: list[str] | None = None) -> dict[str, Any]:
    """Run all or selected lint checks.

    Args:
        checks: List of check names to run. If None, run all.

    Returns:
        Dict with issues found and overall health score.
    """
    if checks is None:
        checks = ["consistency", "orphans", "missing_links", "duplicates", "stale"]

    all_issues = []

    if "consistency" in checks:
        all_issues.extend(await _check_consistency())
    if "completeness" in checks:
        all_issues.extend(await _check_completeness())
    if "orphans" in checks:
        all_issues.extend(await _check_orphans())
    if "missing_links" in checks:
        all_issues.extend(await _check_missing_links())
    if "duplicates" in checks:
        all_issues.extend(await _check_duplicates())
    if "stale" in checks:
        all_issues.extend(await _check_stale_articles())

    # Calculate health score with weighted severity
    total_articles = _count_articles()
    if total_articles == 0:
        health_score = 100
    else:
        # Weight issues by severity
        severity_weights = {"error": 5, "warning": 2, "info": 0.5}
        weighted_issues = sum(
            severity_weights.get(issue.severity, 1) for issue in all_issues
        )
        # Use logarithmic scaling for issue count to avoid harsh penalties
        import math
        deduction = math.log1p(weighted_issues) * 10
        health_score = max(0, min(100, 100 - deduction))

    result = {
        "score": health_score,
        "total_issues": len(all_issues),
        "issues": [issue.to_dict() for issue in all_issues],
        "total_articles": total_articles,
    }

    # Log the lint run
    append_log(
        event_type="lint",
        title=f"Health check — {len(all_issues)} issues",
        details={
            "score": health_score,
            "total_issues": len(all_issues),
            "total_articles": total_articles,
        },
    )

    return result


async def _check_consistency() -> list[LintIssue]:
    """Find contradictory facts across articles."""
    issues = []

    # Extract facts from all articles
    facts_by_keyword: dict[str, list[tuple[str, str]]] = defaultdict(list)

    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue

        content = file_path.read_text()
        article_name = file_path.stem

        # Extract key facts
        fact_matches = re.findall(r"- (.+?)(?:\s*\[source:|$)", content, re.MULTILINE)
        for fact in fact_matches:
            fact = fact.strip()
            if len(fact) > 10 and len(fact) < 200:
                # Use first few words as a key
                key_words = " ".join(fact.split()[:3]).lower()
                facts_by_keyword[key_words].append((article_name, fact))

    # Find contradictions (same key but different facts)
    for key, fact_list in facts_by_keyword.items():
        if len(fact_list) > 1:
            # Check if facts are different
            unique_facts = set(f[1] for f in fact_list)
            if len(unique_facts) > 1:
                articles = [f[0] for f in fact_list]
                issues.append(LintIssue(
                    issue_type="consistency",
                    severity="warning",
                    message=f"Potential inconsistency: '{key}' has different values across articles",
                    details={
                        "articles": articles,
                        "facts": list(unique_facts),
                    },
                    auto_fixable=False,
                ))

    return issues


async def _check_completeness() -> list[LintIssue]:
    """Find concepts mentioned in prose but without dedicated articles.

    Only flags concepts mentioned in regular text, not [[wiki-links]] which
    are intentional cross-references that may be created later during compilation.
    Also checks for related articles that might already cover the concept.
    """
    issues = []

    # Get all article titles/slugs
    existing_articles = {}  # slug -> article path

    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue
        slug = file_path.stem.lower()
        existing_articles[slug] = file_path

    # Only check raw sources for now since wiki articles may reference each other
    # Look for concept mentions in raw sources that don't have wiki articles yet
    raw_sources_checked = set()

    for file_path in config.raw_dir.rglob("*.md"):
        if file_path.name.startswith("_") or file_path in raw_sources_checked:
            continue
        raw_sources_checked.add(file_path)

        content = file_path.read_text()

        # Extract prose text (skip frontmatter and code blocks)
        fm_match = re.match(r"^---\n.*?\n---\n", content, re.DOTALL)
        if fm_match:
            body = content[fm_match.end():]
        else:
            body = content

        # Remove code blocks
        body = re.sub(r"```[\s\S]*?```", "", body)
        body = re.sub(r"`[^`]+`", "", body)

        # Look for capitalized concepts (potential entity mentions)
        # Pattern: 2-4 capitalized words that might be concepts
        concept_pattern = re.findall(r"\b([A-Z][a-z]+(?:[A-Z][a-z]+){0,3})\b", body)
        for concept in concept_pattern:
            concept_lower = concept.lower()
            # Skip common words and short mentions
            if len(concept) < 4:
                continue
            # Skip if article already exists (exact match)
            if concept_lower in existing_articles:
                continue
            # Skip if there's a related article that covers this concept
            if _is_covered_by_existing_article(concept_lower, existing_articles):
                continue
            # Skip if it's just a wiki-link (those are intentional)
            if f"[[{concept}]]" in body or f"[[{concept_lower}]]" in body.lower():
                continue

            issues.append(LintIssue(
                issue_type="completeness",
                severity="info",
                message=f"Potential concept '{concept}' mentioned but has no dedicated article",
                details={"source": file_path.stem},
                auto_fixable=False,  # Can't auto-create concept articles
            ))

    return issues[:10]  # Limit to 10


def _is_covered_by_existing_article(concept: str, existing_articles: dict) -> bool:
    """Check if a concept might be covered by an existing article with a related slug."""
    concept_words = set(concept.lower().replace("-", " ").split())

    for slug in existing_articles:
        slug_words = set(slug.replace("-", " ").split())
        # If they share significant words, consider it covered
        common = concept_words & slug_words
        # Require at least one meaningful common word (4+ chars)
        if any(len(w) >= 4 for w in common):
            return True
    return False


async def _check_orphans() -> list[LintIssue]:
    """Find articles with zero backlinks."""
    issues = []

    # Track which articles are linked to
    linked_articles = set()

    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue

        content = file_path.read_text()
        links = re.findall(r"\[\[([^\]]+)\]\]", content)
        for link in links:
            linked_articles.add(link.lower())

    # Find articles with no incoming links
    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue

        article_name = file_path.stem.lower()
        if article_name not in linked_articles:
            issues.append(LintIssue(
                issue_type="orphan",
                severity="info",
                message=f"Article '{file_path.stem}' has no incoming backlinks",
                details={"article": str(file_path.relative_to(config.wiki_dir))},
                auto_fixable=True,
            ))

    return issues


async def _check_missing_links() -> list[LintIssue]:
    """Find articles that should be cross-referenced."""
    issues = []

    # Look for related topics that could be linked
    for file_path in config.wiki_dir.rglob("concepts/*.md"):
        content = file_path.read_text()
        article_name = file_path.stem

        # Check for missing cross-links in related concepts
        for other_path in config.wiki_dir.rglob("concepts/*.md"):
            if other_path == file_path:
                continue

            other_name = other_path.stem

            # If articles share tags but aren't linked
            if article_name.lower()[:5] == other_name.lower()[:5] and f"[[{other_name}]]" not in content:
                issues.append(LintIssue(
                    issue_type="missing_links",
                    severity="info",
                    message=f"Articles '{article_name}' and '{other_name}' might be related but aren't linked",
                    details={
                        "article1": article_name,
                        "article2": other_name,
                    },
                    auto_fixable=True,
                ))

    return issues[:5]  # Limit


async def _check_duplicates() -> list[LintIssue]:
    """Find overlapping articles that should potentially be merged."""
    issues = []

    # Simple heuristic: articles with similar titles
    articles_by_title: dict[str, list[Path]] = defaultdict(list)

    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue

        # Use first word of title as key
        content = file_path.read_text()
        title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if title_match:
            title = title_match.group(1).lower()
            first_word = title.split()[0] if title.split() else ""
            if first_word:
                articles_by_title[first_word].append(file_path)

    # Report duplicates
    for first_word, paths in articles_by_title.items():
        if len(paths) > 1:
            issues.append(LintIssue(
                issue_type="duplicates",
                severity="warning",
                message=f"Multiple articles start with '{first_word}'",
                details={
                    "articles": [str(p.relative_to(config.wiki_dir)) for p in paths],
                },
                auto_fixable=False,
            ))

    return issues


async def _check_stale_articles() -> list[LintIssue]:
    """Find articles that haven't been updated in 30+ days."""
    issues = []
    stale_threshold = datetime.now() - timedelta(days=30)

    for file_path in config.wiki_dir.rglob("*.md"):
        if file_path.name.startswith("_"):
            continue

        content = file_path.read_text()

        # Extract updated timestamp from frontmatter
        updated_match = re.search(r'updated:\s*"([^"]+)"', content)
        if not updated_match:
            continue

        try:
            updated_str = updated_match.group(1)
            # Parse ISO format datetime
            updated_date = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
            # Remove timezone info for comparison
            updated_date = updated_date.replace(tzinfo=None)

            if updated_date < stale_threshold:
                article_name = file_path.stem
                days_old = (datetime.now() - updated_date).days
                issues.append(LintIssue(
                    issue_type="stale",
                    severity="warning",
                    message=f"Article '{article_name}' hasn't been updated in {days_old} days",
                    details={
                        "article": str(file_path.relative_to(config.wiki_dir)),
                        "last_updated": updated_str,
                        "days_since_update": days_old,
                    },
                    auto_fixable=False,
                ))
        except (ValueError, TypeError):
            continue

    return issues


def _count_articles() -> int:
    """Count total wiki articles."""
    count = 0
    for file_path in config.wiki_dir.rglob("*.md"):
        if not file_path.name.startswith("_"):
            count += 1
    return count
