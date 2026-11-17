"""GeneWeaver API. Routes only. Science is in core.py / compute.py."""
import csv, hashlib, hmac, io, logging, os, re, secrets, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional

import jwt
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import String, cast, delete, func, insert, or_, select

from . import compute, core
from .db import Analysis, Benchmark, Candidate, SessionLocal, User, init_db

log = logging.getLogger("geneweaver")
MAX_SEQ = 2_000_000
GPU_AUTO_MIN = 5_000  # auto mode uses GPU only above this many candidates
init_db()
app = FastAPI(title="GeneWeaver API", version="1.0")


def _secret():
    s = os.getenv("GENEWEAVER_SECRET")
    if s:
        return s
    p = Path(__file__).resolve().parent.parent / ".secret"
    if not p.exists():
        p.write_text(secrets.token_hex(32))
    return p.read_text().strip()


SECRET = _secret()


def hash_pw(pw):
    salt = os.urandom(16)
    return salt.hex() + "$" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000).hex()


def check_pw(pw, stored):
    salt, digest = stored.split("$")
    return hmac.compare_digest(hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex(), digest)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_user(authorization: Optional[str] = Header(None), db=Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not logged in")
    try:
        uid = int(jwt.decode(authorization[7:], SECRET, algorithms=["HS256"])["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(401, "Session invalid or expired")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(401, "User not found")
    return user


def iso(d):
    return d.isoformat() + ("Z" if d.tzinfo is None else "") if d else None


def ms(t):
    return round((time.perf_counter() - t) * 1e3, 3)


# ---------- schemas ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=200)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str
    password: str


class AlignParams(BaseModel):
    align_mode: Literal["local", "global"] = "local"
    match: float = Field(2.0, ge=0, le=100)
    mismatch: float = Field(1.0, ge=0, le=100)
    gap_open: float = Field(2.0, ge=0, le=100)
    gap_extend: float = Field(0.5, ge=0, le=100)


class AnalysisIn(AlignParams):
    name: str = Field(min_length=1, max_length=120)
    reference: str = Field(max_length=MAX_SEQ + 10_000)
    query: Optional[str] = Field(None, max_length=MAX_SEQ)
    guide_len: int = Field(20, ge=10, le=30)
    pam: str = Field("NGG", min_length=1, max_length=8)
    strands: Literal["both", "forward", "reverse"] = "both"
    compare_guide: Optional[str] = None
    execution_mode: Literal["cpu", "auto", "gpu"] = "auto"


class AlignIn(AlignParams):
    reference: str = Field(max_length=100_000)
    query: str = Field(max_length=100_000)


class BenchIn(BaseModel):
    sizes: list[int] = Field(min_length=1, max_length=6)
    repeats: int = Field(5, ge=1, le=50)


def bad(msg):
    return HTTPException(422, msg)


# ---------- auth ----------
def token_for(u):
    return jwt.encode({"sub": str(u.id), "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET, algorithm="HS256")


def user_out(u):
    return {"id": u.id, "name": u.name, "email": u.email}


@app.post("/api/auth/register", status_code=201)
def register(b: RegisterIn, db=Depends(get_db)):
    email = b.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise bad("Invalid email address")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    u = User(name=b.name.strip(), email=email, password_hash=hash_pw(b.password))
    db.add(u); db.commit()
    return {"token": token_for(u), "user": user_out(u)}


@app.post("/api/auth/login")
def login(b: LoginIn, db=Depends(get_db)):
    u = db.scalar(select(User).where(User.email == b.email.strip().lower()))
    if not u or not check_pw(b.password, u.password_hash):
        raise HTTPException(401, "Wrong email or password")
    return {"token": token_for(u), "user": user_out(u)}


@app.get("/api/auth/me")
def me(u=Depends(current_user)):
    return user_out(u)


@app.get("/api/hardware")
def hw(u=Depends(current_user)):
    return {"hardware": compute.hardware(), "software": compute.software()}


# ---------- analyses ----------
def ser(a, detail=False):
    d = {"id": a.id, "name": a.name, "type": a.analysis_type, "execution_mode": a.execution_mode,
         "mode_used": a.mode_used, "status": a.status, "seq_id": a.seq_id, "seq_length": a.seq_length,
         "n_candidates": a.n_candidates, "runtime_ms": a.runtime_ms,
         "created_at": iso(a.created_at), "completed_at": iso(a.completed_at)}
    if detail:
        d.update(params=a.params, result=a.result, error=a.error, seq_hash=a.seq_hash,
                 query_length=len(a.query) if a.query else None)
    return d


def owned(db, aid, u):
    a = db.get(Analysis, aid)
    if not a or a.user_id != u.id:  # same answer for missing and foreign: no data leak
        raise HTTPException(404, "Analysis not found")
    return a


def run_analysis(aid: int):
    """Background job. Stores result or the real error message."""
    db = SessionLocal()
    try:
        a = db.get(Analysis, aid)
        a.status = "running"; db.commit()
        p, timing, t_all = a.params, {}, time.perf_counter()
        t = time.perf_counter()
        cands = core.scan(a.reference, p["guide_len"], p["pam"], p["strands"])
        timing["scan_ms"] = ms(t)
        mode_used, hist = "cpu", [0] * (p["guide_len"] + 1)
        if cands:
            import numpy as np
            arr = compute.encode([c["guide"] for c in cands])
            cg = p.get("compare_guide")
            ref = compute.encode([cg])[0] if cg else arr[0]
            gpu_ok = compute.gpu_status()["available"]
            use_gpu = a.execution_mode == "gpu" or (a.execution_mode == "auto" and gpu_ok and len(cands) >= GPU_AUTO_MIN)
            t = time.perf_counter()
            if use_gpu:
                gc, mm, timing["gpu"] = compute.gpu_score(arr, ref)
                mode_used = "gpu"
            else:
                gc, mm = compute.cpu_score(arr, ref)
            timing["score_ms"] = ms(t)
            rows = []
            for c, g, m in zip(cands, gc.tolist(), mm.tolist()):
                hist[g] += 1
                rows.append({"analysis_id": a.id, "guide": c["guide"], "pam": c["pam"], "strand": c["strand"],
                             "start_pos": c["start"], "end_pos": c["end"], "gc": g / p["guide_len"],
                             "mismatches": m if cg else None})
            for i in range(0, len(rows), 5000):
                db.execute(insert(Candidate), rows[i:i + 5000])
        aln = None
        if a.query:
            t = time.perf_counter()
            aln = core.align(a.reference, a.query, p["align_mode"], p["match"], p["mismatch"], p["gap_open"], p["gap_extend"])
            timing["align_ms"] = ms(t)
        timing["total_ms"] = ms(t_all)
        a.result = {"alignment": aln, "timing": timing, "gc_hist": hist,
                    "strand_counts": {"+": sum(c["strand"] == "+" for c in cands), "-": sum(c["strand"] == "-" for c in cands)},
                    "hardware": compute.hardware(), "software": compute.software(),
                    "started_utc": iso(a.created_at)}
        a.mode_used, a.n_candidates, a.runtime_ms = mode_used, len(cands), timing["total_ms"]
        a.status, a.completed_at = "completed", datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        log.exception("analysis %s failed", aid)
        db.rollback()
        a = db.get(Analysis, aid)
        a.status, a.error, a.completed_at = "failed", f"{type(e).__name__}: {e}", datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()


@app.post("/api/analyses", status_code=202)
def create_analysis(b: AnalysisIn, bg: BackgroundTasks, u=Depends(current_user), db=Depends(get_db)):
    try:
        recs = core.parse_input(b.reference)
        qrecs = core.parse_input(b.query) if b.query and b.query.strip() else None
        core.scan("A" * 5, b.guide_len, b.pam)  # validates PAM symbols
        cg = None
        if b.compare_guide and b.compare_guide.strip():
            cg = core.clean_sequence(b.compare_guide, "compare guide")
            if len(cg) != b.guide_len or "N" in cg:
                raise ValueError(f"Compare guide must be {b.guide_len} bases of A/C/G/T")
        if qrecs and (len(recs[0][1]) > core.MAX_ALIGN_LEN or len(qrecs[0][1]) > core.MAX_ALIGN_LEN):
            raise ValueError(f"Alignment needs both sequences <= {core.MAX_ALIGN_LEN} bases")
    except ValueError as e:
        raise bad(str(e))
    seq_id, seq = recs[0]
    if len(seq) > MAX_SEQ:
        raise bad(f"Sequence too long (max {MAX_SEQ} bases)")
    if len(seq) < b.guide_len + len(b.pam):
        raise bad("Sequence shorter than guide + PAM")
    if b.execution_mode == "gpu" and not compute.gpu_status()["available"]:
        raise bad("GPU not available: " + compute.gpu_status()["reason"])
    params = b.model_dump(exclude={"reference", "query", "name", "execution_mode"})
    params["compare_guide"] = cg
    params["records_in_input"] = len(recs)
    a = Analysis(user_id=u.id, name=b.name.strip(), analysis_type="crispr+alignment" if qrecs else "crispr",
                 execution_mode=b.execution_mode, params=params, reference=seq,
                 query=qrecs[0][1] if qrecs else None, seq_id=seq_id, seq_length=len(seq),
                 seq_hash=hashlib.sha256(seq.encode()).hexdigest())
    db.add(a); db.commit()
    bg.add_task(run_analysis, a.id)
    return ser(a)


@app.get("/api/analyses")
def list_analyses(search: str = "", status: str = "", mode: str = "", order: Literal["asc", "desc"] = "desc",
                  date_from: str = "", date_to: str = "", page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=100),
                  u=Depends(current_user), db=Depends(get_db)):
    q = select(Analysis).where(Analysis.user_id == u.id)
    if search:
        q = q.where(or_(Analysis.name.ilike(f"%{search}%"), cast(Analysis.id, String) == search.lstrip("#")))
    if status:
        q = q.where(Analysis.status == status)
    if mode:
        q = q.where(Analysis.mode_used == mode)
    try:
        if date_from:
            q = q.where(Analysis.created_at >= datetime.fromisoformat(date_from))
        if date_to:
            q = q.where(Analysis.created_at < datetime.fromisoformat(date_to) + timedelta(days=1))
    except ValueError:
        raise bad("Dates must be YYYY-MM-DD")
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    q = q.order_by(Analysis.created_at.asc() if order == "asc" else Analysis.created_at.desc())
    items = db.scalars(q.offset((page - 1) * size).limit(size)).all()
    return {"items": [ser(a) for a in items], "total": total, "page": page, "size": size}


@app.get("/api/stats")
def stats(u=Depends(current_user), db=Depends(get_db)):
    A = Analysis
    week = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
    return {"total_analyses": db.scalar(select(func.count()).where(A.user_id == u.id)),
            "total_bases": db.scalar(select(func.coalesce(func.sum(A.seq_length), 0)).where(A.user_id == u.id)),
            "total_candidates": db.scalar(select(func.coalesce(func.sum(A.n_candidates), 0)).where(A.user_id == u.id)),
            "recent_7d": db.scalar(select(func.count()).where(A.user_id == u.id, A.created_at >= week))}


@app.get("/api/analyses/{aid}")
def get_analysis(aid: int, u=Depends(current_user), db=Depends(get_db)):
    return ser(owned(db, aid, u), detail=True)


@app.delete("/api/analyses/{aid}", status_code=204)
def delete_analysis(aid: int, u=Depends(current_user), db=Depends(get_db)):
    a = owned(db, aid, u)
    db.execute(delete(Candidate).where(Candidate.analysis_id == a.id))
    db.delete(a); db.commit()


def cand_dict(c):
    return {"id": c.id, "guide": c.guide, "pam": c.pam, "strand": c.strand, "start": c.start_pos,
            "end": c.end_pos, "length": c.end_pos - c.start_pos + 1, "gc": round(c.gc, 4), "mismatches": c.mismatches}


@app.get("/api/analyses/{aid}/candidates")
def candidates(aid: int, page: int = Query(1, ge=1), size: int = Query(25, ge=1, le=200), strand: str = "",
               sort: Literal["start", "gc", "guide"] = "start", order: Literal["asc", "desc"] = "asc",
               min_gc: float = 0, max_gc: float = 1, u=Depends(current_user), db=Depends(get_db)):
    a = owned(db, aid, u)
    q = select(Candidate).where(Candidate.analysis_id == a.id, Candidate.gc >= min_gc - 1e-9, Candidate.gc <= max_gc + 1e-9)
    if strand in ("+", "-"):
        q = q.where(Candidate.strand == strand)
    col = {"start": Candidate.start_pos, "gc": Candidate.gc, "guide": Candidate.guide}[sort]
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(col.asc() if order == "asc" else col.desc(), Candidate.id).offset((page - 1) * size).limit(size)).all()
    return {"items": [cand_dict(c) for c in rows], "total": total, "page": page, "size": size}


def all_cands(db, a):
    return db.scalars(select(Candidate).where(Candidate.analysis_id == a.id).order_by(Candidate.start_pos, Candidate.id)).all()


@app.get("/api/analyses/{aid}/export.csv")
def export_csv(aid: int, u=Depends(current_user), db=Depends(get_db)):
    a = owned(db, aid, u)
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["candidate_id", "guide", "pam", "strand", "start", "end", "length", "gc_content", "mismatches_vs_compare_guide"])
    for c in all_cands(db, a):
        d = cand_dict(c)
        w.writerow([d["id"], d["guide"], d["pam"], d["strand"], d["start"], d["end"], d["length"], d["gc"], d["mismatches"] if d["mismatches"] is not None else ""])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="analysis_{a.id}.csv"'})


@app.get("/api/analyses/{aid}/export.json")
def export_json(aid: int, u=Depends(current_user), db=Depends(get_db)):
    a = owned(db, aid, u)
    import json
    body = json.dumps({"analysis": ser(a, True), "candidates": [cand_dict(c) for c in all_cands(db, a)]}, indent=1)
    return Response(body, media_type="application/json", headers={"Content-Disposition": f'attachment; filename="analysis_{a.id}.json"'})


@app.get("/api/analyses/{aid}/report.pdf")
def export_pdf(aid: int, u=Depends(current_user), db=Depends(get_db)):
    a = owned(db, aid, u)
    if a.status != "completed":
        raise HTTPException(409, "Analysis not completed")
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=A4); W, H = A4; y = [H - 50]

    def line(t, size=10, font="Helvetica"):
        if y[0] < 60:
            c.showPage(); y[0] = H - 50
        c.setFont(font, size); c.drawString(50, y[0], str(t)[:105]); y[0] -= size + 5
    r = a.result
    line("GeneWeaver - Analysis Report", 16, "Helvetica-Bold"); line("")
    for t in (f"Analysis ID: {a.id}", f"Name: {a.name}", f"User: {u.name}", f"Created: {iso(a.created_at)}",
              f"Sequence: {a.seq_id} ({a.seq_length} bp), sha256 {a.seq_hash[:16]}...",
              f"Execution mode: requested {a.execution_mode}, used {a.mode_used}",
              f"Parameters: {a.params}", f"Runtime: {r['timing']}", f"Software: {r['software']}"):
        line(t)
    line(""); line("Results", 12, "Helvetica-Bold")
    line(f"Candidates: {a.n_candidates} (strands {r['strand_counts']})")
    if r.get("alignment"):
        al = r["alignment"]
        line(f"Alignment ({al['mode']}): score {al['score']}, identity {al['identity']}%, matches {al['matches']}, mismatches {al['mismatches']}, gaps {al['gaps']}")
    line(""); line("First 30 candidates (guide PAM strand start-end GC)", 10, "Helvetica-Bold")
    for cd in all_cands(db, a)[:30]:
        line(f"{cd.guide} {cd.pam} {cd.strand} {cd.start_pos}-{cd.end_pos} GC={cd.gc:.2f}", 9, "Courier")
    line(""); line("Methodology", 12, "Helvetica-Bold")
    for t in ("Guide+PAM sites found by regular-expression scan on both strands; reverse hits mapped to forward coordinates.",
              "Alignment: Biopython PairwiseAligner with the scoring shown above.",
              "Limitations: computational candidates only. No claim of guide efficacy, specificity, or safety.",
              "No off-target search. Educational / research use only."):
        line(t, 9)
    c.save()
    return Response(buf.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="report_{a.id}.pdf"'})


# ---------- direct alignment + benchmark ----------
@app.post("/api/align")
def align_endpoint(b: AlignIn, u=Depends(current_user)):
    try:
        r = core.parse_input(b.reference)[0][1]
        q = core.parse_input(b.query)[0][1]
        return core.align(r, q, b.align_mode, b.match, b.mismatch, b.gap_open, b.gap_extend)
    except ValueError as e:
        raise bad(str(e))


@app.post("/api/benchmark")
def run_benchmark(b: BenchIn, u=Depends(current_user), db=Depends(get_db)):
    if any(n < 10 or n > 2_000_000 for n in b.sizes):
        raise bad("Each size must be between 10 and 2,000,000")
    data = compute.benchmark(b.sizes, b.repeats)
    db.add(Benchmark(user_id=u.id, data=data)); db.commit()
    return data


@app.get("/api/benchmarks/latest")
def latest_benchmark(u=Depends(current_user), db=Depends(get_db)):
    b = db.scalar(select(Benchmark).where(Benchmark.user_id == u.id).order_by(Benchmark.id.desc()))
    return b.data if b else None
