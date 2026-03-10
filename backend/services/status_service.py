from typing import Optional

from redis import Redis

from ..dto import StatusDTO
from ..queues import get_redis_connection

def _get_conn() -> Redis:
    return get_redis_connection()

def get_status(file_uid: str) -> Optional[StatusDTO]:
    conn = _get_conn()
    key = f"video:{file_uid}"
    data = conn.hgetall(key)
    if not data:
        return None

    def _decode(val):
        return val.decode("utf-8") if isinstance(val, bytes) else val

    status = _decode(data.get(b"status", "unknown"))
    progress = int(_decode(data.get(b"progress", "0")))
    step = _decode(data.get(b"step")) if b"step" in data else None
    message = _decode(data.get(b"message")) if b"message" in data else None

    return StatusDTO(
        file_uid=file_uid,
        status=status,
        progress=progress,
        step=step,
        message=message,
    )
