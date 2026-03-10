import time
import json
from flask import Blueprint, jsonify, Response, stream_with_context
from ..services.status_service import get_status

status_bp = Blueprint("status", __name__)

@status_bp.route("/status/<file_uid>", methods=["GET"])
def get_status_endpoint(file_uid: str):
    dto = get_status(file_uid)
    if dto is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(dto.to_json()), 200

@status_bp.route("/status/stream/<file_uid>", methods=["GET"])
def status_stream(file_uid: str):
    def event_stream():
        while True:
            dto = get_status(file_uid)
            if dto is None:
                yield 'data: {"error":"not found"}\n\n'
                break
            payload = dto.to_json()
            yield f"data: {json.dumps(payload)}\n\n"
            if payload["status"] in {"completed", "failed"}:
                break
            time.sleep(1)
    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
    )