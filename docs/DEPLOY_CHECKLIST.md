# Deploy checklist

Work through this before the first real deployment, and after any change to hosting.

- [ ] **Tighten CORS.** `backend/core/config.py` always allows `http://localhost:5173` and `http://localhost:5174` (`DEV_ORIGINS`). Remove them for production and set `ALLOWED_ORIGINS` to the deployed frontend origin only (for example the Vercel URL, with no trailing path).
- [ ] Set `DATABASE_URL`, `GEMINI_API_KEY` and `GEMINI_MODEL` in the host's environment settings, never in the repo. For Neon, add `?sslmode=require` to `DATABASE_URL`.
- [ ] Run `alembic upgrade head` against the new database. For a database that already has the `leads` table, run `alembic stamp 0001_baseline_leads` instead.
- [ ] Confirm `backend/.env` was never committed (`git log --all -- backend/.env`). If a secret was ever committed, rotate it.

## Admin login

Every lead endpoint (`GET /leads`, `POST /leads`, the two `PUT /leads/{id}/...`) needs an admin token from `POST /auth/login`. `GET /` and `/auth/login` stay open. There is one shared admin password and no users table.

If the two auth variables below are missing in an environment, the lead endpoints and `/auth/login` return **503**. They never return data. That is the safe failure, but it means the app is unusable there until you set them.

### Environment variables (backend project)

| Variable | Required | What it is |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | yes | Hash of the admin password, made by the script below. Paste only the value after `ADMIN_PASSWORD_HASH=`. It looks like `scrypt:16384:8:1:...:...` and has no `$`, spaces or quotes. |
| `AUTH_SECRET` | yes | Random key that signs the tokens. At least 32 characters; a shorter value is treated as missing. |
| `AUTH_TOKEN_TTL_MINUTES` | no | Token lifetime. Default 480 (8 hours). An invalid or non-positive value silently falls back to 480. |

Add `ADMIN_PASSWORD_HASH=`, `AUTH_SECRET=` and `AUTH_TOKEN_TTL_MINUTES=480` to `backend/.env.example` as well (names only, no values).

### Generate the values

Run these on your own machine, from `backend/` with the virtual environment active:

```powershell
# Random password (shown once) and its hash. Save the password in a password manager.
python -m scripts.hash_password --generate

# Or type your own password (hidden, 12 to 256 characters) and get only the hash line.
python -m scripts.hash_password

# The token signing key.
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

- Do not paste the password or the secret into chat, tickets or the repo. Only `ADMIN_PASSWORD_HASH` and `AUTH_SECRET` go into Vercel.
- Clear the terminal scrollback after `--generate`.

### Before deploying

- [ ] In the backend Vercel project, set `ADMIN_PASSWORD_HASH` and `AUTH_SECRET` for **Production** (and **Preview** if previews should work).
- [ ] Redeploy after setting them. A change to environment variables is only picked up by a new deployment (unverified; redeploying is the safe assumption).
- [ ] `ALLOWED_ORIGINS` (or `FRONTEND_URL`) contains the exact frontend origin. The browser sends an `Authorization` header, so it makes a CORS preflight request first.
- [ ] `DATABASE_URL` is the pooled Neon URL.
- [ ] The frontend project's `VITE_API_BASE_URL` points at the backend. The frontend must be rebuilt from a commit that includes the login page.

Deploy the backend first, then the frontend straight after. Until the new frontend is live, an old frontend gets 401 and cannot load leads. It leaks nothing.

### Verify after deploying

Replace `<backend>` with the backend's production URL. `curl.exe` ships with Windows; in PowerShell type `curl.exe`, not `curl`.

1. [ ] `curl.exe -s -o NUL -w "%{http_code}" https://<backend>/leads` returns **401**. Before this deploy it returned 200, so this is your before/after proof.
2. [ ] `curl.exe -s -o NUL -w "%{http_code}" https://<backend>/` returns **200**.
3. [ ] `curl.exe -s -o NUL -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{}" https://<backend>/leads` returns **401** (not 422), and the lead count in the app does not change.
4. [ ] Wrong password: `curl.exe -s -w " %{http_code}" -X POST -H "Content-Type: application/json" -d "{\"password\":\"not-the-password\"}" https://<backend>/auth/login` returns `{"detail":"Invalid credentials"} 401`.
5. [ ] Do the correct-password check in the browser, not with curl, so the password does not end up in your shell history. Open the frontend: it shows the **Sign in** page. A wrong password shows an error. The right password shows your live workspace: no "Sample workspace" banner, and the badge says "Live data".
6. [ ] In the browser's developer tools (Network tab), `GET /leads` carries an `Authorization: Bearer ...` header and returns 200. There are no CORS errors in the console. Do not copy the token anywhere.
7. [ ] Reload the page: you stay signed in (the token lives in `sessionStorage`, so it is gone when the tab closes). Click **Sign out** (top right): you return to the Sign in page. Signing in again loads the lead list fresh.
8. [ ] If any step returns **503**, the auth variables are missing for that environment, or you did not redeploy after adding them. If the frontend shows "Not connected" with "Sign-in isn't set up on the server yet", that is the same cause.

### Old deployments

- [ ] In the Vercel dashboard, open the backend project's **Deployments** list. Every older deployment keeps its own unique URL and still runs its own old code against the same Neon database. Request `/leads` on each old URL. Any that answers 200 without a login must be deleted, or confirmed to be covered by Vercel's Deployment Protection (unverified whether that applies to your plan).

### Do not use instant rollback

**Do not use Vercel's "Instant Rollback", or promote an older deployment, to fix a bad deploy.** Any deployment from before the login commits serves `GET /leads` with no login, so rolling back to one re-opens the whole API (and its Gemini key) to anyone with the URL. Fix forward with a new commit instead. If you must roll back, pick only a deployment that was built from the login commits and check step 1 above straight afterwards.

### Rotating credentials

- **Change the password:** generate a new hash, replace `ADMIN_PASSWORD_HASH`, redeploy. Existing tokens stay valid until they expire, because tokens are signed with `AUTH_SECRET`, not the password. To end sessions at once, also rotate `AUTH_SECRET`.
- **Rotate `AUTH_SECRET`:** replace the value and redeploy. Every signed-in user is signed out. There is no other way to revoke a single token.

### Known limits

- There is no rate limit on `/auth/login`. An in-memory limiter does not work across serverless instances, and a database-backed one needs a schema change. Defence is a long random password (use `--generate`) and the cost of the scrypt hash. If your Vercel plan has firewall rate limiting, add a rule for `POST /auth/login` (availability unverified).
- `/docs` and `/openapi.json` are still public and show the API shape, not any data.
- The token is kept in browser storage, so a cross-site scripting bug in the frontend could steal it. It lasts `AUTH_TOKEN_TTL_MINUTES` and cannot be revoked early (see above).
- One shared password means no record of who did what. Phase 2 (real users and organizations) replaces this.
- The login flow has not been exercised in a real browser against a deployed backend as of this commit. Steps 5 to 7 above are the first real test.
