# Typeform Builder-SDE Fullstack Assignment


A full-stack Typeform clone with a focused creator workspace and conversational, public form-filling experience.

## Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion
- Backend: FastAPI, SQLAlchemy ORM, SQLite
- Persistence: SQLite database at `backend/typeform.db`, seeded automatically on startup

## Run locally

Open two terminals from the repository root.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`. The API interactive documentation is at `http://localhost:8000/docs`.

## Features

- Dashboard with create, delete, duplicate API support, publishing status, response totals, and seeded forms
- Builder supports adding, editing, deleting, choosing all requested question types, required settings, options, and a publish/share link
- Public `/f/[slug]` flow provides animated one-question-at-a-time interaction, keyboard navigation, progress, validation, and thank-you screen
- Results page lists submissions and question-level choice counts / rating averages
- Seed forms: `community-welcome` and `product-pulse`

## Schema

`forms` owns ordered `questions` and submitted `responses`. `answers` joins each response to a question and stores its normalized individual answer. Foreign keys use cascading deletes. `forms.slug` is unique and indexed for public lookups; question positions are unique per form; answers are unique per response/question.

```text
Form 1 --< Question
Form 1 --< Response 1 --< Answer >-- 1 Question
```

## API overview

- `GET/POST /api/forms`, `GET/PATCH/DELETE /api/forms/{id}`
- `POST /api/forms/{id}/duplicate`, `POST /api/forms/{id}/publish`
- `POST /api/forms/{id}/questions`, `PATCH/DELETE /api/forms/{id}/questions/{questionId}`, `PUT /questions/reorder`
- `GET /api/public/forms/{slug}`, `POST /api/public/forms/{slug}/responses`
- `GET /api/forms/{id}/responses`, `GET /api/forms/{id}/stats`

## Assumptions and simplifications

There is one implicit creator (no authentication). The builder uses selected-question ordering controls in the API but its compact UI prioritizes rapid question editing over a full drag handle implementation. Theme, logic jumps, integrations, team sharing, payments and file uploads are intentionally out of scope placeholders per the brief. Alembic is listed as the migration tool dependency; `Base.metadata.create_all` makes first-run development frictionless.
