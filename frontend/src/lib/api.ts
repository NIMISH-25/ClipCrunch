"use client";

import axios from "axios";
import type { ProcessingParams, Video, UploadedVideo, Status } from "../types/api";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api",
});

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
  onError?: (err: Event) => void
): EventSource {
  const base = api.defaults.baseURL!.replace(/\/+$/, "");
  const url = `${base}/status/stream/${fileUid}`;

  const es = new EventSource(url);

  es.onmessage = (event) => {
    const data: Status = JSON.parse(event.data);
    onStatus(data);
    if (data.status === "completed" || data.status === "failed") {
      es.close();
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
