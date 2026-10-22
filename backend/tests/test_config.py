import pytest

from core import config

DEV = ["http://localhost:5173", "http://localhost:5174"]


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for name in ("ALLOWED_ORIGINS", "FRONTEND_URL", "GEMINI_MODEL"):
        monkeypatch.delenv(name, raising=False)


# get_allowed_origins

def test_origins_default_to_dev_origins():
    assert config.get_allowed_origins() == DEV


def test_origins_read_comma_separated_allowed_origins(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.example.com, https://admin.example.com")

    assert config.get_allowed_origins() == [
        "https://app.example.com",
        "https://admin.example.com",
        *DEV,
    ]


def test_origins_merge_frontend_url_fallback(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.example.com")
    monkeypatch.setenv("FRONTEND_URL", "https://legacy.example.com")

    assert config.get_allowed_origins() == [
        "https://app.example.com",
        "https://legacy.example.com",
        *DEV,
    ]


def test_origins_frontend_url_alone_still_works(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://legacy.example.com")

    assert config.get_allowed_origins() == ["https://legacy.example.com", *DEV]


def test_origins_are_deduplicated(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173,https://app.example.com")
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com")

    assert config.get_allowed_origins() == [
        "http://localhost:5173",
        "https://app.example.com",
        "http://localhost:5174",
    ]


def test_origins_ignore_empty_values(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", " , ,")
    monkeypatch.setenv("FRONTEND_URL", "   ")

    assert config.get_allowed_origins() == DEV


def test_origins_strip_trailing_slash(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.example.com/")

    assert config.get_allowed_origins() == ["https://app.example.com", *DEV]


# get_gemini_model

def test_model_defaults_when_unset():
    assert config.get_gemini_model() == "gemini-3.5-flash-lite"


def test_model_reads_env(monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL", "some-other-model")

    assert config.get_gemini_model() == "some-other-model"


@pytest.mark.parametrize("value", ["", "   "])
def test_model_empty_value_falls_back_to_default(monkeypatch, value):
    monkeypatch.setenv("GEMINI_MODEL", value)

    assert config.get_gemini_model() == "gemini-3.5-flash-lite"


# get_gemini_api_key

def test_api_key_unset_or_empty_is_none(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert config.get_gemini_api_key() is None

    monkeypatch.setenv("GEMINI_API_KEY", "  ")
    assert config.get_gemini_api_key() is None


# CORS wiring on the real app

def preflight(client, origin):
    return client.options(
        "/leads",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
        },
    )


@pytest.mark.parametrize("origin", DEV)
def test_app_allows_dev_origins(client, origin):
    response = preflight(client, origin)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_app_rejects_unlisted_origin(client):
    response = preflight(client, "https://evil.example.com")

    assert "access-control-allow-origin" not in response.headers
