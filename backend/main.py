"""Cortex Backend - FastAPI Application."""
from contextlib import asynccontextmanager
import sys
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import config
from backend.routers import ingest, compile, wiki, qa, search, lint, graph, raw, stats, settings, log
from backend.services.search_engine import search_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize data directories and search index on startup."""
    config.raw_dir.mkdir(parents=True, exist_ok=True)
    config.wiki_dir.mkdir(parents=True, exist_ok=True)
    config.output_dir.mkdir(parents=True, exist_ok=True)

    # Create wiki subdirectories
    (config.wiki_dir / "concepts").mkdir(exist_ok=True)
    (config.wiki_dir / "entities").mkdir(exist_ok=True)
    (config.wiki_dir / "connections").mkdir(exist_ok=True)
    (config.wiki_dir / "insights").mkdir(exist_ok=True)

    # Build search index
    print("Building search index...")
    try:
        search_engine.build_index()
        print(f"Search index built: {search_engine.total_docs} documents indexed")
    except Exception as e:
        print(f"Warning: Failed to build search index: {e}")

    yield


app = FastAPI(
    title="Cortex API",
    description="AI-Powered Personal Knowledge Base",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(ingest.router, prefix="/api/ingest", tags=["Ingest"])
app.include_router(compile.router, prefix="/api/compile", tags=["Compile"])
app.include_router(wiki.router, prefix="/api/wiki", tags=["Wiki"])
app.include_router(qa.router, prefix="/api/qa", tags=["Q&A"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(lint.router, prefix="/api/lint", tags=["Lint"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(raw.router, prefix="/api/raw", tags=["Raw"])
app.include_router(stats.router, prefix="/api/stats", tags=["Stats"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(log.router, prefix="/api/log", tags=["Log"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "app": "Cortex", "version": "0.1.0"}


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
