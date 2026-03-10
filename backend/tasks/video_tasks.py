import os
from typing import Any, Dict

from redis import Redis

from ..ffmpeg_utils import split_video, process_chunk, reassemble_video, CHUNKS_DIR, PROCESSED_DIR
from ..models import ResolutionPreset, BitratePreset, AudioBitratePreset
from ..queues import get_redis_connection

TARGET_CHUNK_SIZE_BYTES = 4 * 1024 * 1024  # 4MB

def _update_status(redis_conn: Redis, file_uid: str, **fields: Any) -> None:
    key = f"video:{file_uid}"
    redis_conn.hset(key, mapping=fields)

def chunk_video_task(file_uid: str, ext: str, params: Dict[str, Any]):
    redis_conn = get_redis_connection()
    _update_status(redis_conn, file_uid, status="chunking", progress=5)

    input_path = os.path.join("temp_uploads", f"{file_uid}{ext}")
    chunks = split_video(input_path, TARGET_CHUNK_SIZE_BYTES)

    redis_conn.hset(f"video:{file_uid}", "chunks_count", len(chunks))
    _update_status(redis_conn, file_uid, status="chunked", progress=20)


def process_video_task(file_uid: str, params: Dict[str, Any]):
    redis_conn = get_redis_connection()
    _update_status(redis_conn, file_uid, status="processing", progress=30)

    resolution = ResolutionPreset[params["resolution"]]
    video_bitrate = BitratePreset[params["videoBitrate"]]
    audio_bitrate = AudioBitratePreset[params["audioBitrate"]]

    chunks = sorted(
        os.path.join(CHUNKS_DIR, f)
        for f in os.listdir(CHUNKS_DIR)
        if f.startswith(file_uid) and f.endswith(".mp4")
    )

    processed_chunks = []
    for i, chunk in enumerate(chunks):
        out_path = os.path.join(PROCESSED_DIR, f"{file_uid}_processed_{i:03d}.mp4")
        process_chunk(chunk, out_path, resolution, video_bitrate, audio_bitrate)
        processed_chunks.append(out_path)
        pct = 30 + int(40 * (i + 1) / len(chunks))
        _update_status(redis_conn, file_uid, progress=pct)

    output_path = os.path.join("outputs", f"{file_uid}.mp4")
    os.makedirs("outputs", exist_ok=True)
    reassemble_video(processed_chunks, output_path)
    _update_status(redis_conn, file_uid, status="completed", progress=100)
