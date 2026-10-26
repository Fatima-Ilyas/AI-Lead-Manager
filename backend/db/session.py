from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.config import get_database_url

# Not bound to an engine at import time, so importing this module needs no
# database. get_db binds each session to the shared engine.
SessionLocal = sessionmaker(autoflush=False, expire_on_commit=False)


@lru_cache
def get_engine():
    # One engine (and one connection pool) per process, created on first use.
    return create_engine(
        get_database_url(),
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )


def new_session():
    """A session bound to the shared engine. Use as a context manager to close it."""
    return SessionLocal(bind=get_engine())


def get_db():
    """FastAPI dependency: one session per request, returned to the pool after."""
    session = new_session()
    try:
        yield session
    finally:
        session.close()
