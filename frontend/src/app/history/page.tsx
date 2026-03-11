"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteVideo,
  getVideoDownloadUrl,
  getVideos,
  listenToStatusEvents,
} from "../../lib/api";
import type { Status, Video } from "../../types/api";

type PendingUpload = {
  id: number | string;
  file_uid: string;
  filename?: string;
  created_at?: string | null;
};

type LiveStatusMap = Record<
  string,
  {
    file_uid: string;
    status: string;
    progress: number;
  }
>;

const PENDING_UPLOADS_KEY = "clipcrunchPendingUploads";

function readPendingUploads(): PendingUpload[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(PENDING_UPLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePendingUploads(items: PendingUpload[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(items));
}

function removePendingUpload(videoId: number | string) {
  const current = readPendingUploads();
  writePendingUploads(
    current.filter((item) => String(item.id) !== String(videoId))
  );
}

export default function HistoryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<LiveStatusMap>({});
  const eventSourcesRef = useRef<Record<string, EventSource>>({});

  useEffect(() => {
    getVideos()
      .then(setVideos)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const pendingUploads = readPendingUploads();

    pendingUploads.forEach((pending) => {
      const key = String(pending.id);

      if (eventSourcesRef.current[key]) return;

      setLiveStatuses((prev) => ({
        ...prev,
        [key]: {
          file_uid: pending.file_uid,
          status: "processing",
          progress: 0,
        },
      }));

      const es = listenToStatusEvents(
        pending.file_uid,
        (s: Status) => {
          setLiveStatuses((prev) => ({
            ...prev,
            [key]: {
              file_uid: pending.file_uid,
              status: String(s.status || "processing"),
              progress: Number(s.progress || 0),
            },
          }));
        },
        (s: Status) => {
          const normalized = String(s.status || "").toLowerCase();

          setLiveStatuses((prev) => ({
            ...prev,
            [key]: {
              file_uid: pending.file_uid,
              status:
                normalized === "completed" ? "processed" : String(s.status || ""),
              progress: Number(s.progress || 0),
            },
          }));

          removePendingUpload(pending.id);
          delete eventSourcesRef.current[key];

          getVideos().then(setVideos).catch(console.error);
        },
        (err) => {
          console.error("History SSE error:", err);
        }
      );

      eventSourcesRef.current[key] = es;
    });

    return () => {
      Object.values(eventSourcesRef.current).forEach((es) => es.close());
      eventSourcesRef.current = {};
    };
  }, []);

  const mergedVideos = useMemo(() => {
    const pendingUploads = readPendingUploads();
    const existingIds = new Set(videos.map((v) => String(v.id)));

    const syntheticPendingRows: Video[] = pendingUploads
      .filter((pending) => !existingIds.has(String(pending.id)))
      .map((pending) => ({
        id: pending.id as number,
        filename: pending.filename || "Processing video",
        status: "processing",
        resolution: null,
        created_at: pending.created_at ?? new Date().toISOString(),
      } as Video));

    const combined = [...syntheticPendingRows, ...videos];

    return combined.map((video) => {
      const live = liveStatuses[String(video.id)];
      if (!live) return video;

      const normalized = String(live.status || "").toLowerCase();

      return {
        ...video,
        status: normalized === "completed" ? "processed" : live.status,
      };
    });
  }, [videos, liveStatuses]);

  const handleDelete = async (videoId: number | string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this video?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(videoId);
      await deleteVideo(videoId);
      setVideos((prev) => prev.filter((video) => video.id !== videoId));
      setLiveStatuses((prev) => {
        const next = { ...prev };
        delete next[String(videoId)];
        return next;
      });
      removePendingUpload(videoId);
    } catch (error) {
      console.error("Failed to delete video:", error);
      alert("Failed to delete video. Check console for details.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusClasses = (status?: string) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
      case "processed":
      case "done":
      case "success":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
      case "processing":
      case "uploaded":
      case "pending":
      case "chunking":
      case "chunked":
        return "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200";
      case "failed":
      case "error":
        return "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200";
      default:
        return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
    }
  };

  const isActionEnabled = (video: Video) => {
    const effectiveStatus = String(video.status || "").toLowerCase();
    return (
      effectiveStatus === "processed" ||
      effectiveStatus === "completed" ||
      effectiveStatus === "done" ||
      effectiveStatus === "success"
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              ClipCrunch
            </h1>
            <p className="text-sm text-slate-500">
              Browse previously uploaded and processed videos
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-purple-300 hover:text-purple-700 hover:shadow"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Video History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View past uploads, live processing status, download files, or delete old entries
            </p>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <p className="text-sm text-slate-500">Loading video history...</p>
              </div>
            ) : mergedVideos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <p className="text-base font-medium text-slate-700">
                  No videos found
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Your uploaded videos will appear here once available.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Filename
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Resolution
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Download
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Delete
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {mergedVideos.map((v) => {
                      const downloadUrl = getVideoDownloadUrl(v);
                      const isDeleting = deletingId === v.id;
                      const canAct = isActionEnabled(v);

                      return (
                        <tr key={v.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-4 font-medium text-slate-800">
                            {v.filename}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                                v.status
                              )}`}
                            >
                              {v.status || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {v.resolution || "-"}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {v.created_at
                              ? new Date(v.created_at).toLocaleString()
                              : "-"}
                          </td>

                          <td className="px-4 py-4">
                            <a
                              href={canAct && downloadUrl ? downloadUrl : undefined}
                              download={canAct && downloadUrl ? true : undefined}
                              target={canAct && downloadUrl ? "_blank" : undefined}
                              rel={canAct && downloadUrl ? "noreferrer" : undefined}
                              aria-disabled={!canAct || !downloadUrl}
                              onClick={(e) => {
                                if (!canAct || !downloadUrl) {
                                  e.preventDefault();
                                }
                              }}
                              className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                                canAct && downloadUrl
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : "cursor-not-allowed bg-purple-300"
                              }`}
                            >
                              Download
                            </a>
                          </td>

                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleDelete(v.id)}
                              disabled={isDeleting || !canAct}
                              className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
