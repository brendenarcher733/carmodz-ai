# CarMods AI 🔧

> AI-powered car modification budgeting and build planner

A full-stack web application that helps car enthusiasts plan realistic modifications within their budget. Built with FastAPI, React, and SQLite. AI-ready architecture — runs on a smart mock service by default, plug in OpenAI or Anthropic with one env var change.

---

## Stack

| Layer     | Tech                                   |
|-----------|----------------------------------------|
| Frontend  | React 18 + Vite, Tailwind CSS           |
| Backend   | Python 3.11 + FastAPI                  |
| Database  | SQLite (dev) / PostgreSQL (prod-ready) |
| AI        | Mock service → OpenAI / Anthropic      |

---

## Project Structure

```
carmods-ai/
├── backend/
│   ├── core/          # Config, database setup
│   ├── models/        # SQLAlchemy ORM + Pydantic schemas
│   ├── routers/       # FastAPI route handlers
│   ├── services/      # Business logic + AI service
│   └── main.py        # App entry point
├── frontend/
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── pages/      # Route-level pages
│       ├── hooks/      # Custom React hooks
│       ├── services/   # API client
│       └── styles/     # Global design system
└── README.md
```

---

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # Edit if needed

uvicorn main:app --reload --port 8000
```

API docs → http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App → http://localhost:5173

---

## Environment Variables

### Backend (`backend/.env`)

| Variable          | Default        | Description                              |
|-------------------|----------------|------------------------------------------|
| `ENVIRONMENT`     | `development`  | `development` or `production`            |
| `DATABASE_URL`    | SQLite         | SQLite or PostgreSQL connection string   |
| `AI_PROVIDER`     | `mock`         | `mock`, `openai`, or `anthropic`         |
| `OPENAI_API_KEY`  | *(empty)*      | Set to enable real AI responses          |
| `OPENAI_MODEL`    | `gpt-4o`       | OpenAI model to use                      |

### Frontend (`frontend/.env`)

| Variable       | Default                  |
|----------------|--------------------------|
| `VITE_API_URL` | `http://localhost:8000`  |

---

## API Reference

| Method | Endpoint                    | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | `/health`                   | Health check                         |
| POST   | `/api/builds/`              | Create build + auto-generate mods    |
| GET    | `/api/builds/`              | List all builds                      |
| GET    | `/api/builds/{id}`          | Get single build                     |
| GET    | `/api/builds/{id}/plan`     | Full mod plan with budget breakdown  |
| DELETE | `/api/builds/{id}`          | Delete build                         |
| POST   | `/api/mod-advisor/chat`     | Chat with the Mod Advisor            |
| POST   | `/api/mod-advisor/quick-recs` | Quick recommendations (no save)    |

---

## Enabling Real AI (OpenAI)

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. In `backend/.env`:
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-your-key-here
   ```
3. In `backend/services/mock_ai.py`, replace `generate_chat_response()` with an OpenAI call:
   ```python
   from openai import OpenAI
   client = OpenAI(api_key=settings.openai_api_key)

   def generate_chat_response(message, build_context=None):
       response = client.chat.completions.create(
           model=settings.openai_model,
           messages=[
               {"role": "system", "content": "You are an expert car modification advisor..."},
               {"role": "user", "content": message}
           ]
       )
       return response.choices[0].message.content
   ```

---

## Deployment

### Backend (Railway / Render / Fly.io)

```bash
# Set environment variables in your platform's dashboard
# DATABASE_URL=postgresql://...
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# ENVIRONMENT=production

uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (Vercel / Netlify)

```bash
cd frontend
npm run build
# Deploy the dist/ folder
# Set VITE_API_URL to your backend URL
```

---

## Features

- **Build Planner** — 4-step form: vehicle → budget → goals → preferences
- **AI Mod Advisor** — chatbot with car mod domain knowledge, quick starters, suggestion chips
- **Budget Breakdown** — price ranges, stage roadmap, warnings, priority ranking
- **Saved Builds** — full SQLite persistence with create / list / view / delete
- **Staged Roadmap** — Stage 1 / 2 / 3 upgrade paths per build
- **Mod Knowledge Base** — 25+ mods across performance, handling, sound, cosmetic, reliability, interior

---

## Design System

- Premium automotive theme — refined dark UI (obsidian/charcoal/surface scale) inspired by Apple, Rivian, Porsche, Tesla, and Linear
- Orange (`#FF8C00`) is a restrained signature accent — reserved for primary actions, selected/active states, progress indicators, AI-status signals, and key highlight numbers, not decoration
- Space Grotesk display font, Inter UI font, JetBrains Mono for numeric/technical data
- Tailwind CSS utility classes + a small set of shared component classes in `globals.css` (`.eyebrow`, `.field-input`, `.glass`, etc.)
- Fully responsive — mobile and desktop layouts

---

Built as a portfolio-quality full-stack project demonstrating FastAPI, React, SQLite, AI integration patterns, and production-ready architecture.
