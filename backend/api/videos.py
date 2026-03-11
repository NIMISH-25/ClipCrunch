from flask import Blueprint, jsonify, send_file

from ..services.video_service import (
    list_videos,
    get_video_download_path,
    delete_video,
)

videos_bp = Blueprint("videos", __name__)

@videos_bp.route("/videos", methods=["GET"])
def get_all_videos():
    try:
        return jsonify(list_videos()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@videos_bp.route("/videos/<int:video_id>/download", methods=["GET"])
def download_video(video_id: int):
    try:
        file_path, download_name = get_video_download_path(video_id)

        return send_file(
            file_path,
            as_attachment=True,
            download_name=download_name,
        )
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@videos_bp.route("/videos/<int:video_id>", methods=["DELETE"])
def remove_video(video_id: int):
    try:
        deleted = delete_video(video_id)
        if not deleted:
            return jsonify({"error": "Video not found"}), 404

        return jsonify({"message": "Video deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
