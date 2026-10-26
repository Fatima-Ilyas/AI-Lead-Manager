from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from services import lead_service

router = APIRouter()


class Lead(BaseModel):
    name: str
    email: str
    company: str
    requirement: str
    budget: str
    timeline: str


@router.post("/leads")
def create_lead(lead: Lead):
    return lead_service.create_lead(lead.model_dump())


@router.get("/leads")
def get_leads(db: Session = Depends(get_db)):
    return lead_service.list_leads(db)


@router.put("/leads/{lead_id}/status")
def update_lead_status(lead_id: int, status: str, db: Session = Depends(get_db)):
    return lead_service.update_status(db, lead_id, status)


@router.put("/leads/{lead_id}/follow-up")
def update_follow_up_date(
    lead_id: int, follow_up_date: str, db: Session = Depends(get_db)
):
    return lead_service.update_follow_up(db, lead_id, follow_up_date)
