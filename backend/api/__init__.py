from flask import Blueprint, Flask

def register_blueprints(app: Flask) -> None:
    from .upload import upload_bp
    from .videos import videos_bp
    from .status import status_bp

    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(videos_bp, url_prefix="/api")
    app.register_blueprint(status_bp, url_prefix="/api")