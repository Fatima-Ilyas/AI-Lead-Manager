"""The ORM model and the engine/session setup, checked against the migrated test database."""
import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Column, Integer, MetaData, Table, text

from db.base import Base
from db.models import Lead
from db import session as db_session


def diff_against_database(engine, metadata):
    with engine.connect() as connection:
        context = MigrationContext.configure(
            connection,
            opts={"compare_type": True, "compare_server_default": True},
        )
        # alembic_version belongs to Alembic, not to the model.
        return [
            change
            for change in compare_metadata(context, metadata)
            if not _is_alembic_version(change)
        ]


def _is_alembic_version(change):
    return change[0] == "remove_table" and change[1].name == "alembic_version"


# Model vs migrated database

def test_model_metadata_matches_migrated_database(db_engine):
    assert diff_against_database(db_engine, Base.metadata) == []


def test_comparison_detects_a_missing_column(db_engine):
    # Guards the test above against passing vacuously.
    partial = MetaData()
    Table("leads", partial, Column("id", Integer, primary_key=True))

    changes = diff_against_database(db_engine, partial)

    removed = {change[3].name for change in changes if change[0] == "remove_column"}
    assert "name" in removed
    assert "created_at" in removed


def test_model_only_defines_the_leads_table():
    assert list(Base.metadata.tables) == ["leads"]


# Engine and session

@pytest.fixture
def fresh_engine():
    db_session.get_engine.cache_clear()
    yield
    db_session.get_engine().dispose()
    db_session.get_engine.cache_clear()


def test_engine_uses_pool_settings_and_test_database(fresh_engine):
    engine = db_session.get_engine()

    assert engine is db_session.get_engine()
    assert engine.pool.size() == 5
    assert engine.pool._max_overflow == 10
    assert engine.pool._pre_ping is True
    assert "test" in engine.url.database


def test_get_db_yields_working_session_and_closes_it(fresh_engine, clean_db):
    generator = db_session.get_db()
    session = next(generator)

    lead = Lead(name="ORM Lead", email="orm@example.com")
    session.add(lead)
    session.commit()

    assert lead.id is not None
    assert lead.status == "new"
    assert lead.created_at is not None

    stored = session.get(Lead, lead.id)
    assert stored.name == "ORM Lead"
    assert stored.lead_score is None

    with pytest.raises(StopIteration):
        next(generator)

    # A closed session returns its connection to the pool.
    assert db_session.get_engine().pool.checkedout() == 0


def test_get_database_url_raises_when_unset(monkeypatch):
    from core import config

    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        config.get_database_url()
