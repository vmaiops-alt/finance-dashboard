from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Support Vercel serverless environment via FINANCE_DB_PATH env var
# Falls back to local file in development
if "FINANCE_DB_PATH" in os.environ:
    DB_PATH = os.environ["FINANCE_DB_PATH"]
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "finance.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
