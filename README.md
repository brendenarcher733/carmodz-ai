# CarMods AI 🔧

> AI-powered car modification budgeting and build planner

A full-stack web application that helps car enthusiasts plan realistic modifications within their budget. Built with FastAPI, React, and SQLite. AI-ready architecture — runs on a smart mock service by default, plug in OpenAI or Anthropic with one env var change.

---

## Stack

| Layer     | Tech                                                    |
|-----------|-----------------------------------------------------------|
| Frontend  | React 18 + Vite, Tailwind CSS                              |
| Backend   | Python 3.12 + FastAPI                                      |
| Database  | SQLite (dev default) / PostgreSQL (prod), via Alembic migrations |
| Jobs      | Redis + arq — async worker generates AI recommendations out-of-band |
| AI        | Mock service → OpenAI / Anthropic                          |

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

### Option A — Docker Compose (recommended)

Spins up Postgres, Redis, the API, and the recommendation worker together — the same topology production runs.

```bash
docker compose up --build
```

API → http://localhost:8001 (docs at `/docs` outside production). Mapped to 8001 on the host so it doesn't clash with anything else you may already have on 8000 — the container itself still listens on 8000, which is all that matters once deployed.

Then, in a second terminal, run the frontend directly (fast HMR beats a container here):

```bash
cd frontend
npm install
npm run dev
```

App → http://localhost:5173

### Option B — Run natively

```bash
# Redis is required even for local dev (job queue + rate limiting)
redis-server --daemonize yes

cd backend
python3.12 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # defaults to SQLite — no Postgres needed locally
alembic upgrade head            # create tables

uvicorn main:app --reload --port 8000                        # terminal 1
arq workers.recommendation_worker.WorkerSettings              # terminal 2
```

```bash
cd frontend
npm install
npm run dev
```

App → http://localhost:5173 · API docs → http://localhost:8000/docs

---

## Environment Variables

### Backend (`backend/.env`)

| Variable            | Default                            | Description                                                        |
|---------------------|-------------------------------------|----------------------------------------------------------------------|
| `ENVIRONMENT`        | `development`                       | `development` or `production` — refuses to boot in production with a default `SECRET_KEY` |
| `SECRET_KEY`          | insecure dev default                | Signs access tokens. **Must** be set to a strong random value in production (`python -c "import secrets; print(secrets.token_hex(32))"`) |
| `DATABASE_URL`        | SQLite (`sqlite:///./carmods.db`)   | SQLite (dev) or PostgreSQL connection string (prod). `postgres://` URLs are auto-normalized to `postgresql://` |
| `REDIS_URL`           | `redis://localhost:6379`            | Backs the job queue and the rate limiter. Use `rediss://` for TLS (required by most managed Redis add-ons) |
| `AI_PROVIDER`         | `mock`                              | `mock`, `openai`, or `anthropic`                                     |
| `ANTHROPIC_API_KEY`   | *(empty)*                           | Set to enable real Claude responses                                  |
| `OPENAI_API_KEY`      | *(empty)*                           | Set to enable real OpenAI responses                                  |
| `OPENAI_MODEL`        | `gpt-4o`                            | OpenAI model to use                                                   |
| `ALLOWED_ORIGINS`     | `localhost:5173`/`4173`             | JSON array of origins allowed to call the API with credentials       |

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

The backend ships as a single Docker image (`backend/Dockerfile`) that runs as two services from one repo — see `backend/Procfile`:

- **`web`** — runs pending Alembic migrations, then `uvicorn`
- **`worker`** — `arq workers.recommendation_worker.WorkerSettings`, the async recommendation-generation job runner

### Backend + worker + Postgres + Redis → Railway

1. Push this repo to GitHub (already done if you're reading this from there).
2. In Railway: **New Project → Deploy from GitHub repo**, select this repo, root directory `backend/`.
3. Railway detects the Dockerfile. Add a **second service** from the same repo/root for the `worker` process — set its **Custom Start Command** to `arq workers.recommendation_worker.WorkerSettings` (this overrides the Dockerfile's default `web` command, which already includes the migration step for that service).
4. **Add Postgres and Redis** from Railway's plugin marketplace — it injects `DATABASE_URL` and a Redis connection URL automatically. Map Redis's URL to the `REDIS_URL` env var this app expects (Railway's managed Redis uses `rediss://`, which is fully supported).
5. Set on **both** services: `ENVIRONMENT=production`, `SECRET_KEY` (a real random value — see the env var table above, never the dev default), `AI_PROVIDER=anthropic` (or `openai`), `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS=["https://your-frontend.vercel.app"]`.
6. Deploy. `/health` on the web service's public URL should return `{"status":"healthy",...}`.

### Frontend → Vercel

1. **New Project → Import** this repo, root directory `frontend/`. Vercel auto-detects Vite.
2. Set env var `VITE_API_URL` to the Railway web service's public URL.
3. Deploy. Once it's live, go back and set Railway's `ALLOWED_ORIGINS` to this Vercel URL (step 5 above) so CORS allows it.

### Local parity check before deploying

`docker compose up --build` runs the exact same image/Procfile-equivalent topology (Postgres + Redis + web + worker) locally — if it works there, the only genuinely new variables in production are the platform-managed `DATABASE_URL`/`REDIS_URL` and a real `SECRET_KEY`.

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
