from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import redis
from rq import Queue

from . import config

db = SQLAlchemy()

redis_conn = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT)

video_queue = Queue(config.VIDEO_QUEUE_NAME, connection=redis_conn)
chunking_queue = Queue(config.CHUNKING_QUEUE_NAME, connection=redis_conn)
processing_queue = Queue(config.PROCESSING_QUEUE_NAME, connection=redis_conn)
assembly_queue = Queue(config.ASSEMBLY_QUEUE_NAME, connection=redis_conn)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config["UPLOAD_FOLDER"] = config.TEMP_UPLOAD_FOLDER

    CORS(app, resources={r"/*": {"origins": "*"}})
    db.init_app(app)

    from .api import register_blueprints
    register_blueprints(app)

    @app.cli.command("create_db")
    def create_db_command():
        with app.app_context():
            db.create_all()
            print("Database created.")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)