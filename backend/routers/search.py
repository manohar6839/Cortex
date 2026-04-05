"""Search router - full-text search endpoints."""
from fastapi import APIRouter

from ..services.search_engine import search_engine

router = APIRouter()


@router.get("")
async def search(q: str, limit: int = 10):
    """Search the wiki using TF-IDF."""
    results = search_engine.search(q, top_k=limit)
    return {"results": results}


@router.post("/reindex")
async def reindex():
    """Rebuild the search index."""
    search_engine.build_index()
    return {"status": "index rebuilt"}
