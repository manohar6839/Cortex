"""Log router — serve activity log entries."""
from fastapi import APIRouter, Query

from ..services.log_service import read_log

router = APIRouter()


@router.get("")
async def get_log(limit: int = Query(default=20, ge=1, le=100)):
    """Get recent activity log entries.

    Returns newest-first list of log events.
    """
    entries = read_log(limit=limit)
    return {"entries": entries, "total": len(entries)}
