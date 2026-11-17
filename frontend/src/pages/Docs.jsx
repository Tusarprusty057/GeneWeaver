import { PublicNav, Footer } from "./Landing.jsx";

const S = [
  ["Getting started", "Register, log in, open New Analysis, paste or upload DNA, choose settings, start. The job runs in the background; the result page updates when it finishes."],
  ["DNA input and FASTA", "Allowed bases: A C G T N (case-insensitive, whitespace ignored). N = unknown base; windows with N are never reported as guides. A FASTA header starts with '>'. If a file has several records, only the first is analysed. Limits: 5 MB file, 2,000,000 bases, 10,000 bases for alignment."],
  ["CRISPR scanning and PAM", "A guide (default 20 nt) must be followed by a PAM. SpCas9 uses NGG (N = any base). The PAM field accepts IUPAC symbols, so other profiles can be tried. Reverse strand: the sequence is reverse-complemented, scanned, and coordinates are mapped back. Reported start/end are 1-based forward-strand positions of the guide (PAM excluded)."],
  ["Alignment and scoring", "Biopython PairwiseAligner. Local = best matching region; global = whole sequences. Enter penalties as positive numbers. A gap of length k costs open + (k−1)×extend. Identity = matches / alignment columns."],
  ["CPU and GPU execution", "Candidate scoring (GC count, mismatches vs a compare guide) always has a NumPy CPU path. If numba and an NVIDIA CUDA GPU are present, the same scoring runs as a CUDA kernel. Automatic mode picks GPU only for 5,000+ candidates. Full dynamic-programming alignment runs on CPU only."],
  ["Benchmark method", "Seeded random guides, identical for CPU and GPU; one warm-up run; synchronised timing; repeated runs; median and std; GPU results compared to CPU for equality. Speedup = CPU median / GPU end-to-end median. Without a GPU only CPU rows are shown."],
  ["Exports", "CSV (candidates), JSON (analysis + candidates), PDF (summary report)."],
  ["Limitations", "Candidates are sequence patterns only. No efficacy, specificity, off-target, or safety prediction. No clinical validation. Educational and research use."]];

export default function Docs() {
  return <div><div className="pub"><PublicNav /><h1>Documentation</h1>
    {S.map(([t, d]) => <section className="card" key={t}><h2>{t}</h2><p>{d}</p></section>)}</div><Footer /></div>;
}
