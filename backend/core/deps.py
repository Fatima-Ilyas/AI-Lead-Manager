"""Shared FastAPI dependencies. Phase 2 replaces require_admin with real users."""
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.config import get_admin_password_hash, get_auth_secret
from core.security import decode_access_token

# auto_error=False so a missing header is a 401 from us, with our own headers.
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    subject: str


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """Return the admin, or raise. Fails closed: no config means 503, never data."""
    secret = get_auth_secret()
    if secret is None or get_admin_password_hash() is None:
        raise HTTPException(status_code=503, detail="Authentication is not configured")

    unauthorized = HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    claims = decode_access_token(credentials.credentials, secret)
    if claims is None:
        raise unauthorized

    return CurrentUser(subject=claims["sub"])
