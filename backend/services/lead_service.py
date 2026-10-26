from datetime import datetime, timedelta

from sqlalchemy import select, update

from db.models import Lead
from db.session import new_session
from ai_service import analyze_lead


def create_lead(lead):
    # Step 1: Save the lead. The session is closed (and its connection returned
    # to the pool) before the slow Gemini call.
    with new_session() as db:
        new_lead = Lead(
            name=lead["name"],
            email=lead["email"],
            company=lead["company"],
            requirement=lead["requirement"],
            budget=lead["budget"],
            timeline=lead["timeline"]
        )
        db.add(new_lead)
        db.commit()
        lead_id = new_lead.id

    # Step 2: Send the lead to Gemini
    lead_data = {
        "name": lead["name"],
        "email": lead["email"],
        "company": lead["company"],
        "requirement": lead["requirement"],
        "budget": lead["budget"],
        "timeline": lead["timeline"]
    }

    ai_result = analyze_lead(lead_data)

    # Step 3: Save Gemini's analysis and follow-up date
    follow_up_date = datetime.now() + timedelta(
        days=ai_result["follow_up_days"]
    )

    with new_session() as db:
        db.execute(
            update(Lead)
            .where(Lead.id == lead_id)
            .values(
                lead_score=ai_result["score"],
                score_reason=ai_result["reason"],
                ai_response=ai_result["response"],
                follow_up_date=follow_up_date,
                ai_follow_up_days=ai_result["follow_up_days"]
            )
        )
        db.commit()

    # Step 4: Return the complete result
    return {
        "message": "Lead created and analyzed successfully",
        "lead_id": lead_id,
        "lead_score": ai_result["score"],
        "score_reason": ai_result["reason"],
        "ai_response": ai_result["response"]
    }


def list_leads(db):
    rows = db.scalars(select(Lead).order_by(Lead.created_at.desc())).all()

    leads = []

    for row in rows:
        leads.append({
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "company": row.company,
            "requirement": row.requirement,
            "budget": row.budget,
            "timeline": row.timeline,
            "lead_score": row.lead_score,
            "score_reason": row.score_reason,
            "ai_response": row.ai_response,
            "status": row.status,
            "created_at": row.created_at,
            "follow_up_date": row.follow_up_date,
            "ai_follow_up_days": row.ai_follow_up_days
        })

    return leads


def update_status(db, lead_id, status):
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

    result = db.execute(
        update(Lead)
        .where(Lead.id == lead_id)
        .values(status=status)
        .returning(Lead.id, Lead.status)
    ).one_or_none()

    if result is None:
        return {
            "error": "Lead not found"
        }

    db.commit()

    return {
        "message": "Lead status updated successfully",
        "lead_id": result[0],
        "status": result[1]
    }


def update_follow_up(db, lead_id, follow_up_date):
    result = db.execute(
        update(Lead)
        .where(Lead.id == lead_id)
        .values(follow_up_date=follow_up_date)
        .returning(Lead.id, Lead.follow_up_date)
    ).one_or_none()

    if result is None:
        return {
            "error": "Lead not found"
        }

    db.commit()

    return {
        "message": "Follow-up date updated successfully",
        "lead_id": result[0],
        "follow_up_date": result[1]
    }
