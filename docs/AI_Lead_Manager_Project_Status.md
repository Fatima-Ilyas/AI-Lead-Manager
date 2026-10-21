# AI Lead Manager --- Project Status & Development Log

**Last updated:** 20 October 2026\
**Project:** AI Lead Manager (intended future SaaS product under
Noventra)\
**Repository:** https://github.com/Fatima-Ilyas/AI-Lead-Manager\
**Local project folder:** `C:\dev\AI-Lead-Manager`

> This document records what is known to have been built or discussed so
> far. It distinguishes implemented features from planned work and from
> checks that have not yet been confirmed.

## 1. Project overview

AI Lead Manager is a web application intended to help businesses manage
sales leads. The current MVP combines a React frontend, a FastAPI
backend, PostgreSQL storage, and Google's Gemini API for AI-assisted
lead analysis.

The longer-term goal is to evolve it into a professional multi-tenant
SaaS product under **Noventra**. The envisioned product would eventually
consolidate leads from channels such as website forms/widgets, WhatsApp,
email, social platforms and other integrations into one workflow. These
omnichannel and SaaS capabilities are **future plans**, not features
confirmed as implemented in the current MVP.

## 2. Technology stack

-   **Frontend:** React, Vite, JavaScript, CSS
-   **HTTP/API client:** Axios
-   **Backend:** Python, FastAPI, Uvicorn
-   **Database:** PostgreSQL
-   **Database driver:** `psycopg2-binary`
-   **AI integration:** Google Gemini via the `google-genai` package
-   **Configuration:** environment variables loaded with `python-dotenv`
-   **Version control:** Git and GitHub
-   **Current development environment:** Windows, PowerShell, VS Code
    (as used in development)

## 3. Repository and collaboration status

-   GitHub repository: `https://github.com/Fatima-Ilyas/AI-Lead-Manager`
-   Git remote name: `origin`
-   Remote URL: `https://github.com/Fatima-Ilyas/AI-Lead-Manager.git`
-   The main branch initially had commit `eb36555`
    (`Initial commit - AI Lead Manager MVP`).
-   A partner pushed commit `29eac86`
    (`Polish sales workspace frontend`) to `origin/main`.
-   A `git fetch origin` confirmed the remote had advanced by one commit
    and the local `main` branch was one commit behind.
-   The user was then instructed to run
    `git pull --ff-only origin main`. The user subsequently said they
    had pulled the frontend changes.
-   **Last confirmed state:** the pull was reported as completed by the
    user. A post-pull `git status`, installation, and runtime test were
    requested but their results are not yet recorded in this project
    log.

### Git commands used to inspect and sync

``` powershell
cd C:\dev\AI-Lead-Manager
git status
git branch
git remote -v
git fetch origin
git log -5 --oneline --decorate
git log HEAD..origin/main --oneline
git pull --ff-only origin main
```

The `--ff-only` option was recommended because Git reported the local
branch could be fast-forwarded. It avoids creating an unnecessary merge
commit.

## 4. Local folder structure (known)

``` text
AI-Lead-Manager/
├── .gitignore
├── backend/
│   ├── venv/                 # local Python virtual environment; ignored by Git
│   ├── database.py
│   ├── ai_service.py
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── node_modules/         # local dependencies; ignored by Git
    └── src/
        └── App.jsx
```

This is a high-level structure based on the files previously discussed;
the exact current tree may contain additional files after the partner's
frontend update.

## 5. Implemented backend functionality

### FastAPI application

The backend has a FastAPI application titled **AI Lead Manager**. The
previously discussed `main.py` includes these routes:

-   `GET /` --- basic root/health-style response.
-   `POST /leads` --- create a lead, request AI analysis, and save the
    analysis.
-   `GET /leads` --- retrieve saved leads and their related fields.
-   `PUT /leads/{lead_id}/status` --- update a lead's status.
-   `PUT /leads/{lead_id}/follow-up` --- update a lead's follow-up date.

The existing lead status values were described as `new`, `contacted`,
`qualified`, and `closed`.

### Lead fields

The previously documented lead input contains:

-   Name
-   Email
-   Company
-   Requirement
-   Budget
-   Timeline

The database also stores analysis results and lead-management metadata.

### Database

-   Local PostgreSQL version reported: **16.15**
-   Local database name: `ai_lead_manager`
-   Database connections are opened per request/operation rather than
    kept as one global connection. Connection/cursor cleanup uses
    `finally` blocks in the backend code described previously.
-   The `DATABASE_URL` environment variable is used for database
    connection configuration.

Previously recorded `leads` table fields:

-   `id` --- serial primary key
-   `name`
-   `email`
-   `company`
-   `requirement`
-   `budget`
-   `timeline`
-   `lead_score`
-   `score_reason`
-   `ai_response`
-   `status` --- default `new`
-   `created_at` --- default current timestamp
-   `follow_up_date` --- timestamp
-   `ai_follow_up_days` --- integer

This schema description reflects the last code/database information
recorded in the conversation. Verify the actual current schema before
applying migrations or altering columns.

## 6. AI lead analysis

The backend has an `ai_service.py` module that calls Gemini using the
`google-genai` SDK.

The previously working model name was `gemini-3.5-flash-lite`. The model
name and availability should be verified when running the app, because
provider model availability can change.

The AI prompt asks Gemini to return:

-   `SCORE`: a value from 0 to 100
-   `REASON`: a short explanation for the score
-   `RESPONSE`: a professional response that could be sent to the lead
-   `FOLLOW_UP_DAYS`: the recommended number of days before following up

Scoring guidance considers factors such as budget, requirement clarity,
timeline/urgency and business scale. Follow-up guidance generally
suggests one day for high-intent leads, three days for medium-intent
leads and seven days for low-intent leads, with model judgment.

The backend parses the structured response with regular expressions,
clamps the score to the 0--100 range, and returns the score, reason,
suggested response and follow-up interval. It raises an error if Gemini
returns an unexpected format.

**Important:** AI-generated responses are suggestions. No confirmed
implementation of a guarded autonomous sending system or human-approval
workflow has been recorded.

## 7. Frontend features recorded before the partner's latest update

The existing React dashboard (`frontend/src/App.jsx`) was previously
described as supporting:

-   Fetching leads from the backend
-   Creating a lead
-   Searching by name, email or company
-   Filtering leads by status
-   Clearing filters
-   Updating lead status through a dropdown
-   Sorting by lead score in descending order
-   Expanding lead details
-   Lead priority labels:
    -   High: score ≥ 70
    -   Medium: score ≥ 40 and \< 70
    -   Low: score \< 40
-   Summary statistics:
    -   Total leads
    -   High-intent leads
    -   Average lead score
    -   Counts for new, contacted, qualified and closed leads
-   Follow-up counts for overdue, today and upcoming
-   Editing and saving a follow-up date
-   A follow-up list sorted by date
-   A "View Lead" action that scrolls to and expands the selected lead
-   An AI-suggested follow-up date based on `ai_follow_up_days`
-   A display such as "AI Suggested: Follow up in X days"
-   Styling refinements, including priority badges, card hover states
    and spacing

The frontend previously used a hardcoded API base URL of
`http://127.0.0.1:8000`. This needs to be checked in the current version
and moved to environment-based configuration before deployment.

### Partner's frontend contribution

The partner pushed a commit named **"Polish sales workspace frontend"**
(`29eac86`). The exact code changes in that commit have not been
inspected in this conversation, so this document does not assume the
specific details of the new UI beyond the commit message.

## 8. Environment and secrets

The local project uses a `.env` file for at least:

-   `GEMINI_API_KEY`
-   `DATABASE_URL`

Never commit, publish, or paste the contents of `.env`. Production
deployments should set these values through the hosting provider's
environment-variable settings.

The root `.gitignore` previously contained:

``` gitignore
# Environment variables
.env
.env.*

# Python
backend/venv/
backend/__pycache__/
backend/**/*.pyc

# Node
frontend/node_modules/
frontend/dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

Check `git status` and GitHub tracking before assuming that secrets are
protected. If a secret was ever committed, adding `.env` to `.gitignore`
does not remove it from Git history; rotate the exposed credential.

## 9. Current deployment status

**No successful deployment has been confirmed.**

The project has been discussed as a local application. Render, Vercel,
Neon, DigitalOcean, AWS and Docker were considered, but the user
clarified that nothing had been deployed at that point.

The most recently recommended initial hosting arrangement was:

-   **Vercel** for the React frontend
-   **Render** for the FastAPI backend
-   **Neon or another managed PostgreSQL provider** for the hosted
    database
-   Gemini API for AI analysis

This is a proposed deployment setup, not a record of completed
deployment. A Neon project may have been explored, but no production
database connection or deployed application was confirmed.

## 10. Security and SaaS readiness

The current MVP should **not yet be treated as a production-ready
multi-tenant SaaS for real customer data**. Authentication and
organization-level data isolation have not been confirmed as
implemented.

Before inviting real customers, the following need to be built and
tested:

-   User authentication and secure sessions/token handling
-   Organizations/workspaces and membership
-   Role-based access control
-   Organization-scoped database queries and strict tenant isolation
-   Secure handling of API keys and production environment variables
-   Input validation, error handling and rate limiting
-   CORS configured for the actual deployed frontend origin
-   Database backups and recovery procedures
-   Logging and monitoring without leaking sensitive information
-   Tests for authorization and cross-tenant data access
-   Privacy, consent, opt-out and human-handoff rules before automated
    messaging

A limited demo with synthetic data can be published earlier, as long as
its limitations are clear and it is not exposed as a secure
customer-ready SaaS.

## 11. Planned SaaS direction --- not yet confirmed as implemented

The intended product direction is **Noventra AI Lead Manager**, growing
from a lead-scoring dashboard into an omnichannel lead operations
platform.

### Planned channel integrations

-   Website forms or chat widget
-   WhatsApp Business Platform/Cloud API
-   Email
-   Facebook and Instagram integrations where supported and approved
-   Webhooks and third-party CRM APIs
-   Manual entry and CSV import
-   A public lead-ingestion API

These integrations require provider accounts, permissions, webhook
verification, consent handling and testing; none should be described as
complete until implemented and verified.

### Planned core SaaS capabilities

-   Multi-tenant workspaces
-   Organization members and roles
-   Multiple business locations
-   Unified inbox for conversations
-   Contact and lead deduplication
-   Lead assignment, stages and activity history
-   AI qualification and response suggestions
-   Follow-up tasks and scheduled automation
-   Approval rules for sensitive actions
-   Integration settings and webhook management
-   Usage tracking and subscription/billing readiness
-   Analytics and audit logs

### Suggested future data model

In addition to leads, consider separate tables/entities for:

-   `organizations`
-   `users`
-   `organization_members`
-   `locations`
-   `activities`
-   `conversations`
-   `messages`
-   `tasks`
-   `ai_runs`
-   `automation_rules`
-   `workflow_jobs`
-   `integrations`
-   `usage_events`
-   `audit_logs`
-   Subscription/billing records when needed

These are architectural recommendations, not claims that the tables
already exist.

### Suggested architecture principles

-   Keep the AI separate from business-policy enforcement.
-   Treat model output as a proposal; validate permissions and rules
    before executing actions.
-   Require human approval for high-impact actions such as
    contract/discount commitments, data deletion, permission changes and
    billing changes.
-   Respect consent and opt-outs for messaging.
-   Use idempotency and retries for webhook and automation processing.
-   Use durable database-backed jobs or a queue for delayed follow-ups;
    do not rely on in-process background tasks for long-running
    scheduled work.
-   Version APIs under a namespace such as `/api/v1` as the system
    grows.

## 12. Recommended next steps

Proceed in this order; verify each step before moving on.

### Step 1 --- Confirm the latest Git state

``` powershell
cd C:\dev\AI-Lead-Manager
git status
git log -3 --oneline
```

Confirm the partner's frontend commit is present and the working tree is
in the expected state.

### Step 2 --- Run and test the updated frontend

``` powershell
cd C:\dev\AI-Lead-Manager\frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally
`http://localhost:5173`.

### Step 3 --- Run the backend in a separate terminal

``` powershell
cd C:\dev\AI-Lead-Manager\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Verify the root endpoint and test the UI-to-API flow. Do not share
`.env` contents or API keys.

### Step 4 --- Fix production configuration

-   Replace the hardcoded frontend API URL with a Vite environment
    variable, for example `VITE_API_BASE_URL`.
-   Configure backend CORS for the deployed frontend origin.
-   Confirm dependency files and startup commands.
-   Keep secrets out of source control.
-   Confirm that database schema creation/migrations are reproducible.

### Step 5 --- Decide whether to deploy a demo or build SaaS foundations first

For a quick portfolio demonstration, deploy with synthetic data and
clearly label it as an MVP. Before onboarding actual businesses,
implement authentication and tenant isolation.

### Step 6 --- Build the SaaS foundation

Start with authentication, organizations/workspaces, memberships, roles
and tenant-scoped access. Add channel integrations only after the
foundation is secure.

### Step 7 --- Add channels and automation incrementally

Start with one channel and validate the complete lead lifecycle before
adding WhatsApp, email, social integrations and additional automations.

## 13. Local run commands at a glance

**Backend terminal:**

``` powershell
cd C:\dev\AI-Lead-Manager\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

**Frontend terminal:**

``` powershell
cd C:\dev\AI-Lead-Manager\frontend
npm install
npm run dev
```

Use two separate terminals. The commands assume the local virtual
environment and dependencies already exist.

## 14. Current status summary

  -----------------------------------------------------------------------
  Area                                Status based on available project
                                      notes
  ----------------------------------- -----------------------------------
  React dashboard                     Existing MVP features recorded;
                                      partner pushed a frontend-polish
                                      commit

  FastAPI backend                     Existing lead CRUD/status/follow-up
                                      endpoints recorded

  PostgreSQL                          Local database recorded; current
                                      live schema should be verified

  Gemini analysis                     Integration and response parsing
                                      recorded as previously working

  GitHub                              Repository exists; partner's
                                      frontend update was pulled
                                      according to user

  Post-pull regression test           Not yet confirmed in the recorded
                                      conversation

  Docker                              Discussed, not confirmed
                                      implemented

  Deployment                          Not confirmed; no live app URL
                                      recorded

  Authentication                      Not confirmed implemented

  Multi-tenant organization isolation Planned, not confirmed implemented

  WhatsApp/email/social integrations  Planned, not confirmed implemented

  Automation/job queue                Planned, not confirmed implemented

  Billing/subscriptions               Planned, not confirmed implemented

  Production readiness                Not yet established
  -----------------------------------------------------------------------

------------------------------------------------------------------------

**Maintenance note:** Update this file whenever a feature is
implemented, tested, deployed or intentionally deferred. Record the
date, relevant commit, tests performed and any known limitations. Do not
mark a planned feature as complete until it has been verified in the
running application.
