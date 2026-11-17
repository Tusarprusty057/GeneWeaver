"""SQLAlchemy models. SQLite by default (file geneweaver.db)."""
import os
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import JSON, DateTime, ForeignKey, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DB_URL = os.getenv("GENEWEAVER_DB", "sqlite:///./geneweaver.db")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str]
    analysis_type: Mapped[str]            # crispr | crispr+alignment
    execution_mode: Mapped[str]           # requested: cpu | auto | gpu
    mode_used: Mapped[Optional[str]]      # actually used
    status: Mapped[str] = mapped_column(default="pending", index=True)
    params: Mapped[dict] = mapped_column(JSON)
    reference: Mapped[str] = mapped_column(Text)
    query: Mapped[Optional[str]] = mapped_column(Text)
    seq_id: Mapped[str]
    seq_length: Mapped[int]
    seq_hash: Mapped[str]
    n_candidates: Mapped[int] = mapped_column(default=0)
    runtime_ms: Mapped[Optional[float]]
    result: Mapped[Optional[dict]] = mapped_column(JSON)
    error: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class Candidate(Base):
    __tablename__ = "candidates"
    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id"), index=True)
    guide: Mapped[str]
    pam: Mapped[str]
    strand: Mapped[str]
    start_pos: Mapped[int]
    end_pos: Mapped[int]
    gc: Mapped[float]
    mismatches: Mapped[Optional[int]]


class Benchmark(Base):
    __tablename__ = "benchmarks"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    data: Mapped[dict] = mapped_column(JSON)


def init_db():
    Base.metadata.create_all(engine)
