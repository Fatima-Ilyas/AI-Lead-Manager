from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import get_connection
from ai_service import analyze_lead

import os
from dotenv import load_dotenv

load_dotenv()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


app = FastAPI(title="AI Lead Manager")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Lead(BaseModel):
    name: str
    email: str
    company: str
    requirement: str
    budget: str
    timeline: str


@app.get("/")
def home():
    return {
        "message": "AI Lead Manager API is running"
    }


@app.post("/leads")
def create_lead(lead: Lead):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        # Step 1: Save the lead
        query = """
        INSERT INTO leads
        (name, email, company, requirement, budget, timeline)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id;
        """

        cursor.execute(
            query,
            (
                lead.name,
                lead.email,
                lead.company,
                lead.requirement,
                lead.budget,
                lead.timeline
            )
        )

        lead_id = cursor.fetchone()[0]

        connection.commit()

        # Step 2: Send the lead to Gemini
        lead_data = {
            "name": lead.name,
            "email": lead.email,
            "company": lead.company,
            "requirement": lead.requirement,
            "budget": lead.budget,
            "timeline": lead.timeline
        }

        ai_result = analyze_lead(lead_data)

        # Step 3: Save Gemini's analysis and follow-up date
        from datetime import datetime, timedelta

        follow_up_date = datetime.now() + timedelta(
            days=ai_result["follow_up_days"]
        )

        update_query = """
        UPDATE leads
        SET
            lead_score = %s,
            score_reason = %s,
            ai_response = %s,
            follow_up_date = %s,
            ai_follow_up_days = %s
        WHERE id = %s;
        """

        cursor.execute(
            update_query,
            (
                ai_result["score"],
                ai_result["reason"],
                ai_result["response"],
                follow_up_date,
                ai_result["follow_up_days"],
                lead_id
            )
        )

        connection.commit()

        # Step 4: Return the complete result
        return {
            "message": "Lead created and analyzed successfully",
            "lead_id": lead_id,
            "lead_score": ai_result["score"],
            "score_reason": ai_result["reason"],
            "ai_response": ai_result["response"]
        }

    finally:
        cursor.close()
        connection.close()


@app.get("/leads")
def get_leads():

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT
                id,
                name,
                email,
                company,
                requirement,
                budget,
                timeline,
                lead_score,
                score_reason,
                ai_response,
                status,
                created_at,
                follow_up_date,
                ai_follow_up_days
            FROM leads
            ORDER BY created_at DESC
        """)

        rows = cursor.fetchall()

        leads = []

        for row in rows:
            leads.append({
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "company": row[3],
                "requirement": row[4],
                "budget": row[5],
                "timeline": row[6],
                "lead_score": row[7],
                "score_reason": row[8],
                "ai_response": row[9],
                "status": row[10],
                "created_at": row[11],
                "follow_up_date": row[12],
                "ai_follow_up_days": row[13]
            })

        return leads

    finally:
        cursor.close()
        connection.close()


@app.put("/leads/{lead_id}/status")
def update_lead_status(lead_id: int, status: str):

    allowed_statuses = [
        "new",
        "contacted",
        "qualified",
        "closed"
    ]

    if status not in allowed_statuses:
        return {
            "error": "Invalid status",
            "allowed_statuses": allowed_statuses
        }

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            UPDATE leads
            SET status = %s
            WHERE id = %s
            RETURNING id, status;
            """,
            (status, lead_id)
        )

        result = cursor.fetchone()

        if result is None:
            return {
                "error": "Lead not found"
            }

        connection.commit()

        return {
            "message": "Lead status updated successfully",
            "lead_id": result[0],
            "status": result[1]
        }

    finally:
        cursor.close()
        connection.close()

@app.put("/leads/{lead_id}/follow-up")
def update_follow_up_date(lead_id: int, follow_up_date: str):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            UPDATE leads
            SET follow_up_date = %s
            WHERE id = %s
            RETURNING id, follow_up_date;
            """,
            (follow_up_date, lead_id)
        )

        result = cursor.fetchone()

        if result is None:
            return {
                "error": "Lead not found"
            }

        connection.commit()

        return {
            "message": "Follow-up date updated successfully",
            "lead_id": result[0],
            "follow_up_date": result[1]
        }

    finally:
        cursor.close()
        connection.close()