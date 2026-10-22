"""Baseline: leads table as it exists in the MVP database.

Existing databases that already have this table must be stamped
(`alembic stamp 0001_baseline_leads`), not upgraded.

Revision ID: 0001_baseline_leads
Revises:
Create Date: 2026-10-22
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_baseline_leads"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "leads",
        # Integer primary key is created as SERIAL, which gives leads_id_seq.
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=True),
        sa.Column("email", sa.String(150), nullable=True),
        sa.Column("company", sa.String(150), nullable=True),
        sa.Column("requirement", sa.Text(), nullable=True),
        sa.Column("budget", sa.String(100), nullable=True),
        sa.Column("timeline", sa.String(100), nullable=True),
        sa.Column("lead_score", sa.Integer(), nullable=True),
        sa.Column("score_reason", sa.Text(), nullable=True),
        sa.Column("ai_response", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(50),
            server_default=sa.text("'new'::character varying"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("follow_up_date", sa.DateTime(timezone=False), nullable=True),
        sa.Column("ai_follow_up_days", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id", name="leads_pkey"),
    )


def downgrade():
    op.drop_table("leads")
