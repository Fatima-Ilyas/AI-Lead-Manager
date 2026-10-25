from datetime import datetime

from sqlalchemy import DateTime, Integer, PrimaryKeyConstraint, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class Lead(Base):
    """The leads table. Must stay in step with alembic/versions/0001_baseline_leads.py."""

    __tablename__ = "leads"
    __table_args__ = (PrimaryKeyConstraint("id", name="leads_pkey"),)

    id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(150))
    company: Mapped[str | None] = mapped_column(String(150))
    requirement: Mapped[str | None] = mapped_column(Text)
    budget: Mapped[str | None] = mapped_column(String(100))
    timeline: Mapped[str | None] = mapped_column(String(100))
    lead_score: Mapped[int | None] = mapped_column(Integer)
    score_reason: Mapped[str | None] = mapped_column(Text)
    ai_response: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(
        String(50), server_default=text("'new'::character varying")
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), server_default=text("CURRENT_TIMESTAMP")
    )
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    ai_follow_up_days: Mapped[int | None] = mapped_column(Integer)
