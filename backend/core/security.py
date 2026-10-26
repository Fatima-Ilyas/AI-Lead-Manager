"""Password hashing and signed admin tokens. Standard library plus PyJWT only."""
import base64
import hashlib
import hmac
import os
import time

import jwt

SCRYPT_N = 2 ** 14
SCRYPT_R = 8
SCRYPT_P = 1
SALT_BYTES = 16
HASH_BYTES = 32

TOKEN_ALGORITHM = "HS256"
ADMIN_SUBJECT = "admin"


def _encode(data):
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _decode(text):
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def hash_password(password):
    """Return 'scrypt:N:r:p:salt:hash'. ':' separators survive shells that mangle '$'."""
    salt = os.urandom(SALT_BYTES)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=HASH_BYTES,
    )
    return f"scrypt:{SCRYPT_N}:{SCRYPT_R}:{SCRYPT_P}:{_encode(salt)}:{_encode(digest)}"


def verify_password(password, stored):
    """True only for a well-formed stored hash that matches. Anything else is False."""
    try:
        scheme, n, r, p, salt_text, hash_text = stored.split(":")
        if scheme != "scrypt":
            return False
        expected = _decode(hash_text)
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=_decode(salt_text),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
        )
    except (AttributeError, ValueError):
        # Not a string, wrong field count, bad base64 or numbers, or scrypt
        # parameters that are invalid or exceed hashlib's memory limit.
        return False
    return hmac.compare_digest(actual, expected)


def create_access_token(secret, ttl_minutes, now=None):
    issued_at = int(time.time() if now is None else now)
    claims = {
        "sub": ADMIN_SUBJECT,
        "iat": issued_at,
        "exp": issued_at + ttl_minutes * 60,
    }
    return jwt.encode(claims, secret, algorithm=TOKEN_ALGORITHM)


def decode_access_token(token, secret):
    """Return the claims of a valid admin token, otherwise None."""
    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=[TOKEN_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        return None

    if claims.get("sub") != ADMIN_SUBJECT:
        return None
    return claims
