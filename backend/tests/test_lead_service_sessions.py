"""Session and connection handling of the lead service.

POST /leads must not hold a database session or connection during the slow
Gemini call, and no endpoint may leak a connection, including on error paths.
"""
import importlib.util

import pytest
from sqlalchemy import text

from db.session import get_engine
from services import lead_service

ANALYZE_LEAD_TARGET = "services.lead_service.analyze_lead"

VALID_LEAD = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "company": "Analytical Engines",
    "requirement": "CRM for 20 sales reps",
    "budget": "$10,000",
    "timeline": "2 weeks",
}

AI_RESULT = {
    "score": 82,
    "reason": "Clear need and budget.",
    "response": "Thanks for reaching out.",
    "follow_up_days": 2,
}


def open_transactions(engine):
    """Other connections to the test database that sit inside an open transaction.

    Filters by database and excludes this query's own connection, so the
    answer does not depend on how this test reads it.
    """
    with engine.connect() as connection:
        return connection.execute(text("""
            SELECT count(*)
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND pid <> pg_backend_pid()
              AND state LIKE 'idle in transaction%'
        """)).scalar_one()


def insert_lead(engine, **values):
    columns = ", ".join(values)
    placeholders = ", ".join(f":{name}" for name in values)
    with engine.begin() as connection:
        return connection.execute(
            text(f"INSERT INTO leads ({columns}) VALUES ({placeholders}) RETURNING id"),
            values,
        ).scalar_one()


@pytest.fixture
def fake_ai(monkeypatch):
    def install(analyze):
        monkeypatch.setattr(ANALYZE_LEAD_TARGET, analyze)

    return install


# During the AI call

def test_no_connection_or_transaction_is_open_during_ai_call(client, clean_db, fake_ai):
    seen = {}

    def analyze(lead):
        seen["checked_out"] = get_engine().pool.checkedout()
        seen["open_transactions"] = open_transactions(clean_db)
        return dict(AI_RESULT)

    fake_ai(analyze)

    response = client.post("/leads", json=VALID_LEAD)

    assert response.status_code == 200
    assert seen == {"checked_out": 0, "open_transactions": 0}


def test_insert_is_committed_before_ai_call(client, clean_db, fake_ai):
    seen = {}

    def analyze(lead):
        # A separate connection only sees committed data.
        with clean_db.connect() as connection:
            seen["row"] = connection.execute(
                text("SELECT name, status, lead_score FROM leads")
            ).one_or_none()
        return dict(AI_RESULT)

    fake_ai(analyze)

    response = client.post("/leads", json=VALID_LEAD)

    assert response.status_code == 200
    assert tuple(seen["row"]) == ("Ada Lovelace", "new", None)


# No leaks, including error paths

def _create_ok(client, clean_db, fake_ai):
    fake_ai(lambda lead: dict(AI_RESULT))
    return client.post("/leads", json=VALID_LEAD), 200


def _create_ai_failure(client, clean_db, fake_ai):
    def analyze(lead):
        raise ValueError("Gemini returned an unexpected format.")

    fake_ai(analyze)
    return client.post("/leads", json=VALID_LEAD), 500


def _create_overflow(client, clean_db, fake_ai):
    fake_ai(lambda lead: dict(AI_RESULT))
    return client.post("/leads", json=dict(VALID_LEAD, name="x" * 101)), 500


def _list(client, clean_db, fake_ai):
    insert_lead(clean_db, name="Listed")
    return client.get("/leads"), 200


def _status_ok(client, clean_db, fake_ai):
    lead_id = insert_lead(clean_db, name="Status")
    return client.put(f"/leads/{lead_id}/status", params={"status": "closed"}), 200


def _status_invalid(client, clean_db, fake_ai):
    lead_id = insert_lead(clean_db, name="Status")
    return client.put(f"/leads/{lead_id}/status", params={"status": "won"}), 200


def _status_not_found(client, clean_db, fake_ai):
    return client.put("/leads/999/status", params={"status": "closed"}), 200


def _follow_up_ok(client, clean_db, fake_ai):
    lead_id = insert_lead(clean_db, name="Follow-up")
    return client.put(
        f"/leads/{lead_id}/follow-up", params={"follow_up_date": "2026-11-05"}
    ), 200


def _follow_up_not_found(client, clean_db, fake_ai):
    return client.put("/leads/999/follow-up", params={"follow_up_date": "2026-11-05"}), 200


def _follow_up_invalid_date(client, clean_db, fake_ai):
    lead_id = insert_lead(clean_db, name="Follow-up")
    return client.put(
        f"/leads/{lead_id}/follow-up", params={"follow_up_date": "not-a-date"}
    ), 500


SCENARIOS = [
    _create_ok,
    _create_ai_failure,
    _create_overflow,
    _list,
    _status_ok,
    _status_invalid,
    _status_not_found,
    _follow_up_ok,
    _follow_up_not_found,
    _follow_up_invalid_date,
]


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.__name__.lstrip("_"))
def test_no_connection_is_leaked(scenario, client, clean_db, fake_ai):
    response, expected_status = scenario(client, clean_db, fake_ai)

    assert response.status_code == expected_status
    assert get_engine().pool.checkedout() == 0
    assert open_transactions(clean_db) == 0


# psycopg2 code path is gone

def test_database_module_is_gone():
    assert importlib.util.find_spec("database") is None
    assert not hasattr(lead_service, "get_connection")
