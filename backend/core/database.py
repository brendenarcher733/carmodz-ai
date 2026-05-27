# core/database.py
# SQLite database setup via SQLAlchemy.
# Switch to PostgreSQL by changing DATABASE_URL in .env

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings

# SQLite needs check_same_thread=False for FastAPI's threading model
connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=settings.environment == "development",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables on startup."""
    # Import models so SQLAlchemy sees them before creating tables
    from models import build, recommendation  # noqa: F401
    Base.metadata.create_all(bind=engine)
