FROM python:3.11-slim

WORKDIR /app

# Install system deps for ffmpeg-python
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy backend code and requirements
COPY backend ./backend
COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# Environment for Flask + Redis
ENV FLASK_APP=backend.app:create_app
ENV FLASK_ENV=development
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

# Default command can be overridden by docker-compose
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]