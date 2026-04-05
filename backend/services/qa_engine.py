"""Q&A Engine - multi-step answer synthesis."""
from typing import Any, AsyncGenerator
from datetime import datetime
import re

from ..config import config
from .llm import llm_service
from .search_engine import search_engine
from .log_service import append_log


async def answer_question(question: str, save_to_wiki: bool = False) -> dict[str, Any]:
    """Answer a question using the knowledge base.

    Args:
        question: The user's question
        save_to_wiki: Whether to save the answer to the wiki as an insight

    Returns:
        Answer with content and sources.
    """
    # Step 1: Read index, identify relevant articles
    index_path = config.wiki_dir / "_index.md"
    if not index_path.exists():
        return {
            "question": question,
            "answer": "No articles found. Please ingest and compile some sources first.",
            "sources": [],
            "research_steps": ["No index found"],
            "saved_to_wiki": False,
        }

    index_content = index_path.read_text()

    # Identify relevant articles via LLM
    relevant_articles = await _identify_relevant_articles(question, index_content)

    # Step 2: Load those articles
    articles_content = {}
    for article_name in relevant_articles:
        article_path = _find_article_path(article_name)
        if article_path and article_path.exists():
            articles_content[article_name] = article_path.read_text()

    # Step 3: Also use search for additional context
    search_results = search_engine.search(question, top_k=5)

    # Step 4: Synthesize answer
    research_steps = [
        f"Reading index... found {len(relevant_articles)} relevant articles",
    ] + [f"Reading: {name}" for name in relevant_articles if name in articles_content]

    answer = await _synthesize_answer(
        question=question,
        articles=articles_content,
        search_results=search_results,
    )

    # Optionally save to wiki as an insight
    saved_slug = None
    if save_to_wiki:
        saved_slug = await _save_answer_to_wiki(question, answer, relevant_articles)
        # Log the insight
        append_log(
            event_type="insight",
            title=question,
            details={
                "slug": saved_slug,
                "sources_used": len(relevant_articles),
            },
        )

    return {
        "question": question,
        "answer": answer,
        "sources": relevant_articles,
        "research_steps": research_steps,
        "saved_to_wiki": save_to_wiki,
        "saved_slug": saved_slug,
    }


async def stream_answer(question: str) -> AsyncGenerator[str, None]:
    """Stream an answer to a question (SSE format)."""
    # Step 1: Identify relevant articles
    index_path = config.wiki_dir / "_index.md"
    if not index_path.exists():
        yield f"data: {{\"type\": \"error\", \"message\": \"No articles found\"}}\n\n"
        return

    index_content = index_path.read_text()
    yield f"data: {{\"type\": \"progress\", \"message\": \"Reading index...\"}}\n\n"

    relevant_articles = await _identify_relevant_articles(question, index_content)
    yield f"data: {{\"type\": \"progress\", \"message\": \"Found {len(relevant_articles)} relevant articles\"}}\n\n"

    # Step 2: Load articles
    articles_content = {}
    for article_name in relevant_articles:
        article_path = _find_article_path(article_name)
        if article_path and article_path.exists():
            articles_content[article_name] = article_path.read_text()
            yield f"data: {{\"type\": \"progress\", \"message\": \"Reading: {article_name}\"}}\n\n"

    # Step 3: Search
    search_results = search_engine.search(question, top_k=5)
    yield f"data: {{\"type\": \"progress\", \"message\": \"Searching knowledge base...\"}}\n\n"

    # Step 4: Stream answer synthesis
    yield f"data: {{\"type\": \"progress\", \"message\": \"Synthesizing answer...\"}}\n\n"

    async for chunk in _stream_synthesize_answer(question, articles_content, search_results):
        yield f"data: {{\"type\": \"chunk\", \"content\": {chunk}}}\n\n"

    yield f"data: {{\"type\": \"done\", \"sources\": {relevant_articles}}}\n\n"


async def _identify_relevant_articles(question: str, index_content: str) -> list[str]:
    """Use LLM to identify relevant articles from index."""
    system_prompt = """You are a research assistant helping answer questions from a knowledge base.
Given a question and an index of articles, identify the most relevant articles.

Return a JSON object with an "articles" array containing 5-8 article filenames (just the slug/filename without path).
Focus on articles that directly relate to the question topics."""

    user_prompt = f"""Question: {question}

Index:
{index_content[:5000]}

Identify the relevant articles. Return as JSON."""

    try:
        result = await llm_service.complete_json(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.3,
        )
        articles = result.get("articles", [])
        return articles[:8]
    except Exception as e:
        print(f"Article identification failed: {e}")
        return []


def _find_article_path(article_name: str) -> Any:
    """Find an article by name in the wiki directory."""
    slug = article_name.replace(".md", "")

    for subdir in ["concepts", "entities", "connections", "insights"]:
        path = config.wiki_dir / subdir / f"{slug}.md"
        if path.exists():
            return path

    # Case-insensitive fallback
    slug_lower = slug.lower()
    for path in config.wiki_dir.rglob("*.md"):
        if path.stem.lower() == slug_lower:
            return path

    return None


async def _synthesize_answer(
    question: str,
    articles: dict[str, str],
    search_results: list[dict],
) -> str:
    """Synthesize an answer from articles and search results."""
    system_prompt = """You are a research assistant synthesizing answers from a personal knowledge base.
Write a comprehensive, well-structured answer with [[source-links]] citations.

Format your answer with:
- Clear headings
- Bullet points for comparisons
- Citations like [[source-name]] at the end of relevant claims"""

    articles_text = "\n\n".join([
        f"=== {name} ===\n{content[:3000]}"
        for name, content in articles.items()
    ])

    search_text = "\n".join([
        f"- {r['title']}: {r['snippet']}"
        for r in search_results[:5]
    ])

    user_prompt = f"""Question: {question}

Articles:
{articles_text}

Search Results:
{search_text}

Write a comprehensive answer synthesizing information from the above sources."""

    try:
        return await llm_service.complete(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.5,
        )
    except Exception as e:
        return f"Error synthesizing answer: {e}"


async def _stream_synthesize_answer(
    question: str,
    articles: dict[str, str],
    search_results: list[dict],
) -> AsyncGenerator[str, None]:
    """Stream answer synthesis."""
    system_prompt = """You are a research assistant synthesizing answers from a personal knowledge base.
Write a comprehensive, well-structured answer with [[source-links]] citations."""

    articles_text = "\n\n".join([
        f"=== {name} ===\n{content[:3000]}"
        for name, content in articles.items()
    ])

    search_text = "\n".join([
        f"- {r['title']}: {r['snippet']}"
        for r in search_results[:5]
    ])

    user_prompt = f"""Question: {question}

Articles:
{articles_text}

Search Results:
{search_text}

Write a comprehensive answer."""

    try:
        async for chunk in llm_service.stream_complete(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.5,
        ):
            yield chunk
    except Exception as e:
        yield f"Error: {e}"


async def _save_answer_to_wiki(question: str, answer: str, sources: list[str]) -> str:
    """Save a Q&A answer to wiki/insights/ as a proper wiki article."""
    now = datetime.now().isoformat()

    # Create slug from question
    slug = re.sub(r"[^\w\s-]", "", question.lower())
    slug = re.sub(r"[\s_-]+", "-", slug)[:50]
    slug = f"qa-{slug}"

    insights_dir = config.wiki_dir / "insights"
    insights_dir.mkdir(parents=True, exist_ok=True)

    output_path = insights_dir / f"{slug}.md"

    content = f"""---
id: "wiki_{slug}"
type: "insight"
title: "{question}"
created: "{now}"
updated: "{now}"
sources: {sources}
tags: ["qa", "insight"]
backlinks: []
---

# {question}

{answer}

---
*Saved from Cortex Q&A on {datetime.now().strftime("%Y-%m-%d")}.*
"""

    output_path.write_text(content)

    # Rebuild the index to include this new insight
    index_path = config.wiki_dir / "_index.md"
    if index_path.exists():
        # Quick append to index rather than full LLM rebuild
        index_content = index_path.read_text()
        entry = f"\n| [[{slug}]] | {question[:80]} | qa, insight | {len(sources)} |\n"
        if "## Insights" in index_content:
            # Insert after the Insights header + table header
            idx = index_content.find("## Insights")
            table_start = index_content.find("| Article |", idx)
            if table_start != -1:
                table_end = index_content.find("\n\n", table_start)
                if table_end == -1:
                    table_end = len(index_content)
                index_content = index_content[:table_end] + entry + index_content[table_end:]
            else:
                index_content += f"\n| Article | Summary | Tags | Sources |\n|---------|---------|------|--------|\n{entry}"
            index_path.write_text(index_content)

    return slug
