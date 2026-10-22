"""Environment-based configuration.

Values are read when a function is called, not at import time, so tests can
change the environment and a missing value only fails where it is needed.
Empty or whitespace-only values count as unset.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"

# Always allowed so local development works with no configuration.
# Tighten before deploy: see docs/DEPLOY_CHECKLIST.md.
DEV_ORIGINS = ["http://localhost:5173", "http://localhost:5174"]


def _env(name):
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def get_gemini_api_key():
    return _env("GEMINI_API_KEY")


def get_gemini_model():
    return _env("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL


def get_allowed_origins():
    """ALLOWED_ORIGINS (comma-separated) + FRONTEND_URL + dev defaults."""
    candidates = (_env("ALLOWED_ORIGINS") or "").split(",")
    candidates.append(_env("FRONTEND_URL") or "")
    candidates.extend(DEV_ORIGINS)

    origins = []
    for candidate in candidates:
        # Browsers send origins without a trailing slash.
        origin = candidate.strip().rstrip("/")
        if origin and origin not in origins:
            origins.append(origin)
    return origins
