"""Admin login and the protection of the lead endpoints."""
import time

import jwt
import pytest
from sqlalchemy import text

from core.security import ADMIN_SUBJECT, create_access_token, decode_access_token

ANALYZE_LEAD_TARGET = "services.lead_service.analyze_lead"

VALID_LEAD = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "company": "Analytical Engines",
    "requirement": "CRM for 20 sales reps",
    "budget": "$10,000",
    "timeline": "2 weeks",
}

PROTECTED_REQUESTS = [
    ("GET", "/leads", {}),
    ("POST", "/leads", {"json": VALID_LEAD}),
    ("PUT", "/leads/1/status", {"params": {"status": "closed"}}),
    ("PUT", "/leads/1/follow-up", {"params": {"follow_up_date": "2030-01-01"}}),
]


@pytest.fixture
def ai_calls(monkeypatch):
    calls = []

    def analyze(lead):
        calls.append(lead)
        raise AssertionError("analyze_lead must not run for an unauthenticated request")

    monkeypatch.setattr(ANALYZE_LEAD_TARGET, analyze)
    return calls


@pytest.fixture
def seeded_lead(clean_db):
    with clean_db.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO leads (name, email, company, requirement, budget, timeline) "
                "VALUES ('Seeded Person', 'seed@example.com', 'Seed Co', 'secret need', '1', '1')"
            )
        )
    return clean_db


def lead_rows(engine):
    with engine.connect() as connection:
        return connection.execute(text("SELECT name, status, follow_up_date FROM leads")).all()


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


# Login

def test_login_success_returns_a_valid_token(anonymous_client, admin_password, auth_secret, monkeypatch):
    monkeypatch.setenv("AUTH_TOKEN_TTL_MINUTES", "30")

    response = anonymous_client.post("/auth/login", json={"password": admin_password})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"access_token", "token_type", "expires_in"}
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 30 * 60
    claims = decode_access_token(body["access_token"], auth_secret)
    assert claims["sub"] == ADMIN_SUBJECT
    assert claims["exp"] - claims["iat"] == 30 * 60
    assert response.headers["cache-control"] == "no-store"


def test_login_token_unlocks_the_lead_endpoints(anonymous_client, admin_password):
    token = anonymous_client.post("/auth/login", json={"password": admin_password}).json()["access_token"]

    response = anonymous_client.get("/leads", headers=bearer(token))

    assert response.status_code == 200
    assert response.json() == []


def test_login_with_wrong_password_is_401(anonymous_client, admin_password):
    response = anonymous_client.post("/auth/login", json={"password": admin_password + "x"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}
    assert "access_token" not in response.text


@pytest.mark.parametrize("body", [{"password": ""}, {"password": "p" * 257}, {}, {"password": 123}, None])
def test_login_with_invalid_body_is_422(anonymous_client, body):
    response = anonymous_client.post("/auth/login", json=body)

    assert response.status_code == 422


def test_login_with_the_longest_allowed_password_is_checked_not_rejected(anonymous_client):
    response = anonymous_client.post("/auth/login", json={"password": "p" * 256})

    assert response.status_code == 401


def test_login_with_a_malformed_stored_hash_never_succeeds(anonymous_client, admin_password, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", "not-a-hash")

    response = anonymous_client.post("/auth/login", json={"password": admin_password})

    assert response.status_code == 401


@pytest.mark.parametrize(
    "name, value",
    [
        ("ADMIN_PASSWORD_HASH", None),
        ("ADMIN_PASSWORD_HASH", "   "),
        ("AUTH_SECRET", None),
        ("AUTH_SECRET", "too-short"),
    ],
)
def test_login_is_503_when_auth_is_not_configured(anonymous_client, admin_password, monkeypatch, name, value):
    if value is None:
        monkeypatch.delenv(name)
    else:
        monkeypatch.setenv(name, value)

    response = anonymous_client.post("/auth/login", json={"password": admin_password})

    assert response.status_code == 503
    assert "access_token" not in response.text


# Protected endpoints without a valid token

@pytest.mark.parametrize("method, path, kwargs", PROTECTED_REQUESTS)
def test_lead_endpoints_reject_requests_without_a_token(
    anonymous_client, seeded_lead, ai_calls, method, path, kwargs
):
    response = anonymous_client.request(method, path, **kwargs)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "Not authenticated"}
    assert "Seeded Person" not in response.text
    assert ai_calls == []


def test_unauthenticated_create_lead_inserts_nothing_and_skips_the_ai(anonymous_client, clean_db, ai_calls):
    response = anonymous_client.post("/leads", json=VALID_LEAD)

    assert response.status_code == 401
    assert lead_rows(clean_db) == []
    assert ai_calls == []


def test_unauthenticated_updates_change_nothing(anonymous_client, seeded_lead):
    before = lead_rows(seeded_lead)

    anonymous_client.put("/leads/1/status", params={"status": "closed"})
    anonymous_client.put("/leads/1/follow-up", params={"follow_up_date": "2030-01-01"})

    assert lead_rows(seeded_lead) == before


@pytest.mark.parametrize(
    "method, path, kwargs",
    [
        ("POST", "/leads", {"json": {}}),
        ("PUT", "/leads/1/status", {}),
        ("PUT", "/leads/not-a-number/follow-up", {}),
    ],
)
def test_invalid_requests_without_a_token_are_401_not_422(anonymous_client, ai_calls, method, path, kwargs):
    response = anonymous_client.request(method, path, **kwargs)

    assert response.status_code == 401


def test_unauthenticated_request_never_opens_a_database_session(anonymous_client):
    from db.session import get_db
    from main import app

    def forbidden():
        raise AssertionError("get_db ran for an unauthenticated request")
        yield  # pragma: no cover

    app.dependency_overrides[get_db] = forbidden
    try:
        response = anonymous_client.get("/leads")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 401


def test_authenticated_request_does_open_a_database_session(client):
    # Guards the test above: the same override does fire when auth passes.
    from db.session import get_db
    from main import app

    def forbidden():
        raise AssertionError("get_db ran")
        yield  # pragma: no cover

    app.dependency_overrides[get_db] = forbidden
    try:
        response = client.get("/leads")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 500


def _forged_tokens(secret):
    now = int(time.time())
    return {
        "expired": create_access_token(secret, 60, now=now - 7200),
        "wrong secret": create_access_token("o" * 40, 60),
        "wrong sub": jwt.encode({"sub": "someone-else", "exp": now + 3600}, secret, algorithm="HS256"),
        "no exp": jwt.encode({"sub": ADMIN_SUBJECT}, secret, algorithm="HS256"),
        "alg none": jwt.encode({"sub": ADMIN_SUBJECT, "exp": now + 3600}, None, algorithm="none"),
        "tampered": create_access_token(secret, 60)[:-3] + "AAA",
        "garbage": "not-a-jwt",
    }


@pytest.mark.parametrize(
    "kind", ["expired", "wrong secret", "wrong sub", "no exp", "alg none", "tampered", "garbage"]
)
def test_invalid_tokens_are_rejected(anonymous_client, seeded_lead, auth_secret, kind):
    token = _forged_tokens(auth_secret)[kind]

    response = anonymous_client.get("/leads", headers=bearer(token))

    assert response.status_code == 401
    assert "Seeded Person" not in response.text


@pytest.mark.parametrize("header", ["Basic dXNlcjpwYXNz", "Bearer", "Bearer ", "Token abc", ""])
def test_wrong_authorization_header_forms_are_rejected(anonymous_client, seeded_lead, header):
    response = anonymous_client.get("/leads", headers={"Authorization": header})

    assert response.status_code == 401


def test_a_valid_token_reads_leads(client, seeded_lead):
    response = client.get("/leads")

    assert response.status_code == 200
    assert [lead["name"] for lead in response.json()] == ["Seeded Person"]


# Auth not configured

@pytest.mark.parametrize("name", ["AUTH_SECRET", "ADMIN_PASSWORD_HASH"])
@pytest.mark.parametrize("method, path, kwargs", PROTECTED_REQUESTS)
def test_protected_endpoints_are_503_when_auth_is_not_configured(
    client, seeded_lead, ai_calls, monkeypatch, name, method, path, kwargs
):
    # `client` carries a token that was valid; with no config it must still not pass.
    monkeypatch.delenv(name)

    response = client.request(method, path, **kwargs)

    assert response.status_code == 503
    assert "Seeded Person" not in response.text
    assert ai_calls == []


def test_a_too_short_secret_also_fails_closed(client, monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "short")

    assert client.get("/leads").status_code == 503


def test_health_check_stays_open_when_auth_is_not_configured(anonymous_client, monkeypatch):
    monkeypatch.delenv("AUTH_SECRET")
    monkeypatch.delenv("ADMIN_PASSWORD_HASH")

    assert anonymous_client.get("/").status_code == 200


# CORS

def test_cors_preflight_with_authorization_header_needs_no_token(anonymous_client):
    response = anonymous_client.options(
        "/leads",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
