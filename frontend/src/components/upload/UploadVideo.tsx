"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { uploadVideo, listenToStatusEvents } from "../../lib/api";
import type { ProcessingParams, Status } from "../../types/api";

const ResolutionOptions = [
  { label: "UHD 4K (3840x2160)", value: "UHD_4K" },
  { label: "QHD 2K (2560x1440)", value: "QHD_2K" },
  { label: "FHD 1080p (1920x1080)", value: "FHD_1080" },
  { label: "HD 720p (1280x720)", value: "HD_720" },
  { label: "SD 480p (854x480)", value: "SD_480" },
  { label: "Mobile 360p (640x360)", value: "MOBILE_360" },
];

const VideoBitrateOptions = [
  { label: "8M (Ultra)", value: "ULTRA" },
  { label: "4M (High)", value: "HIGH" },
  { label: "2M (Standard)", value: "STANDARD" },
  { label: "1M (Low)", value: "LOW" },
  { label: "500k (Mobile)", value: "MOBILE" },
];

const AudioBitrateOptions = [
  { label: "192k (High)", value: "HIGH" },
  { label: "128k (Standard)", value: "STANDARD" },
  { label: "64k (Low)", value: "LOW" },
];

const AudioCodecOptions = [
  { label: "AAC", value: "AAC" },
  { label: "MP3", value: "MP3" },
  { label: "Opus", value: "OPUS" },
  { label: "Vorbis", value: "VORBIS" },
  { label: "FLAC", value: "FLAC" },
  { label: "PCM", value: "PCM_S16LE" },
];

const VideoCodecOptions = [
  { label: "H.264 (libx264)", value: "H264" },
  { label: "H.265 (libx265)", value: "H265" },
  { label: "VP8", value: "VP8" },
  { label: "VP9", value: "VP9" },
  { label: "AV1", value: "AV1" },
  { label: "MPEG-4 (mpeg4)", value: "MPEG4" },
];

const CRFValueOptions = [
  { label: "18 (Very High Quality)", value: "VERY_HIGH" },
  { label: "23 (High Quality)", value: "HIGH" },
  { label: "28 (Medium Quality)", value: "MEDIUM" },
  { label: "35 (Low Quality)", value: "LOW" },
  { label: "40 (Very Low Quality)", value: "VERY_LOW" },
];

const PresetOptions = [
  { label: "ultrafast", value: "ULTRAFAST" },
  { label: "fast", value: "FAST" },
  { label: "medium", value: "MEDIUM" },
  { label: "slow", value: "SLOW" },
  { label: "veryslow", value: "VERYSLOW" },
];

const defaultParams: ProcessingParams = {
  chunkSize: 4,
  maxNodes: 5,
  resolution: "FHD_1080",
  audioCodec: "MP3",
  audioBitrate: "LOW",
  videoCodec: "H264",
  videoBitrate: "LOW",
  crfValue: "MEDIUM",
  preset: "ULTRAFAST",
};

export default function UploadVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [params, setParams] = useState<ProcessingParams>(defaultParams);
  const [status, setStatus] = useState<Status | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const handleParamChange = <K extends keyof ProcessingParams>(
    field: K,
    value: ProcessingParams[K]
  ) => {
    setParams((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const resetFile = () => {
    setFile(null);
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("No file selected.");
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadVideo(file, params);

      const first = result.uploaded[0];
      const fileUid: string = first.file_uid;

      setStatus({
        file_uid: fileUid,
        status: "uploaded",
        progress: 0,
      });

      esRef.current = listenToStatusEvents(
        fileUid,
        (s) => setStatus(s),
        () => setIsUploading(false)
      );
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Check console for details.");
      setIsUploading(false);
    }
  };

  const inputClasses =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              ClipCrunch
            </h1>
            <p className="text-sm text-slate-500">
              Upload, configure, and process your video files
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Upload card */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Upload Video
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Drag and drop a file or choose one from your device
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
                    <div className="flex w-full max-w-xs items-center justify-center rounded-xl border border-slate-200 bg-slate-900 aspect-video">
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

          {/* Parameters */}
          {file && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Processing Parameters
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose your encoding and distribution settings
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Chunk Size (MB)
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={inputClasses}
                      value={params.chunkSize}
                      onChange={(e) =>
                        handleParamChange(
                          "chunkSize",
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Max Nodes
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={inputClasses}
                      value={params.maxNodes}
                      onChange={(e) =>
                        handleParamChange(
                          "maxNodes",
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Target Resolution
                    </label>
                    <select
                      className={inputClasses}
                      value={params.resolution}
                      onChange={(e) =>
                        handleParamChange(
                          "resolution",
                          e.target.value as ProcessingParams["resolution"]
                        )
                      }
                    >
                      {ResolutionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Video Bitrate
                    </label>
                    <select
                      className={inputClasses}
                      value={params.videoBitrate}
                      onChange={(e) =>
                        handleParamChange(
                          "videoBitrate",
                          e.target.value as ProcessingParams["videoBitrate"]
                        )
                      }
                    >
                      {VideoBitrateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Audio Bitrate
                    </label>
                    <select
                      className={inputClasses}
                      value={params.audioBitrate}
                      onChange={(e) =>
                        handleParamChange(
                          "audioBitrate",
                          e.target.value as ProcessingParams["audioBitrate"]
                        )
                      }
                    >
                      {AudioBitrateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Video Codec
                    </label>
                    <select
                      className={inputClasses}
                      value={params.videoCodec}
                      onChange={(e) =>
                        handleParamChange(
                          "videoCodec",
                          e.target.value as ProcessingParams["videoCodec"]
                        )
                      }
                    >
                      {VideoCodecOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Audio Codec
                    </label>
                    <select
                      className={inputClasses}
                      value={params.audioCodec}
                      onChange={(e) =>
                        handleParamChange(
                          "audioCodec",
                          e.target.value as ProcessingParams["audioCodec"]
                        )
                      }
                    >
                      {AudioCodecOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      CRF Value
                    </label>
                    <select
                      className={inputClasses}
                      value={params.crfValue}
                      onChange={(e) =>
                        handleParamChange(
                          "crfValue",
                          e.target.value as ProcessingParams["crfValue"]
                        )
                      }
                    >
                      {CRFValueOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Preset
                    </label>
                    <select
                      className={inputClasses}
                      value={params.preset}
                      onChange={(e) =>
                        handleParamChange(
                          "preset",
                          e.target.value as ProcessingParams["preset"]
                        )
                      }
                    >
                      {PresetOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Start processing
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Your upload will begin immediately and status updates
                        will appear below.
                      </p>
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                    >
                      {isUploading ? "Processing..." : "Start Video Processing"}
                    </button>
                  </div>

                  {status && (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-slate-700">
                          Status: {status.status}
                        </span>
                        <span className="font-semibold text-purple-700">
                          {status.progress}%
                        </span>
                      </div>

                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-purple-600 transition-all duration-300"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
