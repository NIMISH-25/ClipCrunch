import os
import uuid
from typing import Any, Dict, List

from flask import current_app, Request
from werkzeug.utils import secure_filename

from ..app import db
from ..models import Video, ResolutionPreset, BitratePreset, AudioBitratePreset, CRFPreset, Preset
from ..queues import get_redis_connection
from .. import config

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
    os.makedirs(upload_folder, exist_ok=True)

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
            }
        )

    return created

def list_videos() -> list[dict]:
    videos = Video.query.all()
    return [v.to_dict() for v in videos]