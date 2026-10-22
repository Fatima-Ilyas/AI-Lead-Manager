from sqlalchemy import text

# The leads table as it exists in the MVP database, in column order:
# (name, data_type, character_maximum_length, is_nullable, column_default)
EXPECTED_LEADS_COLUMNS = [
    ("id", "integer", None, "NO", "nextval('leads_id_seq'::regclass)"),
    ("name", "character varying", 100, "YES", None),
    ("email", "character varying", 150, "YES", None),
    ("company", "character varying", 150, "YES", None),
    ("requirement", "text", None, "YES", None),
    ("budget", "character varying", 100, "YES", None),
    ("timeline", "character varying", 100, "YES", None),
    ("lead_score", "integer", None, "YES", None),
    ("score_reason", "text", None, "YES", None),
    ("ai_response", "text", None, "YES", None),
    ("status", "character varying", 50, "YES", "'new'::character varying"),
    ("created_at", "timestamp without time zone", None, "YES", "CURRENT_TIMESTAMP"),
    ("follow_up_date", "timestamp without time zone", None, "YES", None),
    ("ai_follow_up_days", "integer", None, "YES", None),
]


def test_leads_columns_match_baseline(db_engine):
    with db_engine.connect() as connection:
        rows = connection.execute(text("""
            SELECT column_name, data_type, character_maximum_length,
                   is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'leads'
            ORDER BY ordinal_position
        """)).all()

    assert [tuple(row) for row in rows] == EXPECTED_LEADS_COLUMNS


def test_leads_only_constraint_is_primary_key(db_engine):
    with db_engine.connect() as connection:
        rows = connection.execute(text("""
            SELECT conname, contype
            FROM pg_constraint
            WHERE conrelid = 'public.leads'::regclass
              AND contype <> 'n'
        """)).all()

    assert [tuple(row) for row in rows] == [("leads_pkey", "p")]


def test_leads_only_index_is_primary_key(db_engine):
    with db_engine.connect() as connection:
        rows = connection.execute(text("""
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = 'leads'
        """)).scalars().all()

    assert rows == ["leads_pkey"]


def test_leads_id_uses_leads_id_seq(db_engine):
    with db_engine.connect() as connection:
        sequence = connection.execute(
            text("SELECT pg_get_serial_sequence('public.leads', 'id')")
        ).scalar_one()

    assert sequence == "public.leads_id_seq"


def test_database_is_at_baseline_revision(db_engine):
    with db_engine.connect() as connection:
        version = connection.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()

    assert version == "0001_baseline_leads"
