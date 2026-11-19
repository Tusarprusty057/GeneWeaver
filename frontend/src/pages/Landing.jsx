import { Link } from "react-router-dom";
import { Logo } from "../ui.jsx";
import { useAuth } from "../auth.jsx";

export function PublicNav() {
  const { user } = useAuth();
  return <nav className="pubnav"><Logo /><span className="sp" />
    <Link to="/">Home</Link><Link to="/documentation">Documentation</Link>
    {user ? <Link className="btn primary" to="/dashboard">Open Dashboard</Link> : <><Link to="/login">Sign In</Link><Link className="btn primary" to="/register">Get Started</Link></>}</nav>;
}
export const Footer = () => <footer className="pf"><div className="pub">GeneWeaver is a learning and research tool. It does not predict whether a CRISPR guide works or is safe.
  {" "}<Link to="/documentation">Documentation</Link> · Your data stays in your own database. · Contact: add your email here.</div></footer>;

export default function Landing() {
  return <div><div className="pub"><PublicNav />
    <section className="hero"><h1>Find CRISPR targets and compare DNA sequences.</h1>
      <p>Upload a DNA sequence, find CRISPR target candidates, align two sequences, and see how CPU and GPU speeds compare.</p>
      <div className="inline"><Link className="btn primary" to="/register">Start Analysis</Link><Link className="btn" to="/documentation">Read the Guide</Link></div></section>
    <section className="sec"><h2>How it works</h2><div className="steps">
      <div><b>1. Add DNA</b><span className="muted">Paste a sequence or upload a FASTA file. GeneWeaver checks it for you.</span></div>
      <div><b>2. Choose an analysis</b><span className="muted">Find CRISPR targets, compare two sequences, or do both.</span></div>
      <div><b>3. Read the results</b><span className="muted">See the main numbers first. Open details when you need them. Export as CSV, JSON or PDF.</span></div></div></section>
    <section className="sec"><h2>Good to know</h2>
      <p className="muted">Candidates are sequence patterns (a 20-letter guide next to an NGG PAM). A match does not prove a guide works. GPU results only appear if your computer has a supported NVIDIA GPU.</p></section>
  </div><Footer /></div>;
}
