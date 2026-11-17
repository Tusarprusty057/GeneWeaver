"""DNA core: FASTA parse, validation, reverse complement, CRISPR scan, alignment.
Pure Python. No web code here."""
import re
from Bio import Align

VALID = set("ACGTN")
_COMP = str.maketrans("ACGTN", "TGCAN")
IUPAC = {"A": "A", "C": "C", "G": "G", "T": "T", "N": "[ACGT]", "R": "[AG]", "Y": "[CT]",
         "S": "[CG]", "W": "[AT]", "K": "[GT]", "M": "[AC]"}
MAX_ALIGN_LEN = 10_000


def clean_sequence(text, name="sequence"):
    """Upper-case, drop whitespace. Only A,C,G,T,N allowed. N = unknown base (never part of a guide)."""
    s = "".join(text.split()).upper()
    if not s:
        raise ValueError(f"{name} is empty")
    bad = sorted(set(s) - VALID)
    if bad:
        raise ValueError(f"Invalid characters in {name}: {bad[:5]} (allowed: A C G T N)")
    return s


def parse_input(text):
    """FASTA or raw text -> list of (id, sequence)."""
    text = text.strip()
    if not text:
        raise ValueError("No sequence given")
    if not text.startswith(">"):
        return [("sequence", clean_sequence(text))]
    recs, name, buf = [], None, []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith(">"):
            if name is not None:
                recs.append((name, clean_sequence("".join(buf), name)))
            name = (line[1:].split() or [f"seq{len(recs) + 1}"])[0]
            buf = []
        else:
            buf.append(line)
    if name is not None:
        recs.append((name, clean_sequence("".join(buf), name)))
    return recs


def revcomp(s):
    return s.translate(_COMP)[::-1]


def _scan_strand(s, g, pam_rx):
    rx = re.compile(rf"(?=([ACGT]{{{g}}})({pam_rx}))")  # lookahead = overlapping hits
    return [(m.start(), m.group(1), m.group(2)) for m in rx.finditer(s)]


def scan(seq, guide_len=20, pam="NGG", strands="both"):
    """Find guide+PAM sites. Coordinates: 1-based, inclusive, on the FORWARD strand,
    covering the guide only (not the PAM). Reverse hits: guide/pam text is read on the reverse strand."""
    try:
        pam_rx = "".join(IUPAC[c] for c in pam.upper())
    except KeyError as e:
        raise ValueError(f"Unsupported PAM symbol: {e}")
    L, out = len(seq), []
    if strands in ("both", "forward"):
        for i, g, p in _scan_strand(seq, guide_len, pam_rx):
            out.append({"guide": g, "pam": p, "strand": "+", "start": i + 1, "end": i + guide_len})
    if strands in ("both", "reverse"):
        for j, g, p in _scan_strand(revcomp(seq), guide_len, pam_rx):
            # position j on reverse copy -> forward: guide covers [L-j-g, L-j) 0-based
            out.append({"guide": g, "pam": p, "strand": "-", "start": L - j - guide_len + 1, "end": L - j})
    out.sort(key=lambda c: (c["start"], c["strand"]))
    return out


def align(ref, query, mode="local", match=2.0, mismatch=1.0, gap_open=2.0, gap_extend=0.5):
    """Biopython PairwiseAligner. Penalties are given as positive numbers."""
    if len(ref) > MAX_ALIGN_LEN or len(query) > MAX_ALIGN_LEN:
        raise ValueError(f"Alignment limited to {MAX_ALIGN_LEN} bases per sequence")
    a = Align.PairwiseAligner()
    a.mode = mode
    a.match_score, a.mismatch_score = match, -mismatch
    a.open_gap_score, a.extend_gap_score = -gap_open, -gap_extend
    try:
        aln = a.align(ref, query)[0]
    except IndexError:  # local mode with no positive-scoring match -> no alignment at all
        aln = None
    rb, qb = aln.aligned if aln is not None else ([], [])
    if len(rb) == 0:
        return {"score": 0.0, "mode": mode, "length": 0, "matches": 0, "mismatches": 0, "gaps": 0,
                "identity": 0.0, "ref_aln": "", "query_aln": "", "midline": "",
                "ref_start": 0, "ref_end": 0, "query_start": 0, "query_end": 0}
    pr, pq = (0, 0) if mode == "global" else (int(rb[0][0]), int(qb[0][0]))
    rs, qs = "", ""
    for (r0, r1), (q0, q1) in zip(rb, qb):
        rs += ref[pr:r0] + "-" * (q0 - pq)   # ref-only bases vs gap in query, and vice versa
        qs += "-" * (r0 - pr) + query[pq:q0]
        rs += ref[r0:r1]
        qs += query[q0:q1]
        pr, pq = int(r1), int(q1)
    if mode == "global":
        rs += ref[pr:] + "-" * (len(query) - pq)
        qs += "-" * (len(ref) - pr) + query[pq:]
    mid = "".join("-" if "-" in (x, y) else "|" if x == y else "." for x, y in zip(rs, qs))
    m, mm, gp = mid.count("|"), mid.count("."), mid.count("-")
    return {"score": float(aln.score), "mode": mode, "length": len(rs), "matches": m, "mismatches": mm,
            "gaps": gp, "identity": round(100 * m / len(rs), 2), "ref_aln": rs, "query_aln": qs,
            "midline": mid.replace("-", " "), "ref_start": int(rb[0][0]) + 1, "ref_end": int(rb[-1][1]),
            "query_start": int(qb[0][0]) + 1, "query_end": int(qb[-1][1])}
