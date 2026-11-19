import { PublicNav, Footer } from "./Landing.jsx";
import { Section } from "../ui.jsx";

const S = [
  ["Getting started", "Create an account, open New Analysis, add a DNA sequence, pick what to analyze, and start. Results appear when the job finishes."],
  ["DNA input and FASTA", "Use the letters A, C, G, T and N. N means an unknown base. Upper or lower case both work. A FASTA file starts each sequence with a line that begins with “>”. If a file has several sequences, GeneWeaver uses the first. Limits: 5 MB per file, 2 million letters per sequence, 10,000 letters for alignment."],
  ["CRISPR targets and PAM", "A CRISPR guide is a short stretch of DNA (usually 20 letters) that sits next to a PAM. For SpCas9 the PAM is NGG, where N is any base. GeneWeaver scans both strands. Positions are 1-based and always given on the forward strand. The PAM is not included in the position."],
  ["Sequence alignment", "Alignment lines up two sequences to show where they match. Local alignment finds the best matching part. Global alignment lines up the full sequences. Penalties are entered as positive numbers. Identity is the share of aligned positions that match."],
  ["CPU and GPU", "Scoring guide candidates (GC content and letter differences) runs on the CPU. If your computer has an NVIDIA GPU and the optional Numba package, it can run on the GPU too. Full alignment always runs on the CPU. GPU is chosen automatically only for large jobs (5,000+ candidates)."],
  ["Benchmark", "The benchmark scores seeded random guides on CPU and GPU with identical input. It does one warm-up run, repeats the test, and checks that both give the same answers. Speedup = CPU time ÷ GPU time. Without a GPU, only CPU results are shown."],
  ["Exports", "Download candidates as CSV, everything as JSON, or a summary as a PDF report."],
  ["Limits", "Candidates are sequence patterns. GeneWeaver does not predict guide efficiency, off-target effects or safety. It is for learning and research."]];

export default function Docs() {
  return <div><div className="pub"><PublicNav /><div className="stack" style={{ padding: "16px 0" }}><h1>Documentation</h1><p className="muted">Short answers to common questions.</p>
    {S.map(([t, d], i) => <Section key={t} title={t} open={i === 0}><p>{d}</p></Section>)}</div></div><Footer /></div>;
}
