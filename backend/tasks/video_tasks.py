import os
from typing import Any, Dict

from redis import Redis

from ..config import TEMP_UPLOAD_FOLDER
from ..ffmpeg_utils import (
    CHUNKS_DIR,
    OUTPUT_DIR,
    PROCESSED_DIR,
    process_chunk,
    reassemble_video,
    split_video,
)
from ..models import AudioBitratePreset, BitratePreset, ResolutionPreset
from ..queues import get_redis_connection

TARGET_CHUNK_SIZE_BYTES = 4 * 1024 * 1024  # 4MB


def _update_status(redis_conn: Redis, file_uid: str, **fields: Any) -> None:
    key = f"video:{file_uid}"
    redis_conn.hset(key, mapping=fields)


def chunk_video_task(file_uid: str, ext: str, params: Dict[str, Any]):
    redis_conn = get_redis_connection()

    try:
        _update_status(redis_conn, file_uid, status="chunking", progress=5)

        input_path = os.path.join(TEMP_UPLOAD_FOLDER, f"{file_uid}{ext}")
        chunks = split_video(input_path, TARGET_CHUNK_SIZE_BYTES)

        redis_conn.hset(f"video:{file_uid}", "chunks_count", len(chunks))
        _update_status(redis_conn, file_uid, status="chunked", progress=20)
    except Exception as e:
        _update_status(redis_conn, file_uid, status="failed", progress=0, error=str(e))
        raise


def process_video_task(file_uid: str, ext: str, params: Dict[str, Any]):
    redis_conn = get_redis_connection()

    try:
        _update_status(redis_conn, file_uid, status="processing", progress=30)

        resolution = ResolutionPreset[params["resolution"]]
        video_bitrate = BitratePreset[params["videoBitrate"]]
        audio_bitrate = AudioBitratePreset[params["audioBitrate"]]

        chunks = sorted(
            os.path.join(CHUNKS_DIR, f)
            for f in os.listdir(CHUNKS_DIR)
            if f.startswith(f"{file_uid}_chunk_") and f.endswith(ext)
        )

        if not chunks:
            raise ValueError(f"No chunks found for file_uid={file_uid}")

        processed_chunks = []
        for i, chunk in enumerate(chunks):
            out_path = os.path.join(PROCESSED_DIR, f"{file_uid}_processed_{i:03d}{ext}")
            process_chunk(chunk, out_path, resolution, video_bitrate, audio_bitrate)
            processed_chunks.append(out_path)

            pct = 30 + int(40 * (i + 1) / len(chunks))
            _update_status(redis_conn, file_uid, progress=pct)

        output_path = os.path.join(OUTPUT_DIR, f"{file_uid}{ext}")
        input_path = os.path.join(TEMP_UPLOAD_FOLDER, f"{file_uid}{ext}")

        reassemble_video(
            processed_chunks,
            output_path,
            original_input_path=input_path,
        )

        _update_status(redis_conn, file_uid, status="completed", progress=100)
    except Exception as e:
        _update_status(redis_conn, file_uid, status="failed", error=str(e))
        raise
