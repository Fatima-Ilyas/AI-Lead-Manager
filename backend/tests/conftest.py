import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_DIR / ".env")


def _resolve_test_database_url():
    test_url = os.getenv("TEST_DATABASE_URL")
    if not test_url:
        pytest.exit("TEST_DATABASE_URL is not set; refusing to run tests.", returncode=1)

    test = make_url(test_url)
    if "test" not in (test.database or ""):
        pytest.exit("TEST_DATABASE_URL must point to a database whose name contains 'test'.", returncode=1)

    dev_url = os.getenv("DATABASE_URL")
    if dev_url:
        dev = make_url(dev_url)
        if (test.host, test.port, test.database) == (dev.host, dev.port, dev.database):
            pytest.exit("TEST_DATABASE_URL points at the same database as DATABASE_URL.", returncode=1)

    return test_url


TEST_DATABASE_URL = _resolve_test_database_url()

# Anything that reads DATABASE_URL after this point (the app, Alembic) sees
# the test database, never the development one.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

# Tests must never reach Gemini with a real key.
os.environ["GEMINI_API_KEY"] = "test-key-not-real"

# Fixed test credentials, never the real ones. The hash is made once here so
# only the login tests pay for scrypt.
from core.security import create_access_token, hash_password  # noqa: E402

TEST_ADMIN_PASSWORD = "test-admin-password"
TEST_AUTH_SECRET = "test-auth-secret-" + "x" * 32
os.environ["ADMIN_PASSWORD_HASH"] = hash_password(TEST_ADMIN_PASSWORD)
os.environ["AUTH_SECRET"] = TEST_AUTH_SECRET
os.environ.pop("AUTH_TOKEN_TTL_MINUTES", None)


def _alembic_config():
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["database_url"] = TEST_DATABASE_URL
    return config


@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DATABASE_URL)

    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))

    command.upgrade(_alembic_config(), "head")

    yield engine

    engine.dispose()


@pytest.fixture
def clean_db(db_engine):
    with db_engine.begin() as connection:
        connection.execute(text("TRUNCATE leads RESTART IDENTITY"))

    return db_engine


@pytest.fixture
def admin_password():
    return TEST_ADMIN_PASSWORD


@pytest.fixture
def auth_secret():
    return TEST_AUTH_SECRET


@pytest.fixture
def client(clean_db):
    """A client signed in as the admin, so the lead tests need no login."""
    from main import app

    token = create_access_token(TEST_AUTH_SECRET, ttl_minutes=60)
    # Return 500 responses instead of re-raising, so tests see what the
    # frontend sees.
    with TestClient(
        app,
        raise_server_exceptions=False,
        headers={"Authorization": f"Bearer {token}"},
    ) as test_client:
        yield test_client


@pytest.fixture
def anonymous_client(clean_db):
    """A client with no credentials."""
    from main import app

    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
