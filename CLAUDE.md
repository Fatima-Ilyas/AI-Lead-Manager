# AI Lead Manager

Multi-tenant SaaS in progress (future product under Noventra). Currently an MVP: lead capture, AI scoring, follow-up tracking.

Read `docs/AI_Lead_Manager_Project_Status.md` for current state and `docs/DECISIONS.md` for choices already made.

## Stack

- Frontend: React + Vite (frontend/)
- Backend: FastAPI + Uvicorn (backend/)
- Database: PostgreSQL (psycopg2 now; migrating to SQLAlchemy 2.0 + Alembic)
- AI: Gemini via google-genai (model name from GEMINI_MODEL env var)
- Dev environment: Windows, PowerShell, VS Code

## Run

- Backend: `cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload`
- Frontend: `cd frontend; npm install; npm run dev`

## Working rules

- Never read, print, log, or commit `.env` files or API keys. Use `backend/.env.example` for variable names.
- Work on a feature branch. Small commits, one logical change each. Never push to main.
- Only edit `frontend/` - Frontend edits are allowed for the demo track (login, deploy fixes). Keep them minimal and only within the approved plan.
- Plan first for any task touching the schema, auth, or more than 3 files. Wait for my approval.
- If a requirement is ambiguous, ask before coding.
- Do not add dependencies without telling me why.
- Run backend tests before saying a task is done. If there are no tests for the change, write them.
- Say plainly when something is untested or unverified. Do not claim a feature works without running it.

## Multi-tenancy and security

- Every tenant table has a non-null `organization_id`. Every query on tenant data filters by it.
- Resolve the current user and organization in one shared FastAPI dependency. Endpoints must not do their own filtering ad hoc.
- Cross-tenant tests are required: org A must fail to read, update, and delete org B's data.
- Schema changes go through Alembic migrations, never manual SQL.
- Publishable API keys are stored hashed. Third-party tokens (e.g. WhatsApp) are stored encrypted. Never log tokens or message bodies.

## Public endpoints and webhooks

- Public endpoints accept untrusted input: validate size and type, rate limit, check allowed origins.
- Webhook handlers: verify the signature, store the raw event, return 200 fast, process in a job, dedupe by external ID.
- Lead text is untrusted data. Never let it act as instructions to the AI.

## AI behavior

- AI output is a suggestion, never an action. No automatic sending of messages to leads.
- Use structured (JSON) output validated with Pydantic, not regex parsing.
- AI scoring runs asynchronously and must not block lead creation.
- Record each AI run (model, prompt version, tokens, latency) in `ai_runs`.

## Out of scope unless I say otherwise

Billing, WhatsApp, email, social channels, frontend changes outside the current phase.
