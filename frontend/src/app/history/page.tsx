"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getVideos } from "../../lib/api";
import type { Video } from "../../types/api";

export default function HistoryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getVideos()
      .then(setVideos)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const getDownloadUrl = (video: Video) => {
    const v = video as Video & {
      download_url?: string;
      output_url?: string;
      file_url?: string;
      url?: string;
    };

    return v.download_url || v.output_url || v.file_url || v.url || null;
  };

  const getStatusClasses = (status?: string) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
      case "done":
      case "success":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
      case "processing":
      case "uploaded":
      case "pending":
        return "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200";
      case "failed":
      case "error":
        return "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200";
      default:
        return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
    }
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
              View past uploads, processing status, and download completed files
            </p>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <p className="text-sm text-slate-500">Loading video history...</p>
              </div>
            ) : videos.length === 0 ? (
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
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {videos.map((v) => {
                      const downloadUrl = getDownloadUrl(v);

                      return (
                        <tr
                          key={v.id}
                          className="transition hover:bg-slate-50/80"
                        >
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
                            {downloadUrl ? (
                              <a
                                href={downloadUrl}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
                              >
                                Download
                              </a>
                            ) : (
                              <span className="text-slate-400">Unavailable</span>
                            )}
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
