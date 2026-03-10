from flask import Blueprint, jsonify, request

from ..services.video_service import create_videos_from_request

upload_bp = Blueprint("upload", __name__)

@upload_bp.route("/upload", methods=["POST"])
def upload_video():
    try:
        created = create_videos_from_request(request)
        return jsonify({"uploaded": created}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
