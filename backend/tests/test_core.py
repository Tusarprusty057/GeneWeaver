import numpy as np, pytest
from app import compute, core

G = "ACGTACGTACGTACGTACGT"  # 20 nt


def test_revcomp():
    assert core.revcomp("AACGTN") == "NACGTT"


def test_fasta_and_validation():
    assert core.parse_input(">a x\nAC\nGT\n>b\nTTTT") == [("a", "ACGT"), ("b", "TTTT")]
    assert core.parse_input("acg t") == [("sequence", "ACGT")]
    with pytest.raises(ValueError):
        core.parse_input("ACGX")
    with pytest.raises(ValueError):
        core.parse_input("  ")


def test_forward_scan():
    s = "TT" + G + "TGG" + "AA"
    hits = core.scan(s, strands="forward")
    assert hits == [{"guide": G, "pam": "TGG", "strand": "+", "start": 3, "end": 22}]


def test_reverse_scan_coordinates():
    s = "TT" + "CCA" + core.revcomp(G) + "AA"      # CCN on + strand = NGG on - strand
    hits = core.scan(s, strands="reverse")
    assert len(hits) == 1
    h = hits[0]
    assert h["strand"] == "-" and h["guide"] == G and h["pam"] == "TGG"
    assert core.revcomp(s[h["start"] - 1:h["end"]]) == G   # coords map back to the guide


def test_n_never_in_guide():
    assert core.scan("N" + G[1:] + "TGG", strands="forward") == []


def test_bad_pam():
    with pytest.raises(ValueError):
        core.scan("ACGT", pam="NZZ")


def test_align_identical_local():
    r = core.align("ACGTACGT", "ACGTACGT")
    assert r["score"] == 16 and r["identity"] == 100 and r["gaps"] == 0


def test_align_mismatch_global():
    r = core.align("ACGTACGT", "ACGAACGT", mode="global")
    assert r["mismatches"] == 1 and r["matches"] == 7 and r["score"] == 13


def test_align_gap_global():
    r = core.align("ACGTTACGT", "ACGTACGT", mode="global")
    assert r["gaps"] == 1 and len(r["ref_aln"]) == len(r["query_aln"])
    assert r["ref_aln"].replace("-", "") == "ACGTTACGT" and r["query_aln"].replace("-", "") == "ACGTACGT"


def test_align_no_hit():
    assert core.align("AAAA", "TTTT")["length"] == 0


def test_cpu_score():
    arr = compute.encode(["ACGT", "AAAA"])
    gc, mm = compute.cpu_score(arr, compute.encode(["ACGA"])[0])
    assert gc.tolist() == [2, 0] and mm.tolist() == [1, 2]


def test_benchmark_cpu_and_fallback():
    r = compute.benchmark([100, 1000], repeats=2)
    assert len(r["rows"]) == 2 and r["rows"][0]["cpu_ms"]["median"] > 0
    if not compute.gpu_status()["available"]:
        assert r["rows"][0]["gpu"] is None   # never invent GPU numbers
    else:
        assert all(x["verified"] for x in r["rows"])
