import os
import re
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)


def analyze_lead(lead):
    prompt = f"""
You are an AI sales assistant.

Analyze the following business lead:

Name: {lead['name']}
Email: {lead['email']}
Company: {lead['company']}
Requirement: {lead['requirement']}
Budget: {lead['budget']}
Timeline: {lead['timeline']}

Return your response in exactly this format:

SCORE: [number from 0 to 100]
REASON: [short explanation of why this lead received this score]
RESPONSE: [a professional response that could be sent to the lead]
FOLLOW_UP_DAYS: [number of days until the lead should be followed up]

Scoring guidelines:
- Higher budget can indicate stronger buying potential.
- Clear requirements should increase the score.
- A shorter timeline should increase the score.
- Larger business scale can increase the score.
- Missing important information can decrease the score.

Follow-up guidelines:
- High-intent leads should generally be followed up within 1 day.
- Medium-intent leads should generally be followed up within 3 days.
- Low-intent leads should generally be followed up within 7 days.
- Use your judgment based on the lead's timeline and urgency.

Do not include any extra sections.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    text = response.text

    score_match = re.search(r"SCORE:\s*(\d+)", text)
    reason_match = re.search(
        r"REASON:\s*(.*?)(?=\nRESPONSE:)",
        text,
        re.DOTALL
    )
    response_match = re.search(
    r"RESPONSE:\s*(.*?)(?=\nFOLLOW_UP_DAYS:)",
    text,
    re.DOTALL
)

    follow_up_match = re.search(
        r"FOLLOW_UP_DAYS:\s*(\d+)",
        text
    )

    if (
        not score_match
        or not reason_match
        or not response_match
        or not follow_up_match
    ):
        raise ValueError("Gemini returned an unexpected format.")

    score = int(score_match.group(1))
    score = max(0, min(100, score))

    reason = reason_match.group(1).strip()
    ai_response = response_match.group(1).strip()
    follow_up_days = int(follow_up_match.group(1))

    follow_up_days = int(follow_up_match.group(1))

    return {
    "score": score,
    "reason": reason,
    "response": ai_response,
    "follow_up_days": follow_up_days
}