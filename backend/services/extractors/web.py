"""Web content extractor using crawl4ai and Jina fallback."""
from typing import Any
import httpx
import re


async def extract_web(url: str) -> dict[str, Any]:
    """Extract content from a web page.

    Args:
        url: URL to extract content from

    Returns:
        Dictionary with content and metadata.
    """
    # Try crawl4ai first with platform-specific CSS selector
    try:
        return await extract_with_crawl4ai(url)
    except Exception as e:
        print(f"crawl4ai failed for {url}: {e}, trying Jina fallback")

    # Fallback to Jina AI-powered extraction
    try:
        return await extract_with_jina(url, use_ai=True)
    except Exception as e:
        print(f"Jina AI extraction failed: {e}, trying basic Jina")
        try:
            return await extract_with_jina(url, use_ai=False)
        except Exception as e2:
            raise ValueError(f"All web extraction methods failed for {url}: {e2}")


def _get_css_selector(url: str) -> str | None:
    """Get platform-specific CSS selector for main article content."""
    url_lower = url.lower()

    if "substack.com" in url_lower:
        return "article .post-content, .article-content, .article-body, article"
    elif "medium.com" in url_lower:
        return "article .graf, article .post-content, .article-content"
    elif "dev.to" in url_lower:
        return "article .content, .article-body, article"
    elif "reddit.com" in url_lower:
        return "[data-testid='post-content'], .post-content, article"
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        return "[data-testid='tweet'], article"
    elif "news.ycombinator.com" in url_lower:
        return ".hnf-body, .comment, #content"
    elif "wikipedia.org" in url_lower:
        return "#mw-content-text, .mw-parser-output"
    elif "docs.google.com" in url_lower:
        return ".docs-text-input, #docs-editor"

    return None


async def extract_with_crawl4ai(url: str) -> dict[str, Any]:
    """Extract content using crawl4ai with optional CSS selector."""
    from crawl4ai import AsyncWebCrawler

    css_selector = _get_css_selector(url)
    crawler_kwargs = {"verbose": False}

    # Build run kwargs with optional selector
    run_kwargs = {"url": url}
    if css_selector:
        run_kwargs["css_selector"] = css_selector

    async with AsyncWebCrawler(**crawler_kwargs) as crawler:
        result = await crawler.arun(**run_kwargs)

        if not result or not result.success:
            raise ValueError(f"crawl4ai failed for {url}")

        # Clean up markdown - remove excessive newlines and noise
        content = _clean_markdown(result.markdown)

        return {
            "type": "article",
            "source_url": url,
            "title": result.metadata.get("title", url) or url,
            "author": result.metadata.get("author", ""),
            "platform": "web",
            "content": content,
            "description": result.metadata.get("description", ""),
            "word_count": len(content.split()) if content else 0,
        }


async def extract_with_jina(url: str, use_ai: bool = True) -> dict[str, Any]:
    """Extract content using Jina Reader API.

    Args:
        url: URL to extract
        use_ai: If True, use AI-powered extraction endpoint (better for articles)
    """
    # Use AI-powered extraction for better article content isolation
    if use_ai:
        jina_url = f"https://r.jina.ai/ai/{url}"
    else:
        jina_url = f"https://r.jina.ai/{url}"

    headers = {
        "Accept": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(jina_url, headers=headers, timeout=30.0)
        if response.status_code != 200:
            raise ValueError(f"Jina API error: {response.status_code}")

        data = response.json()

        # Extract content from Jina's response format
        raw_content = data.get("data", {}).get("content", "")
        content = _clean_markdown(raw_content)
        title = data.get("data", {}).get("title", url) or url

        # Try to extract author if available
        author = ""
        if "author" in data.get("data", {}):
            author = data["data"]["author"]

        return {
            "type": "article",
            "source_url": url,
            "title": title,
            "author": author,
            "platform": "web",
            "content": content,
            "word_count": len(content.split()) if content else 0,
        }


def _clean_markdown(content: str) -> str:
    """Clean up extracted markdown by removing noise and excessive formatting."""
    if not content:
        return ""

    lines = content.split("\n")
    cleaned_lines = []
    prev_empty = False

    for line in lines:
        stripped = line.strip()

        # Skip very short lines that are likely noise
        if len(stripped) < 3 and stripped != "-":
            continue

        # Skip common noise patterns
        noise_patterns = [
            r"^(subscribe|sign up|newsletter|follow me|follow us)",
            r"^(share| tweet|facebook|linkedin|reddit)",
            r"^\d+\s*(comments?|shares?|views?)$",
            r"^(advertisement|ad)",
        ]
        if any(re.match(p, stripped.lower()) for p in noise_patterns):
            continue

        # Collapse multiple empty lines
        if stripped:
            cleaned_lines.append(line)
            prev_empty = False
        elif not prev_empty:
            cleaned_lines.append("")
            prev_empty = True

    return "\n".join(cleaned_lines).strip()
