from flask import Blueprint, jsonify

upload_bp = Blueprint("upload", __name__)

@upload_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200