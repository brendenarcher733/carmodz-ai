FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2-binary's runtime libpq requirement
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway/Render inject PORT; default to 8000 for `docker run` without one.
ENV PORT=8000
EXPOSE 8000

# Same image runs both the web and worker processes — see Procfile, which
# Railway uses to run each as its own service from this one image. This
# default CMD is the web process (migrate, then serve) for plain
# `docker run`/docker-compose use; Railway overrides the start command per
# service using the Procfile's "worker" line for the arq worker instead.
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
