"""Password hashing, signed admin tokens, and the auth config getters."""
import base64
import json
import time

import jwt
import pytest

from core import config
from core.security import (
    ADMIN_SUBJECT,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

SECRET = "s" * 40
OTHER_SECRET = "o" * 40


# Password hashing

def test_hash_has_expected_format():
    stored = hash_password("correct horse battery staple")

    parts = stored.split(":")
    assert parts[:4] == ["scrypt", "16384", "8", "1"]
    assert len(parts) == 6
    assert "$" not in stored
    assert "correct horse" not in stored


def test_correct_password_verifies():
    stored = hash_password("correct horse battery staple")

    assert verify_password("correct horse battery staple", stored) is True


def test_wrong_password_does_not_verify():
    stored = hash_password("correct horse battery staple")

    assert verify_password("correct horse battery stapl", stored) is False
    assert verify_password("", stored) is False


def test_unicode_password_round_trips():
    stored = hash_password("pässwörd-密码")

    assert verify_password("pässwörd-密码", stored) is True
    assert verify_password("passwörd-密码", stored) is False


def test_two_hashes_of_one_password_differ_and_both_verify():
    first = hash_password("same password")
    second = hash_password("same password")

    assert first != second
    assert verify_password("same password", first)
    assert verify_password("same password", second)


@pytest.mark.parametrize(
    "stored",
    [
        None,
        "",
        "plain-text-password",
        "scrypt:16384:8:1:abc",
        "bcrypt:16384:8:1:c2FsdA:aGFzaA",
        "scrypt:x:8:1:c2FsdA:aGFzaA",
        "scrypt:16384:8:1:c2FsdA:",
        "scrypt:16384:8:1:c2FsdA:aGFzaA:extra",
        "scrypt:16385:8:1:c2FsdA:aGFzaA",  # N is not a power of two
        "scrypt:1048576:8:1:c2FsdA:aGFzaA",  # exceeds hashlib's memory limit
    ],
)
def test_malformed_stored_hash_never_verifies(stored):
    assert verify_password("anything", stored) is False


# Tokens

def test_token_round_trip():
    token = create_access_token(SECRET, ttl_minutes=60)

    claims = decode_access_token(token, SECRET)

    assert claims["sub"] == ADMIN_SUBJECT
    assert claims["exp"] - claims["iat"] == 60 * 60
    assert abs(claims["iat"] - time.time()) < 5


def test_expired_token_is_rejected():
    token = create_access_token(SECRET, ttl_minutes=60, now=time.time() - 2 * 3600)

    assert decode_access_token(token, SECRET) is None


def test_token_signed_with_another_secret_is_rejected():
    token = create_access_token(OTHER_SECRET, ttl_minutes=60)

    assert decode_access_token(token, SECRET) is None


def test_tampered_signature_is_rejected():
    token = create_access_token(SECRET, ttl_minutes=60)
    header, payload, signature = token.split(".")
    middle = len(signature) // 2
    flipped = "A" if signature[middle] != "A" else "B"
    tampered = ".".join([header, payload, signature[:middle] + flipped + signature[middle + 1:]])

    assert decode_access_token(tampered, SECRET) is None


def test_tampered_payload_is_rejected():
    token = create_access_token(SECRET, ttl_minutes=60)
    header, payload, signature = token.split(".")
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    claims["exp"] += 10 * 365 * 24 * 3600
    forged_payload = base64.urlsafe_b64encode(
        json.dumps(claims, separators=(",", ":")).encode()
    ).decode().rstrip("=")

    assert decode_access_token(".".join([header, forged_payload, signature]), SECRET) is None


def test_unsigned_alg_none_token_is_rejected():
    token = jwt.encode(
        {"sub": ADMIN_SUBJECT, "exp": int(time.time()) + 3600}, None, algorithm="none"
    )

    assert decode_access_token(token, SECRET) is None


def test_token_with_a_different_hmac_algorithm_is_rejected():
    long_secret = "l" * 64  # long enough for HS512 without a key-length warning
    token = jwt.encode(
        {"sub": ADMIN_SUBJECT, "exp": int(time.time()) + 3600}, long_secret, algorithm="HS512"
    )

    assert decode_access_token(token, long_secret) is None


def test_token_without_exp_is_rejected():
    token = jwt.encode({"sub": ADMIN_SUBJECT}, SECRET, algorithm="HS256")

    assert decode_access_token(token, SECRET) is None


def test_token_without_sub_is_rejected():
    token = jwt.encode({"exp": int(time.time()) + 3600}, SECRET, algorithm="HS256")

    assert decode_access_token(token, SECRET) is None


def test_token_with_wrong_sub_is_rejected():
    token = jwt.encode(
        {"sub": "someone-else", "exp": int(time.time()) + 3600}, SECRET, algorithm="HS256"
    )

    assert decode_access_token(token, SECRET) is None


@pytest.mark.parametrize("token", [None, "", "not-a-jwt", "a.b.c", "a.b.c.d"])
def test_garbage_token_is_rejected(token):
    assert decode_access_token(token, SECRET) is None


# Config getters

@pytest.fixture
def clean_auth_env(monkeypatch):
    for name in ("ADMIN_PASSWORD_HASH", "AUTH_SECRET", "AUTH_TOKEN_TTL_MINUTES"):
        monkeypatch.delenv(name, raising=False)


def test_admin_password_hash_unset_or_blank_is_none(clean_auth_env, monkeypatch):
    assert config.get_admin_password_hash() is None

    monkeypatch.setenv("ADMIN_PASSWORD_HASH", "   ")
    assert config.get_admin_password_hash() is None


def test_admin_password_hash_is_read_and_trimmed(clean_auth_env, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", "  scrypt:abc  ")

    assert config.get_admin_password_hash() == "scrypt:abc"


def test_auth_secret_unset_or_blank_is_none(clean_auth_env, monkeypatch):
    assert config.get_auth_secret() is None

    monkeypatch.setenv("AUTH_SECRET", "   ")
    assert config.get_auth_secret() is None


def test_auth_secret_shorter_than_32_chars_counts_as_unset(clean_auth_env, monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "x" * 31)

    assert config.get_auth_secret() is None


def test_auth_secret_of_32_chars_is_accepted(clean_auth_env, monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "x" * 32)

    assert config.get_auth_secret() == "x" * 32


def test_token_ttl_defaults_to_480_minutes(clean_auth_env):
    assert config.get_auth_token_ttl_minutes() == 480


@pytest.mark.parametrize("value", ["", "  ", "abc", "1.5", "0", "-5"])
def test_token_ttl_invalid_values_fall_back_to_default(clean_auth_env, monkeypatch, value):
    monkeypatch.setenv("AUTH_TOKEN_TTL_MINUTES", value)

    assert config.get_auth_token_ttl_minutes() == 480


def test_token_ttl_reads_env(clean_auth_env, monkeypatch):
    monkeypatch.setenv("AUTH_TOKEN_TTL_MINUTES", "60")

    assert config.get_auth_token_ttl_minutes() == 60
