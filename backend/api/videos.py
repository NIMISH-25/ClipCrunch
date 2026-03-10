from flask import Blueprint, jsonify

videos_bp = Blueprint("videos", __name__)

@videos_bp.route("/videos", methods=["GET"])
def list_videos():
    return jsonify([]), 200