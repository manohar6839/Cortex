"""URL type detection utility."""
from urllib.parse import urlparse


def detect_url_type(url: str) -> str:
    """Classify URL into content type for routing to correct extractor.

    Args:
        url: The URL to classify

    Returns:
        One of: youtube, github, reddit, twitter, pdf, generic
    """
    parsed = urlparse(url.lower())

    # YouTube
    if "youtube.com" in parsed.hostname or "youtu.be" in parsed.hostname:
        return "youtube"

    # GitHub
    if "github.com" in parsed.hostname:
        return "github"

    # Reddit
    if "reddit.com" in parsed.hostname:
        return "reddit"

    # Twitter/X
    if "x.com" in parsed.hostname or "twitter.com" in parsed.hostname:
        return "twitter"

    # PDF
    if parsed.path.lower().endswith(".pdf"):
        return "pdf"

    # Generic web article
    return "generic"
