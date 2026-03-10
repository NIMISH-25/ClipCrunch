import enum
from datetime import datetime

from .app import db

class ResolutionPreset(enum.Enum):
    UHD_4K = (3840, 2160)
    QHD_2K = (2560, 1440)
    FHD_1080 = (1920, 1080)
    HD_720 = (1280, 720)
    SD_480 = (854, 480)
    MOBILE_360 = (640, 360)


class BitratePreset(enum.Enum):
    ULTRA = "8M"
    HIGH = "4M"
    STANDARD = "2M"
    LOW = "1M"
    MOBILE = "500k"


class AudioBitratePreset(enum.Enum):
    HIGH = "192k"
    STANDARD = "128k"
    LOW = "64k"


class CRFPreset(enum.Enum):
    VERY_HIGH = 18
    HIGH = 23
    MEDIUM = 28
    LOW = 35
    VERY_LOW = 40


class Preset(enum.Enum):
    ULTRAFAST = "ultrafast"
    FAST = "fast"
    MEDIUM = "medium"
    SLOW = "slow"
    VERYSLOW = "veryslow"


class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False, unique=True)
    status = db.Column(db.String(50), nullable=False, default="uploaded")
    uploader_ip = db.Column(db.String(50))
    size = db.Column(db.Integer)

    resolution = db.Column(db.Enum(ResolutionPreset))
    video_bitrate = db.Column(db.Enum(BitratePreset))
    audio_bitrate = db.Column(db.Enum(AudioBitratePreset))
    crf_value = db.Column(db.Enum(CRFPreset))
    preset = db.Column(db.Enum(Preset))
    video_codec = db.Column(db.String(50))
    audio_codec = db.Column(db.String(50))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "stored_filename": self.stored_filename,
            "status": self.status,
            "uploader_ip": self.uploader_ip,
            "size": self.size,
            "resolution": self.resolution.name if self.resolution else None,
            "video_bitrate": self.video_bitrate.name if self.video_bitrate else None,
            "audio_bitrate": self.audio_bitrate.name if self.audio_bitrate else None,
            "crf_value": self.crf_value.name if self.crf_value else None,
            "preset": self.preset.name if self.preset else None,
            "video_codec": self.video_codec,
            "audio_codec": self.audio_codec,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
