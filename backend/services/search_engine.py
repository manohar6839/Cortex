"""TF-IDF Search Engine for wiki."""
import math
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from ..config import config


class WikiSearchEngine:
    """Simple TF-IDF search over wiki markdown files."""

    def __init__(self):
        self.index: dict[str, dict[str, int]] = {}  # word -> {doc: count}
        self.doc_lengths: dict[str, int] = {}  # doc -> total words
        self.doc_titles: dict[str, str] = {}  # doc -> title
        self.total_docs: int = 0
        self.doc_freq: dict[str, int] = {}  # word -> number of docs containing it

    def build_index(self) -> None:
        """Scan all .md files and build inverted index."""
        self.index.clear()
        self.doc_lengths.clear()
        self.doc_titles.clear()
        self.doc_freq.clear()
        self.total_docs = 0

        for file_path in config.wiki_dir.rglob("*.md"):
            if file_path.name.startswith("_"):
                continue

            doc_id = str(file_path.relative_to(config.wiki_dir))
            content = file_path.read_text()

            # Extract title from first heading
            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            if title_match:
                self.doc_titles[doc_id] = title_match.group(1)
            else:
                self.doc_titles[doc_id] = file_path.stem

            # Tokenize
            words = self._tokenize(content)
            self.doc_lengths[doc_id] = len(words)

            # Count word frequencies
            word_counts: dict[str, int] = defaultdict(int)
            for word in words:
                word_counts[word] += 1

            # Add to inverted index
            for word, count in word_counts.items():
                if word not in self.index:
                    self.index[word] = {}
                self.index[word][doc_id] = count

            self.total_docs += 1

        # Calculate document frequencies
        for word, doc_counts in self.index.items():
            self.doc_freq[word] = len(doc_counts)

    def _tokenize(self, text: str) -> list[str]:
        """Tokenize text into words."""
        # Remove markdown syntax
        text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)  # [[wiki-links]]
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # [links](urls)
        text = re.sub(r"#+ ", "", text)  # headings
        text = re.sub(r"[*_`~]", "", text)  # formatting

        # Split into words
        words = re.findall(r"\b[a-z][a-z0-9]+\b", text.lower())

        # Remove common stop words
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
            "be", "have", "has", "had", "do", "does", "did", "will", "would",
            "could", "should", "may", "might", "can", "this", "that", "these",
            "those", "it", "its", "they", "them", "their", "what", "which",
            "who", "whom", "when", "where", "why", "how", "all", "each", "every",
        }
        return [w for w in words if w not in stop_words and len(w) > 2]

    def search(self, query: str, top_k: int = 10) -> list[dict[str, Any]]:
        """Search wiki using TF-IDF ranking.

        Returns:
            List of search results with doc_id, title, score, and snippet.
        """
        if not self.index:
            self.build_index()

        query_words = self._tokenize(query)
        if not query_words:
            return []

        # Calculate TF-IDF scores
        scores: dict[str, float] = defaultdict(float)

        for word in query_words:
            if word not in self.index:
                continue

            # IDF for this word
            idf = math.log(self.total_docs / (1 + self.doc_freq.get(word, 0)))

            # TF-IDF for each doc
            for doc_id, count in self.index[word].items():
                tf = count / max(1, self.doc_lengths.get(doc_id, 1))
                scores[doc_id] += tf * idf

        # Sort by score
        sorted_docs = sorted(scores.items(), key=lambda x: -x[1])

        # Build results
        results = []
        for doc_id, score in sorted_docs[:top_k]:
            file_path = config.wiki_dir / doc_id
            content = file_path.read_text() if file_path.exists() else ""

            # Generate snippet
            snippet = self._generate_snippet(content, query_words)

            results.append({
                "doc_id": doc_id,
                "title": self.doc_titles.get(doc_id, doc_id),
                "score": round(score, 4),
                "snippet": snippet,
                "url": f"/wiki/{doc_id}",
            })

        return results

    def _generate_snippet(self, content: str, query_words: list[str], max_length: int = 200) -> str:
        """Generate a relevant snippet from content."""
        sentences = re.split(r"[.!?]\s+", content)

        # Find sentence with most query words
        best_sentence = ""
        best_count = 0

        for sentence in sentences:
            sentence_lower = sentence.lower()
            count = sum(1 for word in query_words if word in sentence_lower)
            if count > best_count:
                best_count = count
                best_sentence = sentence

        if not best_sentence:
            best_sentence = sentences[0] if sentences else content[:max_length]

        if len(best_sentence) > max_length:
            best_sentence = best_sentence[:max_length] + "..."

        return best_sentence


# Global search engine instance
search_engine = WikiSearchEngine()
