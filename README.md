# GeneWeaver – CRISPR Alignment Engine (local)

FastAPI + SQLAlchemy/SQLite + Biopython + NumPy (optional Numba CUDA) backend, React + Vite + Recharts frontend.

## Run (2 terminals)
**Backend** (Python 3.10+):
```
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://127.0.0.1:8000/docs

**Frontend** (Node 18+):
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 → Register → New Analysis.

**Tests:** `cd backend && python -m pytest -q`

**GPU (optional):** NVIDIA GPU + driver + CUDA, then `pip install -r requirements-gpu.txt`. The Benchmark page shows real GPU status. No GPU = CPU only, nothing faked.

## Layout
- `backend/app/core.py` FASTA, validation, reverse complement, PAM scan, alignment
- `backend/app/compute.py` CPU/GPU candidate scoring, hardware info, benchmark
- `backend/app/main.py` routes, auth (PBKDF2 + JWT), background jobs, CSV/JSON/PDF export
- `backend/app/db.py` models: users, analyses, candidates, benchmarks
- `frontend/src/pages/*` Landing, Auth, Dashboard, New Analysis, Alignment, Benchmark, History, Analysis detail, Docs

## Limits (honest)
- GPU code is untested on real GPU hardware (none in build sandbox). CPU path is tested.
- GPU only accelerates candidate scoring (GC + mismatches), not full DP alignment.
- No off-target search, no efficacy prediction. Educational use.
- Not included: Playwright/Vitest tests, TypeScript, Alembic migrations, password reset, settings page, separate scanner/reports pages, 16-file docs set, project report, slides.
- Set `GENEWEAVER_SECRET` env var for stable login tokens; else `.secret` file is made on first run.
