# ClipCrunch

a video compression and processing app that uses **distributed systems** and **Redis-based queues** to manage uploads and handle background encoding efficiently. The backend runs in Docker, while the frontend is built with Next.js and offers simple, user-friendly compression presets.
---

## What the Application Does

ClipCrunch lets users:

- **Upload videos** and choose how they should be compressed.
- **Process videos in the background** via a worker that chunks, re-encodes, and reassembles files using FFmpeg.
- **See live progress** over a long-lived connection (Server-Sent Events) instead of polling.
- **Browse processed videos** in a history view.

The frontend offers **easier compression options** so you don’t have to tune resolution, bitrate, codec, etc. manually:

- **Compression presets**: Web/Small (smallest size), Standard (balanced), High Quality (better visuals).
- **Speed presets**: Fast (quickest), Balanced, Better Compression (slower, potentially smaller files).

These presets map to underlying resolution, bitrate, and encoding settings on the backend.

---

## Distributed Systems and Redis Queues

ClipCrunch uses a **queue-based architecture** so the web server stays responsive while heavy work runs elsewhere.

- **Redis** stores job metadata and status; **RQ (Redis Queue)** manages job queues and workers.
- **Flow**:
  1. User uploads a video → Flask saves the file and enqueues a **chunking** job.
  2. A **worker** (separate process/container) picks up the job, splits the video into chunks with FFmpeg, and may enqueue a **processing** job.
  3. Another worker run processes each chunk (resize, re-encode) and then **reassembles** the final video.
  4. Status (e.g. `uploaded` → `chunking` → `processing` → `completed`) is written to Redis; the frontend subscribes to an **SSE stream** and shows progress without polling.

So the system is **distributed**: HTTP API, Redis, and one or more RQ workers run as separate services (e.g. separate Docker containers), with Redis as the coordination layer and job queue.

---
## Installation Steps
### Backend (Docker)

#### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

#### Install and run

1. Clone the repo and go to the project root:
   ```bash
   cd /path/to/clipcrunch
   ```

2. Start Redis, web API, and worker:
   ```bash
   docker compose up --build -d
   ```

3. Create the database (run once per environment):
   ```bash
   docker exec -it clipcrunch-web flask create_db
   ```
   You should see: `Database created.`

4. Backend is available at **http://localhost:5000**.    
   - Upload: `POST http://localhost:5000/api/upload` (multipart + `params` JSON)

---

### Frontend (Next.js)

#### Prerequisites

- [Node.js](https://nodejs.org/) (LTS) and npm.

#### Install and run

1. From the project root:
   ```bash
   cd frontend
   npm install
   ```

2. Create env file so the app talks to the backend:
   ```bash
   echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api" > .env.local
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open **http://localhost:3000** in a browser.

Ensure the backend (Docker) is running so uploads and status updates work.

---

## Summary

| Component   | How to run                          |
|------------|-------------------------------------|
| Backend    | `docker compose up -d`              |
| Database   | `docker exec -it clipcrunch-web flask create_db` |
| Frontend   | `cd frontend && npm install && npm run dev`      |

The app uses **Redis and RQ** for distributed job processing and **SSE** for real-time progress; the frontend provides **compression and speed presets** for easier use.
