"""PDF content extractor."""
import io
from typing import Any

import httpx
import fitz  # pymupdf


async def extract_pdf(url: str | None = None, file_content: bytes | None = None) -> dict[str, Any]:
    """Extract text from PDF (either from URL or uploaded file).

    Args:
        url: URL to download PDF from
        file_content: Raw PDF bytes if uploading directly

    Returns:
        Dictionary with extracted text and metadata.
    """
    if url:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise ValueError(f"Failed to download PDF: {response.status_code}")
            pdf_bytes = response.content
        title = url.split("/")[-1] or "PDF Document"
    elif file_content:
        pdf_bytes = file_content
        title = "Uploaded PDF"
    else:
        raise ValueError("Either url or file_content must be provided")

    # Extract text using pymupdf
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts = []
    metadata = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        text_parts.append(page.get_text())
        if page_num == 0:
            # Get metadata from first page
            metadata = page.get_text("dict")

    doc.close()

    full_text = "\n\n".join(text_parts)

    # Extract author from metadata if available
    author = ""
    if hasattr(doc, "metadata") and doc.metadata:
        author = doc.metadata.get("author", "")

    return {
        "type": "pdf",
        "source_url": url or "",
        "title": title,
        "author": author,
        "platform": "upload" if not url else "web",
        "content": full_text,
        "page_count": len(text_parts),
        "word_count": len(full_text.split()),
    }


async def extract_pdf_upload(file_content: bytes, filename: str) -> dict[str, Any]:
    """Extract text from uploaded PDF file.

    Args:
        file_content: Raw PDF bytes
        filename: Original filename

    Returns:
        Dictionary with extracted text and metadata.
    """
    result = await extract_pdf(file_content=file_content)
    result["title"] = filename
    result["platform"] = "upload"
    return result
