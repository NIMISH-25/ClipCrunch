from flask import Blueprint, jsonify

from ..services.video_service import list_videos

videos_bp = Blueprint("videos", __name__)

@videos_bp.route("/videos", methods=["GET"])
def get_all_videos():
    try:
        return jsonify(list_videos()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
