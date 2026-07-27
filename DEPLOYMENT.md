# Formly — Deployment Guide

> **Frontend → Vercel** | **Backend → Render**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pre-Deployment Code Changes (Required)](#2-pre-deployment-code-changes-required)
3. [Deploy Backend on Render](#3-deploy-backend-on-render)
4. [Deploy Frontend on Vercel](#4-deploy-frontend-on-vercel)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────┐         HTTPS          ┌──────────────────┐
│   Vercel         │ ───────────────────▶  │   Render          │
│   (Next.js)      │   API calls to        │   (FastAPI +      │
│   Frontend       │   NEXT_PUBLIC_API_URL  │    Uvicorn)       │
│   Port: auto     │                       │   Port: 10000     │
└─────────────────┘                        └──────────────────┘
                                                   │
                                             SQLite (file DB)
                                             on Render disk
```

**Key points:**
- The monorepo `vercel.json` at root is designed for Vercel's multi-service layout — but since the backend is going to **Render**, that file is **not needed** and may cause conflicts.
- The frontend uses `NEXT_PUBLIC_API_URL` env var to find the backend.
- The backend uses SQLite with a file path — on Render the working directory differs from local, so the path must be absolute or adapted.
- CORS in the backend currently only allows `localhost:3000` — must allow the Vercel domain.

---

## 2. Pre-Deployment Code Changes (Required)

### 2.1 — Remove / Ignore the root `vercel.json`

The existing `vercel.json` attempts to deploy both frontend and backend as Vercel services. Since the backend goes to Render, **delete it** or rename it:

```bash
# Option A: Delete
rm vercel.json

# Option B: Rename so Vercel ignores it
mv vercel.json vercel.json.bak
```

### 2.2 — Fix Backend CORS to Allow Vercel Domain

**File:** `backend/app/main.py`

Change the CORS origins to read from an environment variable so the Vercel production URL is allowed:

```python
import os

# Replace the hardcoded allow_origins with:
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

> On Render, set `ALLOWED_ORIGINS` to your Vercel URL, e.g.:
> `https://formly-xyz.vercel.app,http://localhost:3000`

### 2.3 — Fix Backend Database Path for Render

**File:** `backend/app/database.py`

SQLite's `sqlite:///./typeform.db` is relative to where `uvicorn` is launched. On Render this can be unpredictable. Make it absolute:

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use an env var or default to a file in the backend directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'typeform.db')}")

engine = create_engine(
    DB_PATH, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.4 — Add `gunicorn` to `requirements.txt` (Render recommendation)

**File:** `backend/requirements.txt`

Render's Python runtime recommends Gunicorn with Uvicorn workers:

```
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
sqlalchemy>=2.0.0
pydantic[email]>=2.0.0
gunicorn>=21.2.0
```

### 2.5 — Ensure Frontend API URL is Configurable (Already Done ✅)

The frontend already reads `process.env.NEXT_PUBLIC_API_URL` with a fallback to `http://localhost:8000` in three places:
- `frontend/lib/api.ts`
- `frontend/app/page.tsx`
- `frontend/app/forms/[id]/results/page.tsx`

**No code changes needed** — just set the env var in Vercel.

---

## 3. Deploy Backend on Render

### Step 1 — Push Code to GitHub

Make sure all the code changes above are committed and pushed.

```bash
git add -A
git commit -m "prepare for Vercel + Render deployment"
git push origin main
```

### Step 2 — Create a New Web Service on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:

| Setting | Value |
|---|---|
| **Name** | `formly-api` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT` |
| **Instance Type** | Free (or Starter) |

### Step 3 — Set Environment Variables on Render

| Variable | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000` |
| `PYTHON_VERSION` | `3.11.0` (optional, to pin Python version) |

> ⚠️ **Important:** Replace `https://your-app.vercel.app` with your actual Vercel deployment URL after deploying the frontend.

### Step 4 — Deploy

Click **"Create Web Service"**. Render will:
1. Clone the repo
2. `cd backend` (root directory)
3. Run the build command
4. Start Gunicorn + Uvicorn

### Step 5 — Note Your Backend URL

After deploy, Render gives you a URL like:  
`https://formly-api.onrender.com`

Verify it works:
```
curl https://formly-api.onrender.com/
# Should return: {"message":"Welcome to Typeform Clone API"}

curl https://formly-api.onrender.com/api/forms
# Should return seeded forms JSON
```

---

## 4. Deploy Frontend on Vercel

### Step 1 — Import Project on Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New…" → "Project"**
3. Import the same GitHub repo
4. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` (default) |

### Step 2 — Set Environment Variables on Vercel

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://formly-api.onrender.com` |

> ⚠️ **The `NEXT_PUBLIC_` prefix is required** — Next.js only exposes env vars starting with `NEXT_PUBLIC_` to the browser.

### Step 3 — Deploy

Click **"Deploy"**. Vercel will:
1. `cd frontend`
2. `npm install`
3. `npm run build`
4. Serve the Next.js app

### Step 4 — Update Backend CORS

Now that you have your Vercel URL (e.g. `https://formly-xyz.vercel.app`), go back to **Render → Environment** and update:

```
ALLOWED_ORIGINS=https://formly-xyz.vercel.app,http://localhost:3000
```

Redeploy the Render service (or it may pick up the change automatically).

---

## 5. Post-Deployment Verification

Run through this checklist after both services are live:

| # | Test | Expected Result |
|---|---|---|
| 1 | Visit Vercel URL | Dashboard loads, shows seeded forms |
| 2 | Create a new form | Form appears in dashboard |
| 3 | Open form builder | Questions can be added/edited |
| 4 | Publish a form | Status changes to "published" |
| 5 | Open public form link `/f/{slug}` | Conversational form-fill experience loads |
| 6 | Submit a response | Thank-you screen appears |
| 7 | Check results page | Submission shows in results |
| 8 | Open browser DevTools → Network | No CORS errors, all API calls return 200 |

---

## 6. Troubleshooting

### CORS Errors in Browser Console

```
Access to fetch at 'https://formly-api.onrender.com/api/forms' 
from origin 'https://formly-xyz.vercel.app' has been blocked by CORS policy
```

**Fix:** Ensure `ALLOWED_ORIGINS` on Render includes the exact Vercel URL (with `https://`, no trailing slash). Redeploy.

---

### Render Returns 502 / App Crashes

Check Render logs. Common causes:
- **Missing dependency**: Ensure `gunicorn` is in `requirements.txt`
- **Wrong start command**: Must be `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
- **Import error**: Ensure `Root Directory` is set to `backend` on Render

---

### SQLite "database is locked" on Render (Under Heavy Load)

SQLite is single-writer. For a demo/assignment this is fine. For production, switch to PostgreSQL:
1. Add a Render PostgreSQL database
2. Set `DATABASE_URL` env var to the PostgreSQL connection string
3. Replace `sqlalchemy` SQLite engine with the PostgreSQL URL
4. Add `psycopg2-binary` to `requirements.txt`

---

### Vercel Build Fails

Common causes:
- **Root directory not set**: Must be `frontend`
- **TypeScript errors**: Run `npm run build` locally first to catch them
- **Missing env var**: `NEXT_PUBLIC_API_URL` must be set before build (it's baked in at build time)

---

### Render Free Tier Spins Down After Inactivity

Free Render services sleep after 15 minutes of inactivity. First request after sleep takes ~30-60 seconds. Options:
- Use Render's **Starter** plan ($7/mo) for always-on
- Use an external cron/ping service (e.g., UptimeRobot) to keep it warm

---

### API Works on Render but Returns Empty Data

The database seeds on first startup when it detects an empty DB. If the seed didn't run:
1. Check Render logs for `"Database is empty. Running seed..."`
2. If needed, manually trigger a redeploy or restart the service

---

## Quick Reference — All Environment Variables

| Platform | Variable | Example Value |
|---|---|---|
| **Render** | `ALLOWED_ORIGINS` | `https://formly-xyz.vercel.app,http://localhost:3000` |
| **Render** | `PYTHON_VERSION` | `3.11.0` |
| **Vercel** | `NEXT_PUBLIC_API_URL` | `https://formly-api.onrender.com` |
