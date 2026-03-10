import redis
from rq import Queue

from . import config

def get_redis_connection() -> redis.Redis:
    return redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT)

def get_queues(conn: redis.Redis):
    return {
        "video": Queue(config.VIDEO_QUEUE_NAME, connection=conn),
        "chunking": Queue(config.CHUNKING_QUEUE_NAME, connection=conn),
        "processing": Queue(config.PROCESSING_QUEUE_NAME, connection=conn),
        "assembly": Queue(config.ASSEMBLY_QUEUE_NAME, connection=conn),
    }
