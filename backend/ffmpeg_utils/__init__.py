import os
import subprocess
from typing import List

CHUNKS_DIR = "video_chunks"
PROCESSED_DIR = "processed_chunks"

def ensure_dir(directory: str) -> None:
    os.makedirs(directory, exist_ok=True)

def split_video(input_path: str, chunk_size_bytes: int) -> List[str]:
    ensure_dir(CHUNKS_DIR)
    base_name = os.path.splitext(os.path.basename(input_path))[0]

    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-c", "copy",
        "-map", "0",
        "-f", "segment",
        "-segment_format", "mp4",
        "-segment_list", os.path.join(CHUNKS_DIR, "chunks_list.txt"),
        "-segment_list_type", "flat",
        "-fs", str(chunk_size_bytes),
        os.path.join(CHUNKS_DIR, f"{base_name}_chunk_%03d.mp4"),
    ]
    subprocess.run(cmd, check=True)

    return sorted(
        os.path.join(CHUNKS_DIR, f)
        for f in os.listdir(CHUNKS_DIR)
        if f.startswith(base_name) and f.endswith(".mp4")
    )

def process_chunk(input_path: str, output_path: str, resolution, video_bitrate, audio_bitrate):
    from ffmpeg import input as ffmpeg_input

    ensure_dir(PROCESSED_DIR)

    (
        ffmpeg_input(input_path)
        .filter("scale", resolution.value[0], resolution.value[1])
        .output(
            output_path,
            vcodec="libx264",
            **{"b:v": video_bitrate.value},
            preset="fast",
            acodec="aac",
            **{"b:a": audio_bitrate.value},
        )
        .overwrite_output()
        .run()
    )

def reassemble_video(chunk_paths: list[str], output_path: str):
    from ffmpeg import input as ffmpeg_input

    ensure_dir(PROCESSED_DIR)
    concat_list = os.path.join(PROCESSED_DIR, "concat_list.txt")

    with open(concat_list, "w") as f:
        for path in chunk_paths:
            f.write(f"file '{os.path.basename(path)}'\n")

    (
        ffmpeg_input(concat_list, format="concat", safe=0)
        .output(output_path, c="copy")
        .overwrite_output()
        .run()
    )
    os.remove(concat_list)
