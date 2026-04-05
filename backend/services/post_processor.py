"""Post-processor service using LLM to generate metadata."""
from typing import Any

from .llm import llm_service


async def process_content(content: dict[str, Any]) -> dict[str, Any]:
    """Generate metadata for extracted content using LLM.

    Args:
        content: Raw extracted content with at least 'title' and 'content' fields

    Returns:
        Content with added metadata: summary, tags, entities, key_facts, etc.
    """
    system_prompt = """You are a research assistant that analyzes content and generates structured metadata.
Your task is to extract key information and categorize the content.

Return a JSON object with these fields:
- title: A clean, human-readable title (you can improve on the provided title if needed)
- summary: A 3-4 sentence summary of the content
- tags: Array of relevant topic tags (3-8 tags, lowercase, hyphen-separated)
- entities: Array of named entities mentioned (companies, people, products, etc.)
- key_facts: Array of 3-5 specific facts or data points from the content
- content_type: One of: opinion, analysis, news, tutorial, discussion, research, announcement
- domains: Array of subject domains (e.g., renewable-energy, finance, technology)

Be concise and specific. Tags and entities should be useful for organizing a personal knowledge base."""

    content_snippet = content.get("content", "")[:5000]  # Limit to first 5000 chars

    user_prompt = f"""Title: {content.get('title', 'Untitled')}

Content:
{content_snippet}"""

    try:
        metadata = await llm_service.complete_json(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.3,
        )

        # Merge with original content
        return {
            **content,
            "title": metadata.get("title", content.get("title")),
            "summary": metadata.get("summary", ""),
            "tags": metadata.get("tags", []),
            "entities": metadata.get("entities", []),
            "key_facts": metadata.get("key_facts", []),
            "content_type": metadata.get("content_type", "article"),
            "domains": metadata.get("domains", []),
        }
    except Exception as e:
        print(f"LLM post-processing failed: {e}")
        # Return content with minimal metadata
        return {
            **content,
            "summary": "",
            "tags": [],
            "entities": [],
            "key_facts": [],
            "content_type": "article",
            "domains": [],
        }
