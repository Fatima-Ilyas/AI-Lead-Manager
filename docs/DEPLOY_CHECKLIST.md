# Deploy checklist

Work through this before the first real deployment, and after any change to hosting.

- [ ] **Tighten CORS.** `backend/core/config.py` always allows `http://localhost:5173` and `http://localhost:5174` (`DEV_ORIGINS`). Remove them for production and set `ALLOWED_ORIGINS` to the deployed frontend origin only (for example the Vercel URL, with no trailing path).
- [ ] Set `DATABASE_URL`, `GEMINI_API_KEY` and `GEMINI_MODEL` in the host's environment settings, never in the repo. For Neon, add `?sslmode=require` to `DATABASE_URL`.
- [ ] Run `alembic upgrade head` against the new database. For a database that already has the `leads` table, run `alembic stamp 0001_baseline_leads` instead.
- [ ] Confirm `backend/.env` was never committed (`git log --all -- backend/.env`). If a secret was ever committed, rotate it.
