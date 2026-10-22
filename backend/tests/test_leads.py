"""Characterization tests: pin the current HTTP behavior of the lead endpoints.

These tests describe what the API does today, including known bugs, so the
Phase 1 refactor can prove it changes nothing. Tests that pin a known bug are
marked "current behavior, to change in Phase 3".
"""
from datetime import datetime, timedelta

import pytest
from sqlalchemy import text

# Where the endpoint looks up analyze_lead. Changes when the code moves.
ANALYZE_LEAD_TARGET = "main.analyze_lead"

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

LEAD_KEYS = {
    "id", "name", "email", "company", "requirement", "budget", "timeline",
    "lead_score", "score_reason", "ai_response", "status", "created_at",
    "follow_up_date", "ai_follow_up_days",
}


@pytest.fixture(autouse=True)
def no_real_ai(monkeypatch):
    def fail(lead):
        raise AssertionError("analyze_lead called without a fake")

    monkeypatch.setattr(ANALYZE_LEAD_TARGET, fail)


@pytest.fixture
def fake_ai(monkeypatch):
    calls = []

    def analyze(lead):
        calls.append(lead)
        return dict(AI_RESULT)

    monkeypatch.setattr(ANALYZE_LEAD_TARGET, analyze)
    return calls


@pytest.fixture
def failing_ai(monkeypatch):
    def analyze(lead):
        raise ValueError("Gemini returned an unexpected format.")

    monkeypatch.setattr(ANALYZE_LEAD_TARGET, analyze)


def insert_lead(engine, **values):
    columns = ", ".join(values)
    placeholders = ", ".join(f":{name}" for name in values)
    with engine.begin() as connection:
        return connection.execute(
            text(f"INSERT INTO leads ({columns}) VALUES ({placeholders}) RETURNING id"),
            values,
        ).scalar_one()


def fetch_lead(engine, lead_id):
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT * FROM leads WHERE id = :id"), {"id": lead_id}
        ).mappings().one_or_none()


def count_leads(engine):
    with engine.connect() as connection:
        return connection.execute(text("SELECT count(*) FROM leads")).scalar_one()


# GET /

def test_root_returns_running_message(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "AI Lead Manager API is running"}


# POST /leads

def test_create_lead_saves_lead_and_analysis(client, clean_db, fake_ai):
    before = datetime.now()

    response = client.post("/leads", json=VALID_LEAD)

    after = datetime.now()
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "message": "Lead created and analyzed successfully",
        "lead_id": body["lead_id"],
        "lead_score": 82,
        "score_reason": "Clear need and budget.",
        "ai_response": "Thanks for reaching out.",
    }
    assert isinstance(body["lead_id"], int)
    assert fake_ai == [VALID_LEAD]

    row = fetch_lead(clean_db, body["lead_id"])
    assert {key: row[key] for key in VALID_LEAD} == VALID_LEAD
    assert row["lead_score"] == 82
    assert row["score_reason"] == "Clear need and budget."
    assert row["ai_response"] == "Thanks for reaching out."
    assert row["ai_follow_up_days"] == 2
    assert row["status"] == "new"
    assert row["created_at"] is not None
    assert before + timedelta(days=2) <= row["follow_up_date"] <= after + timedelta(days=2)


def test_create_lead_missing_field_returns_422_and_saves_nothing(client, clean_db, fake_ai):
    payload = {key: value for key, value in VALID_LEAD.items() if key != "budget"}

    response = client.post("/leads", json=payload)

    assert response.status_code == 422
    assert fake_ai == []
    assert count_leads(clean_db) == 0


def test_create_lead_ai_failure_returns_500_and_keeps_unscored_lead(client, clean_db, failing_ai):
    # current behavior, to change in Phase 3
    response = client.post("/leads", json=VALID_LEAD)

    assert response.status_code == 500
    assert count_leads(clean_db) == 1
    with clean_db.connect() as connection:
        row = connection.execute(text("SELECT * FROM leads")).mappings().one()
    assert row["name"] == VALID_LEAD["name"]
    assert row["status"] == "new"
    assert row["lead_score"] is None
    assert row["score_reason"] is None
    assert row["ai_response"] is None
    assert row["follow_up_date"] is None
    assert row["ai_follow_up_days"] is None


def test_create_lead_varchar_overflow_returns_500(client, clean_db, fake_ai):
    # current behavior, to change in Phase 3
    payload = dict(VALID_LEAD, name="x" * 101)

    response = client.post("/leads", json=payload)

    assert response.status_code == 500
    assert fake_ai == []
    assert count_leads(clean_db) == 0


# GET /leads

def test_list_leads_empty(client):
    response = client.get("/leads")

    assert response.status_code == 200
    assert response.json() == []


def test_list_leads_returns_all_fields_newest_first(client, clean_db):
    older = insert_lead(
        clean_db,
        **VALID_LEAD,
        lead_score=82,
        score_reason="Clear need and budget.",
        ai_response="Thanks for reaching out.",
        status="contacted",
        created_at=datetime(2026, 1, 2, 3, 4, 5, 678901),
        follow_up_date=datetime(2026, 1, 9, 10, 0, 0),
        ai_follow_up_days=7,
    )
    newer = insert_lead(
        clean_db,
        name="Unscored Lead",
        created_at=datetime(2026, 2, 1, 12, 0, 0),
    )

    response = client.get("/leads")

    assert response.status_code == 200
    leads = response.json()
    assert [lead["id"] for lead in leads] == [newer, older]
    assert all(set(lead) == LEAD_KEYS for lead in leads)
    assert leads[1] == {
        "id": older,
        **VALID_LEAD,
        "lead_score": 82,
        "score_reason": "Clear need and budget.",
        "ai_response": "Thanks for reaching out.",
        "status": "contacted",
        "created_at": "2026-01-02T03:04:05.678901",
        "follow_up_date": "2026-01-09T10:00:00",
        "ai_follow_up_days": 7,
    }
    assert leads[0] == {
        "id": newer,
        "name": "Unscored Lead",
        "email": None,
        "company": None,
        "requirement": None,
        "budget": None,
        "timeline": None,
        "lead_score": None,
        "score_reason": None,
        "ai_response": None,
        "status": "new",
        "created_at": "2026-02-01T12:00:00",
        "follow_up_date": None,
        "ai_follow_up_days": None,
    }


# PUT /leads/{lead_id}/status

@pytest.mark.parametrize("status", ["new", "contacted", "qualified", "closed"])
def test_update_status_valid(client, clean_db, status):
    lead_id = insert_lead(clean_db, name="Status Lead")

    response = client.put(f"/leads/{lead_id}/status", params={"status": status})

    assert response.status_code == 200
    assert response.json() == {
        "message": "Lead status updated successfully",
        "lead_id": lead_id,
        "status": status,
    }
    assert fetch_lead(clean_db, lead_id)["status"] == status


def test_update_status_invalid_returns_200_with_error(client, clean_db):
    # current behavior, to change in Phase 3
    lead_id = insert_lead(clean_db, name="Status Lead")

    response = client.put(f"/leads/{lead_id}/status", params={"status": "won"})

    assert response.status_code == 200
    assert response.json() == {
        "error": "Invalid status",
        "allowed_statuses": ["new", "contacted", "qualified", "closed"],
    }
    assert fetch_lead(clean_db, lead_id)["status"] == "new"


def test_update_status_missing_lead_returns_200_with_error(client):
    # current behavior, to change in Phase 3
    response = client.put("/leads/999/status", params={"status": "contacted"})

    assert response.status_code == 200
    assert response.json() == {"error": "Lead not found"}


def test_update_status_without_status_param_returns_422(client):
    response = client.put("/leads/1/status")

    assert response.status_code == 422


# PUT /leads/{lead_id}/follow-up

def test_update_follow_up_valid(client, clean_db):
    lead_id = insert_lead(clean_db, name="Follow-up Lead")

    response = client.put(
        f"/leads/{lead_id}/follow-up",
        params={"follow_up_date": "2026-11-05T09:30:00"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Follow-up date updated successfully",
        "lead_id": lead_id,
        "follow_up_date": "2026-11-05T09:30:00",
    }
    assert fetch_lead(clean_db, lead_id)["follow_up_date"] == datetime(2026, 11, 5, 9, 30)


def test_update_follow_up_date_only_is_stored_as_midnight(client, clean_db):
    lead_id = insert_lead(clean_db, name="Follow-up Lead")

    response = client.put(
        f"/leads/{lead_id}/follow-up",
        params={"follow_up_date": "2026-11-05"},
    )

    assert response.status_code == 200
    assert response.json()["follow_up_date"] == "2026-11-05T00:00:00"


def test_update_follow_up_missing_lead_returns_200_with_error(client):
    # current behavior, to change in Phase 3
    response = client.put(
        "/leads/999/follow-up",
        params={"follow_up_date": "2026-11-05"},
    )

    assert response.status_code == 200
    assert response.json() == {"error": "Lead not found"}


def test_update_follow_up_invalid_date_returns_500(client, clean_db):
    # current behavior, to change in Phase 3
    lead_id = insert_lead(clean_db, name="Follow-up Lead")

    response = client.put(
        f"/leads/{lead_id}/follow-up",
        params={"follow_up_date": "not-a-date"},
    )

    assert response.status_code == 500
    assert fetch_lead(clean_db, lead_id)["follow_up_date"] is None
