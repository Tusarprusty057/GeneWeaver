import { Link } from "react-router-dom";
import { Logo } from "../ui.jsx";

export function PublicNav() {
  return <nav className="pubnav"><Logo /><span className="sp" />
    <Link to="/">Home</Link><a href="/#features">Features</a><a href="/#tech">Technology</a>
    <Link to="/documentation">Documentation</Link><Link to="/login">Sign In</Link>
    <Link className="btn primary" to="/register">Get Started</Link></nav>;
}
export const Footer = () => <footer><div className="pub">GeneWeaver · educational and research tool · <Link to="/documentation">Documentation</Link> · Contact: your-email@example.com (placeholder) · Privacy &amp; Terms: local-use project, data stays in your own database.</div></footer>;

const features = [
  ["DNA processing", "FASTA/TXT input, strict A/C/G/T/N validation, reverse complement."],
  ["CRISPR candidate scanning", "SpCas9 20 nt + NGG on both strands with checked coordinate mapping. Configurable PAM."],
  ["Sequence alignment", "Biopython PairwiseAligner, local or global, custom scores, real alignment viewer."],
  ["CPU / GPU scoring", "NumPy reference path. Optional Numba CUDA kernel for candidate scoring when a GPU exists."],
  ["Benchmarking", "Seeded identical input, warm-up, repeats, median/std, result equality check."],
  ["Saved results", "History, filters, CSV / JSON / PDF export."]];

export default function Landing() {
  return <div><div className="pub"><PublicNav />
    <section className="hero"><h1>Accelerating DNA Sequence Analysis Through Intelligent Computing.</h1>
      <p>GeneWeaver is a computational platform for DNA sequence processing, CRISPR target candidate identification, sequence alignment, and CPU/GPU performance evaluation.</p>
      <div className="row" style={{ maxWidth: 360 }}><Link className="btn primary" to="/register">Start Analyzing</Link><a className="btn" href="#features">Explore Platform</a></div></section>
    <section className="card"><h2>How it works</h2><div className="flow">
      {["DNA Input", "Validation", "Candidate Scanning", "Alignment", "Scoring", "Results"].map((s, i, a) => <span key={s}>{s}{i < a.length - 1 ? "  →" : ""}</span>)}</div></section>
    <section id="features"><h2>Features</h2><div className="grid4">{features.map(([t, d]) => <div className="card" key={t}><b>{t}</b><p className="muted">{d}</p></div>)}</div></section>
    <section id="tech" className="card"><h2>Technology</h2>
      <p>React + Vite + Recharts · FastAPI + Pydantic · SQLAlchemy + SQLite · Biopython · NumPy · Numba CUDA (optional).</p></section>
    <section className="card"><h2>Transparency and limits</h2>
      <p>Candidates are computational sites only. GeneWeaver makes no claim about guide efficacy, off-target risk, or biological safety. GPU results appear only when a CUDA GPU is detected. Details: <Link to="/documentation">documentation</Link>.</p></section>
  </div><Footer /></div>;
}
