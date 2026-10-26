# Decisions

Update this file whenever a choice is made. Write "undecided" where it is. Claude Code should ask about undecided items, not guess.

## Stack
- Backend: FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL
- Frontend: React + Vite. I maintain it myself.
- AI: Gemini via google-genai, model name in GEMINI_MODEL env var

## Hosting (proposed, nothing deployed yet)
- Frontend: Vercel
- Backend: Render
- Database: Neon (managed PostgreSQL)

## Build order
1. Foundation: split main.py, SQLAlchemy, Alembic, Pydantic, /api/v1, tests, Dockerfile, CI
2. Auth and multi-tenancy with cross-tenant isolation tests
3. Lead model upgrade (pipeline stages, tasks, activities) and AI rework (async, structured output)
4. Website ingestion: per-org publishable keys, public ingest API, hosted form, embed widget
5. WhatsApp: webhook, contacts, conversations, messages (test number first, then BSP)
6. Pilot with 3 to 5 real businesses before building billing

## Phase 1 status
Phase 1 (foundation) ended early after step 7 (commit cf7979c). Done: routers/services split, SQLAlchemy 2.0 with a connection pool, Alembic baseline migration, env-based config, pytest with a separate test database.

## Deferred until needed (Phase 1 steps 8-12)
- Step 8: Pydantic request/response schemas
- Step 9: /api/v1 prefix (until then the frontend calls the bare /leads paths)
- Step 10: Dockerfile
- Step 11: GitHub Actions workflow that runs the tests
- Step 12: README and status doc updates

## Open decisions
- Job queue: undecided (Postgres-backed vs Redis)
- Payments provider: undecided (check availability for a Pakistan-registered business)
- Target customer niche: undecided
- WhatsApp route: undecided (test number now; BSP vs direct Tech Provider later)
- Noventra business registration status (affects Meta business verification): undecided

## Not yet built (do not assume these exist)
Authentication, organizations, roles, tenant isolation, deployment, webhooks, WhatsApp, email, billing, job queue.
