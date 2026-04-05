"""Log Service — append-only activity log for the wiki (log.md pattern)."""
from datetime import datetime
from pathlib import Path
from typing import Any

from ..config import config


LOG_FILE = "_log.md"


def _log_path() -> Path:
    return config.wiki_dir / LOG_FILE


def _ensure_log(path: Path) -> None:
    """Initialize log file if it doesn't exist."""
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            "# Activity Log\n\n"
            "*Append-only record of all Cortex operations.*\n"
            "*Format: `## [YYYY-MM-DD HH:MM] event_type | title`*\n\n"
        )


def append_log(event_type: str, title: str, details: dict[str, Any] | None = None) -> None:
    """Append a new entry to _log.md.

    Args:
        event_type: One of 'ingest', 'compile', 'query', 'lint', 'insight'
        title: Human-readable title for the event
        details: Optional dict of extra info (articles created, sources, etc.)
    """
    path = _log_path()
    _ensure_log(path)

    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d %H:%M")
    date_str = now.strftime("%Y-%m-%d")

    # Build entry
    lines = [f"\n## [{timestamp}] {event_type} | {title}\n"]

    if details:
        for key, value in details.items():
            if isinstance(value, list):
                lines.append(f"- **{key}**: {', '.join(str(v) for v in value)}\n")
            else:
                lines.append(f"- **{key}**: {value}\n")

    entry = "".join(lines)

    with open(path, "a") as f:
        f.write(entry)


def read_log(limit: int = 20) -> list[dict[str, Any]]:
    """Read the last N log entries as structured dicts.

    Args:
        limit: Maximum number of entries to return

    Returns:
        List of log entries, newest first.
    """
    path = _log_path()
    if not path.exists():
        return []

    content = path.read_text()
    entries = []

    # Parse entries by splitting on ## headers
    import re
    pattern = re.compile(
        r"^## \[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] (\w+) \| (.+)$",
        re.MULTILINE,
    )

    matches = list(pattern.finditer(content))
    for i, match in enumerate(matches):
        timestamp_str = match.group(1)
        event_type = match.group(2)
        title = match.group(3).strip()

        # Extract body between this header and next
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        body = content[start:end].strip()

        # Parse detail lines  
        details = {}
        for line in body.splitlines():
            line = line.strip()
            if line.startswith("- **") and "**:" in line:
                key_end = line.index("**:", 4)
                key = line[4:key_end]
                value = line[key_end + 3:].strip()
                details[key] = value

        entries.append({
            "timestamp": timestamp_str,
            "event_type": event_type,
            "title": title,
            "details": details,
        })

    # Return newest first, limited
    return list(reversed(entries))[:limit]
