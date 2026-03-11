"use client";

import axios from "axios";
import type {
  ProcessingParams,
  Video,
  UploadedVideo,
  Status,
} from "../types/api";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api").replace(
    /\/+$/,
    ""
  );

const api = axios.create({
  baseURL: API_BASE_URL,
});

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function uploadVideo(
  file: File,
  params: ProcessingParams
): Promise<{ uploaded: UploadedVideo[] }> {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("params", JSON.stringify(params));

  const res = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export function listenToStatusEvents(
  fileUid: string,
  onStatus: (s: Status) => void,
  onDone?: (s: Status) => void,
  onError?: (err: Event) => void
): EventSource {
  const url = buildApiUrl(`/status/stream/${fileUid}`);
  const es = new EventSource(url);

  es.onmessage = (event) => {
    const data: Status = JSON.parse(event.data);
    onStatus(data);

    const normalizedStatus = String(data.status || "").toLowerCase();
    const isTerminal =
      normalizedStatus === "completed" ||
      normalizedStatus === "failed" ||
      normalizedStatus === "error";

    if (isTerminal) {
      es.close();
      onDone?.(data);
    }
  };

  es.onerror = (err) => {
    es.close();
    onError?.(err);
  };

  return es;
}

export async function getVideos(): Promise<Video[]> {
  const res = await api.get<Video[]>("/videos");
  return res.data;
}

export async function deleteVideo(videoId: number | string): Promise<void> {
  await api.delete(`/videos/${videoId}`);
}

export function getVideoDownloadUrl(video: Video): string | null {
  const candidate =
    (video as Video & {
      download_url?: string;
      output_url?: string;
      file_url?: string;
      url?: string;
    }).download_url ||
    (video as Video & {
      output_url?: string;
      file_url?: string;
      url?: string;
    }).output_url ||
    (video as Video & {
      file_url?: string;
      url?: string;
    }).file_url ||
    (video as Video & {
      url?: string;
    }).url ||
    (video.id ? `/api/videos/${video.id}/download` : null);

  if (!candidate) return null;

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (candidate.startsWith("/api/")) {
    return `${API_BASE_URL.replace(/\/api$/, "")}${candidate}`;
  }

  if (candidate.startsWith("/")) {
    return `${API_BASE_URL.replace(/\/api$/, "")}${candidate}`;
  }

  return buildApiUrl(candidate);
}

export { api, API_BASE_URL };
