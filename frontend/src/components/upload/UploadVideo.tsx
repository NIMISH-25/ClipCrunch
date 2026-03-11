"use client";

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

  return (
    <div className="flex flex-col space-y-4 p-4 bg-stone-100 min-h-screen">
      <div className="grid grid-cols-6 gap-4">
        {/* Upload card */}
        <div className="bg-white col-span-6 border p-6 space-y-4">
          <p className="text-lg font-semibold text-gray-700">Upload Video</p>

          {!file ? (
            // Drop Zone
            <div
              className="border-2 border-dashed p-6 flex items-center justify-center cursor-pointer hover:bg-purple-100 transition rounded-md"
              onClick={openFilePicker}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="flex flex-col items-center justify-center">
                <svg
                  className="w-16 h-16 text-purple-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0l-4 4m4-4l4 4M17 8v8m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
                <p className="text-purple-600 font-medium">
                  Drag &amp; Drop your video here
                </p>
                <p className="text-gray-400 text-sm mt-2">or click to select</p>
                <input
                  type="file"
                  accept="video/*"
                  ref={inputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          ) : (
            // File Info View
            <div className="space-y-4">
              <div className="flex space-x-4">
                <div className="aspect-[16/9] border w-30 bg-black" />
                <div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Filename:</span> {file.name}
                    </p>
                    <p>
                      <span className="font-medium">Size:</span>{" "}
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <p>
                      <span className="font-medium">Type:</span> {file.type}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={resetFile}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 p-2 transition text-xs font-semibold"
              >
                Reupload Video
              </button>
            </div>
          )}
        </div>

        {/* Parameters + Start button */}
        {file && (
          <div className="bg-white col-span-6 border p-4 space-y-4">
            <div>
              <p className="text-lg font-semibold text-gray-700">
                Processing Parameters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chunk Size */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  Chunk Size (MB)
                </label>
                <input
                  type="number"
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.chunkSize}
                  onChange={(e) =>
                    handleParamChange("chunkSize", parseInt(e.target.value, 10))
                  }
                />
              </div>

              {/* Max Nodes */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  Max Nodes
                </label>
                <input
                  type="number"
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.maxNodes}
                  onChange={(e) =>
                    handleParamChange("maxNodes", parseInt(e.target.value, 10))
                  }
                />
              </div>

              {/* Target Resolution */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  Target Resolution
                </label>
                <select
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.resolution}
                  onChange={(e) =>
                    handleParamChange("resolution", e.target.value)
                  }
                >
                  {ResolutionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Bitrate */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  Video Bitrate
                </label>
                <select
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.videoBitrate}
                  onChange={(e) =>
                    handleParamChange("videoBitrate", e.target.value)
                  }
                >
                  {VideoBitrateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Bitrate */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  Audio Bitrate
                </label>
                <select
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.audioBitrate}
                  onChange={(e) =>
                    handleParamChange("audioBitrate", e.target.value)
                  }
                >
                  {AudioBitrateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Codec */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  Video Codec
                </label>
                <select
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.videoCodec}
                  onChange={(e) =>
                    handleParamChange("videoCodec", e.target.value)
                  }
                >
                  {VideoCodecOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Codec */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  Audio Codec
                </label>
                <select
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.audioCodec}
                  onChange={(e) =>
                    handleParamChange("audioCodec", e.target.value)
                  }
                >
                  {AudioCodecOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* CRF Value */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  CRF Value
                </label>
                <select
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.crfValue}
                  onChange={(e) =>
                    handleParamChange("crfValue", e.target.value)
                  }
                >
                  {CRFValueOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600 font-medium">
                  Preset
                </label>
                <select
                  className="border p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={params.preset}
                  onChange={(e) =>
                    handleParamChange("preset", e.target.value)
                  }
                >
                  {PresetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Processing Button + Progress */}
              <div className="flex flex-col justify-end">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded-md text-sm font-semibold"
                >
                  {isUploading ? "Processing..." : "Start Video Processing"}
                </button>

                {status && (
                  <div className="mt-4 space-y-1">
                    <p className="text-sm">Status: {status.status}</p>
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div
                        className="bg-purple-600 h-2 rounded"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
