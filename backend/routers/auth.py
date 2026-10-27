from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from core.config import (
    get_admin_password_hash,
    get_auth_secret,
    get_auth_token_ttl_minutes,
)
from core.security import create_access_token, verify_password

router = APIRouter()


class LoginRequest(BaseModel):
    # Capped so a huge body can't be fed to scrypt.
    password: str = Field(min_length=1, max_length=256)


@router.post("/auth/login")
def login(body: LoginRequest, response: Response):
    secret = get_auth_secret()
    password_hash = get_admin_password_hash()
    if secret is None or password_hash is None:
        raise HTTPException(status_code=503, detail="Authentication is not configured")

    if not verify_password(body.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    ttl_minutes = get_auth_token_ttl_minutes()
    response.headers["Cache-Control"] = "no-store"
    return {
        "access_token": create_access_token(secret, ttl_minutes),
        "token_type": "bearer",
        "expires_in": ttl_minutes * 60,
    }
