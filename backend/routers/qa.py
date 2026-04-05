"""Q&A router - question answering endpoints."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..services.qa_engine import answer_question, stream_answer

router = APIRouter()


class QARequest(BaseModel):
    question: str
    save_to_wiki: bool = False


@router.post("")
async def ask_question(request: QARequest):
    """Ask a question and get an answer."""
    result = await answer_question(request.question, save_to_wiki=request.save_to_wiki)
    return result


@router.post("/stream")
async def stream_question(request: QARequest):
    """Ask a question and stream the answer."""

    async def generate():
        async for chunk in stream_answer(request.question):
            yield chunk

    return StreamingResponse(generate(), media_type="text/event-stream")
