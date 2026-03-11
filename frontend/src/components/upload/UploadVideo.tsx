"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import { uploadVideo } from "../../lib/api";
import type { ProcessingParams, UploadedVideo } from "../../types/api";

type CompressionPreset = "WEB_SMALL" | "STANDARD" | "HIGH_QUALITY";
type SpeedPreset = "FAST" | "BALANCED" | "BETTER_COMPRESSION";

const CompressionOptions: {
  label: string;
  value: CompressionPreset;
  description: string;
}[] = [
  {
    label: "Web / Small",
    value: "WEB_SMALL",
    description: "Smallest file size, best for sharing and uploads",
  },
  {
    label: "Standard",
    value: "STANDARD",
    description: "Balanced quality and file size for most videos",
  },
  {
    label: "High Quality",
    value: "HIGH_QUALITY",
    description: "Larger file, better visual quality",
  },
];

const SpeedOptions: {
  label: string;
  value: SpeedPreset;
  description: string;
}[] = [
  {
    label: "Fast",
    value: "FAST",
    description: "Quickest processing time",
  },
  {
    label: "Balanced",
    value: "BALANCED",
    description: "Good balance between speed and compression",
  },
  {
    label: "Better Compression",
    value: "BETTER_COMPRESSION",
    description: "Slower processing, potentially better compression",
  },
];

const defaultParams: ProcessingParams = {
  chunkSize: 4,
  maxNodes: 5,
  resolution: "FHD_1080",
  audioCodec: "AAC",
  audioBitrate: "STANDARD",
  videoCodec: "H264",
  videoBitrate: "STANDARD",
  crfValue: "MEDIUM",
  preset: "MEDIUM",
};

type PendingUpload = {
  id: number | string;
  file_uid: string;
  filename?: string;
  created_at?: string | null;
};

const PENDING_UPLOADS_KEY = "clipcrunchPendingUploads";

function savePendingUpload(uploaded: UploadedVideo) {
  if (typeof window === "undefined") return;

  const existingRaw = window.sessionStorage.getItem(PENDING_UPLOADS_KEY);
  const existing: PendingUpload[] = existingRaw ? JSON.parse(existingRaw) : [];

  const nextItem: PendingUpload = {
    id: uploaded.id,
    file_uid: uploaded.file_uid,
    filename: uploaded.filename,
    created_at: uploaded.created_at ?? new Date().toISOString(),
  };

  const deduped = existing.filter(
    (item) => String(item.id) !== String(uploaded.id)
  );

  window.sessionStorage.setItem(
    PENDING_UPLOADS_KEY,
    JSON.stringify([nextItem, ...deduped])
  );
}

function buildParams(
  compressionPreset: CompressionPreset,
  speedPreset: SpeedPreset
): ProcessingParams {
  const compressionMap: Record<CompressionPreset, Partial<ProcessingParams>> = {
    WEB_SMALL: {
      resolution: "MOBILE_360",
      videoBitrate: "MOBILE",
      audioBitrate: "LOW",
      crfValue: "LOW",
      videoCodec: "H264",
      audioCodec: "AAC",
    },
    STANDARD: {
      resolution: "HD_720",
      videoBitrate: "STANDARD",
      audioBitrate: "STANDARD",
      crfValue: "MEDIUM",
      videoCodec: "H264",
      audioCodec: "AAC",
    },
    HIGH_QUALITY: {
      resolution: "FHD_1080",
      videoBitrate: "HIGH",
      audioBitrate: "HIGH",
      crfValue: "HIGH",
      videoCodec: "H264",
      audioCodec: "AAC",
    },
  };

  const speedMap: Record<SpeedPreset, ProcessingParams["preset"]> = {
    FAST: "FAST",
    BALANCED: "MEDIUM",
    BETTER_COMPRESSION: "SLOW",
  };

  return {
    ...defaultParams,
    ...compressionMap[compressionPreset],
    preset: speedMap[speedPreset],
  };
}

export default function UploadVideo() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [compressionPreset, setCompressionPreset] =
    useState<CompressionPreset>("STANDARD");
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>("BALANCED");
  const [isUploading, setIsUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const resetFile = () => {
    setFile(null);
    setIsUploading(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("No file selected.");
      return;
    }

    try {
      setIsUploading(true);

      const params = buildParams(compressionPreset, speedPreset);
      const result = await uploadVideo(file, params);
      const first = result.uploaded[0];

      if (first) {
        savePendingUpload(first);
      }

      router.push("/history");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Check console for details.");
      setIsUploading(false);
    }
  };

  const inputClasses =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100";

  const selectedCompressionDescription =
    CompressionOptions.find((option) => option.value === compressionPreset)
      ?.description ?? "";

  const selectedSpeedDescription =
    SpeedOptions.find((option) => option.value === speedPreset)?.description ??
    "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              ClipCrunch
            </h1>
            <p className="text-sm text-slate-500">
              Upload, compress, and manage your video files
            </p>
          </div>

          <Link
            href="/history"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-purple-300 hover:text-purple-700 hover:shadow"
          >
            History
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Upload Video
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Drag and drop a video or choose one from your device
              </p>
            </div>

            <div className="p-6">
              {!file ? (
                <div
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-300 bg-gradient-to-b from-purple-50 to-white px-6 py-14 text-center transition hover:border-purple-400 hover:bg-purple-50"
                  onClick={openFilePicker}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="mb-4 rounded-full bg-purple-100 p-4 text-purple-600 transition group-hover:scale-105">
                    <svg
                      className="h-10 w-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M7 16V4m0 0l-4 4m4-4l4 4M17 8v8m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  </div>

                  <p className="text-base font-semibold text-slate-800">
                    Drag &amp; drop your video here
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    or click to browse files
                  </p>

                  <input
                    type="file"
                    accept="video/*"
                    ref={inputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="aspect-video flex w-full max-w-xs items-center justify-center rounded-xl border border-slate-200 bg-slate-900">
                      <span className="text-sm font-medium text-slate-300">
                        Video Selected
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-800">
                            Filename:
                          </span>{" "}
                          {file.name}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">
                            Size:
                          </span>{" "}
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">
                            Type:
                          </span>{" "}
                          {file.type || "Unknown"}
                        </p>
                      </div>

                      <button
                        onClick={resetFile}
                        className="mt-5 inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                      >
                        Reupload Video
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {file && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Compression Settings
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pick a simple preset instead of manual encoder settings
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Compression Preset
                    </label>
                    <select
                      className={inputClasses}
                      value={compressionPreset}
                      onChange={(e) =>
                        setCompressionPreset(
                          e.target.value as CompressionPreset
                        )
                      }
                    >
                      {CompressionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-slate-500">
                      {selectedCompressionDescription}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Processing Speed
                    </label>
                    <select
                      className={inputClasses}
                      value={speedPreset}
                      onChange={(e) =>
                        setSpeedPreset(e.target.value as SpeedPreset)
                      }
                    >
                      {SpeedOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-slate-500">
                      {selectedSpeedDescription}
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Start processing
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        You will be redirected to the history page after upload
                        starts.
                      </p>
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                    >
                      {isUploading ? "Starting..." : "Start Video Processing"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
