"""Compile router - wiki compilation endpoints."""
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..services.compiler import compile_all, compile_source
from ..config import config

router = APIRouter()


class CompileRequest(BaseModel):
    full: bool = False
    source_id: str | None = None


@router.post("")
async def trigger_compile(request: CompileRequest):
    """Trigger wiki compilation."""
    if request.source_id:
        # Compile single source
        for file_path in config.raw_dir.rglob("*.md"):
            if file_path.name.startswith(request.source_id):
                result = await compile_source(request.source_id, file_path, force=request.full)
                return result
        raise HTTPException(status_code=404, detail="Source not found")

    # Compile all pending
    result = await compile_all(force=request.full)
    return result


@router.post("/stream")
async def stream_compile(request: CompileRequest):
    """Trigger wiki compilation with SSE streaming."""

    async def generate():
        if request.source_id:
            # Stream single source compilation
            yield f"data: {{'status': 'starting', 'message': 'Compiling {request.source_id}'}}\n\n"
            for file_path in config.raw_dir.rglob("*.md"):
                if file_path.name.startswith(request.source_id):
                    yield f"data: {{'status': 'processing', 'message': 'Processing source'}}\n\n"
                    result = await compile_source(request.source_id, file_path, force=request.full)
                    yield f"data: {{'status': 'complete', 'result': {result}}}\n\n"
                    break
        else:
            # Stream all compilation
            yield f"data: {{'status': 'starting', 'message': 'Finding pending sources'}}\n\n"
            result = await compile_all(force=request.full)

            for i, r in enumerate(result.get("results", [])):
                yield f"data: {{'status': 'progress', 'current': {i+1}, 'total': {result['total']}, 'result': {r}}}\n\n"

            yield f"data: {{'status': 'complete', 'summary': {{'total': {result['total']}, 'compiled': {result['compiled']}, 'errors': {result['errors']}}}}}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
