"""GitHub content extractor."""
import httpx
from typing import Any


async def extract_github(url: str) -> dict[str, Any]:
    """Extract README and metadata from GitHub repository.

    Args:
        url: GitHub repository URL

    Returns:
        Dictionary with content, title, author, description, etc.
    """
    from urllib.parse import urlparse, parse_qs

    # Parse GitHub URL
    parsed = urlparse(url)
    if "github.com" not in parsed.hostname:
        raise ValueError(f"Invalid GitHub URL: {url}")

    path_parts = parsed.path.strip("/").split("/")
    if len(path_parts) < 2:
        raise ValueError(f"Invalid GitHub URL: {url}")

    owner, repo = path_parts[0], path_parts[1]
    repo = repo.replace(".git", "")

    headers = {"Accept": "application/vnd.github.v3+json"}

    async with httpx.AsyncClient() as client:
        # Get repo metadata
        repo_response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
        )
        if repo_response.status_code != 200:
            raise ValueError(f"GitHub API error: {repo_response.status_code}")
        repo_data = repo_response.json()

        # Get README content
        readme_response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/readme",
            headers=headers,
        )
        if readme_response.status_code == 200:
            import base64
            readme_data = readme_response.json()
            if readme_data.get("encoding") == "base64":
                readme_content = base64.b64decode(readme_data["content"]).decode("utf-8")
            else:
                readme_content = readme_data.get("content", "")
        else:
            readme_content = ""

    return {
        "type": "github",
        "source_url": url,
        "title": repo_data.get("full_name", f"{owner}/{repo}"),
        "author": owner,
        "platform": "github",
        "description": repo_data.get("description", ""),
        "content": readme_content,
        "stars": repo_data.get("stargazers_count", 0),
        "language": repo_data.get("language", ""),
        "topics": repo_data.get("topics", []),
        "word_count": len(readme_content.split()),
    }
