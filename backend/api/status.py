from flask import Blueprint, jsonify

status_bp = Blueprint("status", __name__)

@status_bp.route("/status/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok"}), 200