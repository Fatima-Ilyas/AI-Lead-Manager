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

MIN_AUTH_SECRET_LENGTH = 32
DEFAULT_AUTH_TOKEN_TTL_MINUTES = 480

# Always allowed so local development works with no configuration.
# Tighten before deploy: see docs/DEPLOY_CHECKLIST.md.
DEV_ORIGINS = ["http://localhost:5173", "http://localhost:5174"]


def _env(name):
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def get_database_url():
    url = _env("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url


def get_admin_password_hash():
    return _env("ADMIN_PASSWORD_HASH")


def get_auth_secret():
    """The token signing secret, or None if unset or too short to be safe."""
    secret = _env("AUTH_SECRET")
    if secret is None or len(secret) < MIN_AUTH_SECRET_LENGTH:
        return None
    return secret


def get_auth_token_ttl_minutes():
    try:
        minutes = int(_env("AUTH_TOKEN_TTL_MINUTES"))
    except (TypeError, ValueError):
        return DEFAULT_AUTH_TOKEN_TTL_MINUTES
    return minutes if minutes > 0 else DEFAULT_AUTH_TOKEN_TTL_MINUTES


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
