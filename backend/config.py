import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.getenv("CLIPCRUNCH_DATA_DIR", os.path.join(os.path.dirname(BASE_DIR), "data"))
TEMP_UPLOAD_FOLDER = os.path.join(DATA_DIR, "temp_uploads")
os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)

SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(DATA_DIR, "videos.db")
SQLALCHEMY_TRACK_MODIFICATIONS = False

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

VIDEO_QUEUE_NAME = "video_jobs"
CHUNKING_QUEUE_NAME = "chunking_jobs"
PROCESSING_QUEUE_NAME = "processing_jobs"
ASSEMBLY_QUEUE_NAME = "assembly_jobs"