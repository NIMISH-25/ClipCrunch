# Used Data Transfer Object Design Pattern

from dataclasses import dataclass
from typing import Optional

@dataclass
class StatusDTO:
    file_uid: str
    status: str
    progress: int
    step: Optional[str] = None
    message: Optional[str] = None

    def to_json(self) -> dict:
        return {
            "file_uid": self.file_uid,
            "status": self.status,
            "progress": self.progress,
            "step": self.step,
            "message": self.message,
        }
