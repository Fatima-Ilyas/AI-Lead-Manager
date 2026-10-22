"""Unit tests for analyze_lead's prompt call and regex parsing, with a fake Gemini client."""
import pytest

import ai_service

LEAD = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "company": "Analytical Engines",
    "requirement": "CRM for 20 sales reps",
    "budget": "$10,000",
    "timeline": "2 weeks",
}

GOOD_REPLY = """SCORE: 82
REASON: Clear need and budget.
RESPONSE: Thanks for reaching out.
FOLLOW_UP_DAYS: 2"""


class FakeClient:
    def __init__(self, text):
        self.text = text
        self.calls = []
        self.models = self

    def generate_content(self, model, contents):
        self.calls.append({"model": model, "contents": contents})
        return type("Response", (), {"text": self.text})()


@pytest.fixture
def gemini(monkeypatch):
    def install(text):
        fake = FakeClient(text)
        monkeypatch.setattr(ai_service, "_get_client", lambda: fake)
        return fake

    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    return install


def test_parses_all_four_fields(gemini):
    gemini(GOOD_REPLY)

    assert ai_service.analyze_lead(LEAD) == {
        "score": 82,
        "reason": "Clear need and budget.",
        "response": "Thanks for reaching out.",
        "follow_up_days": 2,
    }


def test_multiline_reason_and_response_are_kept_and_stripped(gemini):
    gemini(
        "SCORE: 55\n"
        "REASON: Line one.\nLine two.\n"
        "RESPONSE: Hello,\n\nThanks for your interest.\n"
        "FOLLOW_UP_DAYS: 3"
    )

    result = ai_service.analyze_lead(LEAD)

    assert result["reason"] == "Line one.\nLine two."
    assert result["response"] == "Hello,\n\nThanks for your interest."


@pytest.mark.parametrize("reported, expected", [("250", 100), ("100", 100), ("0", 0)])
def test_score_is_clamped_to_0_100(gemini, reported, expected):
    gemini(GOOD_REPLY.replace("SCORE: 82", f"SCORE: {reported}"))

    assert ai_service.analyze_lead(LEAD)["score"] == expected


@pytest.mark.parametrize(
    "missing",
    ["SCORE: 82\n", "REASON: Clear need and budget.\n", "RESPONSE: Thanks for reaching out.\n", "FOLLOW_UP_DAYS: 2"],
)
def test_missing_section_raises_value_error(gemini, missing):
    gemini(GOOD_REPLY.replace(missing, ""))

    with pytest.raises(ValueError, match="unexpected format"):
        ai_service.analyze_lead(LEAD)


def test_unstructured_reply_raises_value_error(gemini):
    gemini("Sorry, I cannot help with that.")

    with pytest.raises(ValueError, match="unexpected format"):
        ai_service.analyze_lead(LEAD)


def test_model_comes_from_env(gemini, monkeypatch):
    fake = gemini(GOOD_REPLY)
    monkeypatch.setenv("GEMINI_MODEL", "some-other-model")

    ai_service.analyze_lead(LEAD)

    assert fake.calls[0]["model"] == "some-other-model"


def test_model_defaults_when_env_empty(gemini, monkeypatch):
    fake = gemini(GOOD_REPLY)
    monkeypatch.setenv("GEMINI_MODEL", "")

    ai_service.analyze_lead(LEAD)

    assert fake.calls[0]["model"] == "gemini-3.5-flash-lite"


def test_prompt_contains_the_lead_details(gemini):
    fake = gemini(GOOD_REPLY)

    ai_service.analyze_lead(LEAD)

    prompt = fake.calls[0]["contents"]
    assert "Name: Ada Lovelace" in prompt
    assert "Budget: $10,000" in prompt


def test_client_is_created_lazily_and_only_once(monkeypatch):
    created = []

    class StubGenaiClient:
        def __init__(self, api_key):
            created.append(api_key)

    monkeypatch.setattr(ai_service, "_client", None)
    monkeypatch.setattr(ai_service.genai, "Client", StubGenaiClient)
    monkeypatch.setenv("GEMINI_API_KEY", "key-for-this-test")

    assert created == []

    first = ai_service._get_client()
    second = ai_service._get_client()

    assert first is second
    assert created == ["key-for-this-test"]
