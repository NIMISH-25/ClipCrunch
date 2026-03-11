export interface ProcessingParams {
  chunkSize: number;
  maxNodes: number;
  resolution: string;
  audioCodec: string;
  audioBitrate: string;
  videoCodec: string;
  videoBitrate: string;
  crfValue: string;
  preset: string;
}

export interface Video {
  id: number;
  filename: string;
  stored_filename: string;
  status: string;
  uploader_ip: string | null;
  size: number;
  resolution: string | null;
  video_bitrate: string | null;
  audio_bitrate: string | null;
  crf_value: string | null;
  preset: string | null;
  video_codec: string | null;
  audio_codec: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface UploadedVideo extends Video {
  file_uid: string;
}

export interface Status {
  file_uid: string;
  status: string;
  progress: number;
  step?: string;
  message?: string;
}
