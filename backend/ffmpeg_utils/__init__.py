import os
import subprocess
from typing import List

from .. import config

DATA_DIR = config.DATA_DIR
CHUNKS_DIR = os.path.join(DATA_DIR, "video_chunks")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed_chunks")
OUTPUT_DIR = os.path.join(DATA_DIR, "outputs")
TEMP_UPLOAD_DIR = config.TEMP_UPLOAD_FOLDER

def ensure_dir(directory: str) -> None:
    os.makedirs(directory, exist_ok=True)

def cleanup_files(paths: list[str]) -> None:
    for path in paths:
        try:
            if path and os.path.exists(path) and os.path.isfile(path):
                os.remove(path)
        except FileNotFoundError:
            pass

def _infer_base_name_from_path(path: str) -> str:
    filename = os.path.splitext(os.path.basename(path))[0]
    if "_chunk_" in filename:
        return filename.split("_chunk_")[0]
    return filename

def cleanup_intermediate_files(base_name: str) -> None:
    for directory in (CHUNKS_DIR, PROCESSED_DIR):
        if not os.path.isdir(directory):
            continue

        for filename in os.listdir(directory):
            if filename.startswith(base_name):
                full_path = os.path.join(directory, filename)
                if os.path.isfile(full_path):
                    try:
                        os.remove(full_path)
                    except FileNotFoundError:
                        pass

def cleanup_temp_upload(input_path: str | None) -> None:
    if not input_path:
        return

    try:
        if os.path.exists(input_path) and os.path.isfile(input_path):
            os.remove(input_path)
    except FileNotFoundError:
        pass

def split_video(input_path: str, chunk_size_bytes: int) -> List[str]:
    ensure_dir(CHUNKS_DIR)
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    segment_list_path = os.path.join(CHUNKS_DIR, f"{base_name}_chunks_list.txt")

    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-c", "copy",
        "-map", "0",
        "-f", "segment",
        "-segment_format", "mp4",
        "-segment_list", segment_list_path,
        "-segment_list_type", "flat",
        "-fs", str(chunk_size_bytes),
        os.path.join(CHUNKS_DIR, f"{base_name}_chunk_%03d.mp4"),
    ]
    subprocess.run(cmd, check=True)

    chunk_paths = sorted(
        os.path.join(CHUNKS_DIR, f)
        for f in os.listdir(CHUNKS_DIR)
        if f.startswith(f"{base_name}_chunk_") and f.endswith(".mp4")
    )

    cleanup_files([segment_list_path])
    return chunk_paths

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

def reassemble_video(
    chunk_paths: list[str],
    output_path: str,
    original_input_path: str | None = None,
):
    from ffmpeg import input as ffmpeg_input

    if not chunk_paths:
        raise ValueError("No processed chunks provided for reassembly")

    ensure_dir(PROCESSED_DIR)
    ensure_dir(OUTPUT_DIR)
    ensure_dir(os.path.dirname(output_path))

    base_name = _infer_base_name_from_path(chunk_paths[0])
    concat_list = os.path.join(PROCESSED_DIR, f"{base_name}_concat_list.txt")

    with open(concat_list, "w") as f:
        for path in chunk_paths:
            safe_path = path.replace("'", r"'\''")
            f.write(f"file '{safe_path}'\n")

    try:
        (
            ffmpeg_input(concat_list, format="concat", safe=0)
            .output(output_path, c="copy")
            .overwrite_output()
            .run()
        )

        if not os.path.exists(output_path) or not os.path.isfile(output_path):
            raise RuntimeError("Final output video was not created")

        cleanup_intermediate_files(base_name)
        cleanup_temp_upload(original_input_path)

    finally:
        cleanup_files([concat_list])
