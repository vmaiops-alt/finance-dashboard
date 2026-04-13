from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Use DATABASE_URL env var (PostgreSQL on Supabase) or fall back to SQLite for local dev
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Supabase/PostgreSQL
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=300,
        pool_pre_ping=True,
    )
else:
    # Local SQLite fallback
    DB_PATH = os.environ.get("FINANCE_DB_PATH",
                             os.path.join(os.path.dirname(__file__), "finance.db"))
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
