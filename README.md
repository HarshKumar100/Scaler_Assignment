# Typeform Builder — SDE Fullstack Assignment

A full-stack clone of **Typeform** built with **Next.js**, **FastAPI**, and **SQLite**. The project recreates the core Typeform experience by allowing users to create forms, publish them through a shareable link, collect responses using a conversational one-question-at-a-time interface, and view response analytics in a clean dashboard.

---

## Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion

### Backend
- FastAPI
- SQLAlchemy ORM
- Pydantic

### Database
- SQLite

---

## Architecture Overview

The application follows a simple client-server architecture.

- The **Next.js frontend** handles the dashboard, form builder, public form experience, and response views.
- The **FastAPI backend** exposes REST APIs for managing forms, questions, responses, publishing, and analytics.
- **SQLAlchemy ORM** manages all database interactions.
- All data is stored in a SQLite database, which is automatically initialized and seeded during the first application startup.

---

## Running the Project

### Backend

```bash
cd backend

python -m venv .venv

# Windows
.\.venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

The frontend will be available at:

```
http://localhost:3000
```

The FastAPI documentation is available at:

```
http://localhost:8000/docs
```

---

## Features

### Form Builder

- Create, edit, duplicate, and delete forms
- Drag-and-drop question reordering
- Live preview while editing
- Required field toggle
- Question descriptions
- Eight supported question types:
  - Short Text
  - Long Text
  - Multiple Choice
  - Dropdown
  - Email
  - Number
  - Yes / No
  - Rating

### Form Management

- Dashboard with Draft and Published forms
- Response count per form
- Publish / Unpublish forms
- Shareable public links
- Duplicate forms
- Delete forms

### Public Form Experience

- One-question-at-a-time conversational flow
- Smooth page transitions using Framer Motion
- Keyboard navigation
- Progress indicator
- Client-side and server-side validation
- Thank-you screen after submission

### Responses & Analytics

- View all responses for a form
- Individual response viewer
- Question-wise summary statistics
- Rating averages
- Choice distribution
- Export responses as CSV

---

## Database Schema

The database is designed around four primary entities.

```
Form
 ├── Question
 └── Response
      └── Answer
```

- A **Form** contains multiple questions.
- Each **Question** belongs to one form.
- Every submission creates a **Response**.
- Each response stores individual answers linked to their respective questions.

The schema uses foreign keys with cascading deletes, unique constraints for question ordering, and indexed form slugs for efficient public form access.

---

## API Overview

### Forms

- GET `/api/forms`
- POST `/api/forms`
- GET `/api/forms/{id}`
- PATCH `/api/forms/{id}`
- DELETE `/api/forms/{id}`

### Questions

- POST `/api/forms/{id}/questions`
- PATCH `/api/forms/{id}/questions/{questionId}`
- DELETE `/api/forms/{id}/questions/{questionId}`
- PUT `/questions/reorder`

### Public Forms

- GET `/api/public/forms/{slug}`
- POST `/api/public/forms/{slug}/responses`

### Responses

- GET `/api/forms/{id}/responses`
- GET `/api/forms/{id}/stats`

---

## Seeded Data

The application automatically seeds the database on first startup.

Included sample forms:

- **Customer Satisfaction Survey** (Published)
- **Event Registration** (Published)
- **Product Feedback** (Draft)

The published forms include sample responses so the dashboard and analytics can be explored immediately. All sample names, email addresses, and responses are fictional and intended only for demonstration.

---

## Assumptions

To keep the project focused on the assignment requirements, a few simplifications were made.

- A single creator is assumed to be logged in, so authentication is not implemented.
- Anyone with a published form link can submit responses without signing in.
- Forms, questions, and responses are stored in SQLite.
- The database schema and seed data are created automatically on first startup.
- Question order is maintained using a position field and supports drag-and-drop reordering.

---

## Placeholder Features

The following optional features are intentionally left as placeholders:

- Logic Jumps / Conditional Branching
- Team Collaboration
- Integrations & Webhooks
- Payment Question Type
- File Upload Question Type
- Custom Themes

---

## Project Goal

The primary goal of this project was to recreate the overall Typeform experience rather than build a generic form application. Special attention was given to the form builder, the conversational one-question-at-a-time respondent flow, smooth animations, responsive design, and a clean user interface while keeping the code modular and easy to extend.
