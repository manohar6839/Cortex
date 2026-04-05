"""YouTube content extractor."""
import httpx
from typing import Any


async def extract_youtube(url: str) -> dict[str, Any]:
    """Extract transcript and metadata from YouTube video.

    Args:
        url: YouTube video URL

    Returns:
        Dictionary with content, title, author, duration, etc.
    """
    from youtube_transcript_api import YouTubeTranscriptApi
    from urllib.parse import urlparse, parse_qs

    # Extract video ID
    parsed = urlparse(url)
    if parsed.hostname == "youtu.be":
        video_id = parsed.path[1:]
    elif "youtube.com" in parsed.hostname:
        query = parse_qs(parsed.query)
        video_id = query.get("v", [None])[0]
    else:
        raise ValueError(f"Invalid YouTube URL: {url}")

    if not video_id:
        raise ValueError(f"Could not extract video ID from: {url}")

    # Get transcript
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = " ".join(entry["text"] for entry in transcript)
    except Exception:
        # Fallback: try to get auto-generated captions
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            transcript = transcript_list.find_generated_transcript(["en"])
            transcript_text = " ".join(entry["text"] for entry in transcript.fetch())
        except Exception as e:
            raise ValueError(f"Could not get transcript: {e}")

    # Get metadata via oEmbed
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    async with httpx.AsyncClient() as client:
        response = await client.get(oembed_url)
        if response.status_code == 200:
            metadata = response.json()
        else:
            metadata = {}

    # Calculate duration from transcript timestamps
    duration = ""
    if transcript:
        last_entry = transcript[-1]
        total_seconds = int(last_entry.get("start", 0) + last_entry.get("duration", 0))
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        duration = f"{minutes}:{seconds:02d}"

    return {
        "type": "youtube",
        "source_url": url,
        "title": metadata.get("title", f"YouTube Video {video_id}"),
        "author": metadata.get("author_name", "Unknown"),
        "platform": "youtube",
        "duration": duration,
        "content": transcript_text,
        "has_transcript": True,
        "word_count": len(transcript_text.split()),
    }
