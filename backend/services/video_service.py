import glob
import os
import uuid
from typing import Any, Dict, List

from flask import current_app, Request
from werkzeug.utils import secure_filename

from ..app import db
from ..models import Video, ResolutionPreset, BitratePreset, AudioBitratePreset, CRFPreset, Preset
from ..queues import get_redis_connection, get_queues

def _parse_params(raw: str | None) -> Dict[str, Any]:
    import json
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}

def _enum_from_name(enum_cls, name: str | None):
    if not name:
        return None
    try:
        return enum_cls[name]
    except KeyError:
        return None


def _get_temp_upload_folder() -> str:
    folder = (
        current_app.config.get("TEMP_UPLOAD_FOLDER")
        or current_app.config.get("UPLOAD_FOLDER")
    )
    if not folder:
        raise RuntimeError("TEMP_UPLOAD_FOLDER is not configured")
    os.makedirs(folder, exist_ok=True)
    return folder


def _get_outputs_folder() -> str:
    folder = current_app.config.get("OUTPUTS_FOLDER")
    if not folder:
        raise RuntimeError("OUTPUTS_FOLDER is not configured")
    os.makedirs(folder, exist_ok=True)
    return folder


def _get_video_output_path(video: Video) -> str | None:
    if not video.stored_filename:
        return None

    outputs_folder = _get_outputs_folder()
    base_name = os.path.splitext(video.stored_filename)[0]

    candidates = sorted(
        glob.glob(os.path.join(outputs_folder, f"{base_name}*")),
        key=os.path.getmtime,
        reverse=True,
    )

    for path in candidates:
        if os.path.isfile(path):
            return path

    return None


def create_videos_from_request(request: Request) -> List[dict]:
    if "video" not in request.files:
        raise ValueError("No video file part in the request")

    files = request.files.getlist("video")
    params = _parse_params(request.form.get("params"))

    resolution = _enum_from_name(ResolutionPreset, params.get("resolution"))
    video_bitrate = _enum_from_name(BitratePreset, params.get("videoBitrate"))
    audio_bitrate = _enum_from_name(AudioBitratePreset, params.get("audioBitrate"))
    crf_value = _enum_from_name(CRFPreset, params.get("crfValue"))
    preset = _enum_from_name(Preset, params.get("preset"))
    video_codec = params.get("videoCodec")
    audio_codec = params.get("audioCodec")

    upload_folder = current_app.config["UPLOAD_FOLDER"]

    redis_conn = get_redis_connection()
    created: list[dict] = []

    for file in files:
        if file.filename == "":
            continue

        original_filename = secure_filename(file.filename)
        file_uid = str(uuid.uuid4())
        ext = os.path.splitext(original_filename)[1]
        stored_filename = f"{file_uid}{ext}"

        save_path = os.path.join(upload_folder, stored_filename)
        file.save(save_path)
        file_size = os.path.getsize(save_path)

        video = Video(
            filename=original_filename,
            stored_filename=stored_filename,
            status="uploaded",
            uploader_ip=request.remote_addr,
            size=file_size,
            resolution=resolution,
            video_bitrate=video_bitrate,
            audio_bitrate=audio_bitrate,
            crf_value=crf_value,
            preset=preset,
            video_codec=video_codec,
            audio_codec=audio_codec,
        )
        db.session.add(video)
        db.session.commit()

        redis_conn.hset(
            f"video:{file_uid}",
            mapping={
                "status": "uploaded",
                "progress": 0,
                "resolution": resolution.name if resolution else "",
            },
        )

        created.append(
            {
                "id": video.id,
                "file_uid": file_uid,
                **video.to_dict(),
                "download_url": None,
            }
        )
        enqueue_processing_jobs(file_uid, ext, params)

    return created

def enqueue_processing_jobs(file_uid: str, ext: str, params: dict):
    conn = get_redis_connection()
    queues = get_queues(conn)
    from ..tasks.video_tasks import chunk_video_task, process_video_task

    queues["chunking"].enqueue(chunk_video_task, file_uid, ext, params)
    queues["processing"].enqueue(process_video_task, file_uid, ext, params)

def list_videos() -> list[dict]:
    videos = Video.query.order_by(Video.created_at.desc()).all()

    result = []
    for v in videos:
        output_path = _get_video_output_path(v)

        result.append(
            {
                **v.to_dict(),
                "download_url": f"/api/videos/{v.id}/download" if output_path else None,
            }
        )

    return result

def get_video_download_path(video_id: int) -> tuple[str, str]:
    video = Video.query.get(video_id)
    if not video:
        raise ValueError("Video not found")

    output_path = _get_video_output_path(video)
    if not output_path:
        raise FileNotFoundError("Compressed video is not available yet")

    download_name = os.path.basename(output_path)
    return output_path, download_name

def delete_video(video_id: int) -> bool:
    video = Video.query.get(video_id)
    if not video:
        return False

    temp_folder = _get_temp_upload_folder()
    outputs_folder = _get_outputs_folder()

    if video.stored_filename:
        original_path = os.path.join(temp_folder, video.stored_filename)
        if os.path.exists(original_path) and os.path.isfile(original_path):
            os.remove(original_path)

        base_name = os.path.splitext(video.stored_filename)[0]

        output_candidates = glob.glob(os.path.join(outputs_folder, f"{base_name}*"))
        for path in output_candidates:
            if os.path.isfile(path):
                os.remove(path)

    db.session.delete(video)
    db.session.commit()
    return True
