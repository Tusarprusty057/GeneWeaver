from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
G = "ACGTACGTACGTACGTACGT"
SEQ = "TT" + G + "TGG" + "CCA" + "GATTACAGATTACAGATTAC" + "AA"


def reg(email):
    r = c.post("/api/auth/register", json={"name": "T", "email": email, "password": "password123"})
    assert r.status_code == 201
    return {"Authorization": "Bearer " + r.json()["token"]}


def test_auth_rules():
    reg("a@x.com")
    assert c.post("/api/auth/register", json={"name": "T", "email": "a@x.com", "password": "password123"}).status_code == 409
    assert c.post("/api/auth/login", json={"email": "a@x.com", "password": "nope"}).status_code == 401
    assert c.post("/api/auth/login", json={"email": "a@x.com", "password": "password123"}).status_code == 200
    assert c.get("/api/analyses").status_code == 401
    assert c.post("/api/auth/register", json={"name": "T", "email": "b@x.com", "password": "short"}).status_code == 422


def test_full_flow_and_isolation():
    h1, h2 = reg("u1@x.com"), reg("u2@x.com")
    r = c.post("/api/analyses", headers=h1, json={"name": "run1", "reference": ">s1\n" + SEQ, "query": SEQ[:30],
                                                    "execution_mode": "cpu", "compare_guide": G})
    assert r.status_code == 202
    aid = r.json()["id"]
    a = c.get(f"/api/analyses/{aid}", headers=h1).json()   # background task already done in TestClient
    assert a["status"] == "completed" and a["mode_used"] == "cpu" and a["n_candidates"] >= 2
    assert a["result"]["alignment"]["identity"] == 100
    cand = c.get(f"/api/analyses/{aid}/candidates?strand=%2B", headers=h1).json()
    assert cand["items"][0]["guide"] == G and cand["items"][0]["mismatches"] == 0
    assert "guide" in c.get(f"/api/analyses/{aid}/export.csv", headers=h1).text
    assert c.get(f"/api/analyses/{aid}/export.json", headers=h1).status_code == 200
    assert c.get(f"/api/analyses/{aid}/report.pdf", headers=h1).content[:4] == b"%PDF"
    # other user sees nothing
    for path in ("", "/candidates", "/export.csv", "/report.pdf"):
        assert c.get(f"/api/analyses/{aid}{path}", headers=h2).status_code == 404
    assert c.delete(f"/api/analyses/{aid}", headers=h2).status_code == 404
    assert c.get("/api/analyses", headers=h2).json()["total"] == 0
    assert c.get("/api/stats", headers=h1).json()["total_analyses"] == 1
    assert c.get("/api/analyses?search=run", headers=h1).json()["total"] == 1
    assert c.delete(f"/api/analyses/{aid}", headers=h1).status_code == 204


def test_bad_input_and_gpu_guard():
    h = reg("u3@x.com")
    assert c.post("/api/analyses", headers=h, json={"name": "x", "reference": "ACGZ" * 20}).status_code == 422
    assert c.post("/api/analyses", headers=h, json={"name": "x", "reference": "ACGT"}).status_code == 422
    from app import compute
    if not compute.gpu_status()["available"]:
        assert c.post("/api/analyses", headers=h, json={"name": "x", "reference": SEQ, "execution_mode": "gpu"}).status_code == 422


def test_align_and_benchmark():
    h = reg("u4@x.com")
    r = c.post("/api/align", headers=h, json={"reference": "ACGTTACGT", "query": "ACGTACGT", "align_mode": "global"})
    assert r.status_code == 200 and r.json()["gaps"] == 1
    b = c.post("/api/benchmark", headers=h, json={"sizes": [100], "repeats": 2})
    assert b.status_code == 200 and c.get("/api/benchmarks/latest", headers=h).json()["rows"][0]["n"] == 100
