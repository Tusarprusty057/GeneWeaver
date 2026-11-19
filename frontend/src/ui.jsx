import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Dna, Info, Loader2 } from "lucide-react";

export const Logo = () => <Link to="/" className="logo"><Dna size={20} color="#14A89A" /><span>Gene<b>Weaver</b></span></Link>;
export const fmt = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "-");

export function PageHeader({ title, subtitle, action }) {
  return <div className="head"><div className="sp"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
export function Notice({ kind = "info", children }) {
  if (!children) return null;
  const Icon = kind === "error" ? AlertCircle : kind === "ok" ? CheckCircle2 : Info;
  return <div className={"notice " + kind} role={kind === "error" ? "alert" : "status"}><Icon size={18} /><div>{children}</div></div>;
}
export const Loading = ({ text = "Loading…" }) => <p className="muted inline" role="status"><Loader2 size={16} className="spin" />{text}</p>;
export const Empty = ({ title, text, action }) => <div className="empty"><h2>{title}</h2><p className="muted">{text}</p>{action}</div>;
const LABEL = { completed: "Completed", running: "Running", pending: "Waiting", failed: "Failed" };
export const Status = ({ s }) => <span className={"status " + s}><i />{LABEL[s] || s}</span>;
export const Metric = ({ label, value, hint }) => <div className="metric"><div className="l">{label}</div><div className="v">{value}</div>{hint && <div className="hint">{hint}</div>}</div>;

export function Field({ id, label, required, hint, error, children }) {
  return <div className={"field" + (error ? " invalid" : "")}><label htmlFor={id}>{label}{required && <span className="req"> *</span>}</label>{children}
    {error ? <div className="ferr" id={id + "-e"}>{error}</div> : hint && <div className="hint">{hint}</div>}</div>;
}
export const Section = ({ title, note, open, children }) => <details open={open}><summary>{title} {note && <span className="muted small">{note}</span>}</summary><div className="body">{children}</div></details>;

export function Pager({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="pager"><span>Page {page} of {pages}</span>
    <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <button className="btn sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div>;
}

// Client-side DNA check: counts records, first-record length, first bad character.
export function inspectDna(text) {
  const t = text.trim();
  if (!t) return { empty: true, records: 0, length: 0, bad: null };
  const fasta = t.startsWith(">");
  let records = fasta ? 0 : 1, length = 0, bad = null;
  for (const line of t.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    if (l.startsWith(">")) { records++; continue; }
    const s = l.replace(/\s/g, "");
    const m = s.match(/[^ACGTNacgtn]/);
    if (m && !bad) bad = m[0];
    if (records <= 1) length += s.length;
  }
  return { empty: false, records, length, bad };
}
export const dnaError = (i) => (i.bad ? `"${i.bad}" is not a valid DNA letter. Use A, C, G, T or N.` : i.length === 0 && !i.empty ? "No DNA letters found." : "");

export const SAMPLE_REF = ">sample_reference\nATGGCTAGCTAGGATCCGATCGATTGGCATCGATCGGATCGTAGCTAGCTAGGCTAACGGTTAGCGATCGATCGGATAGCTAGGCTTAAGCGATCGTAGGCTAGCTAGGTACCGATCGGAT";
export const SAMPLE_QRY = ">sample_query\nGGATCCGATCGATTGGCATCGATCGGATCGTAGCTAGGTAGGCTAACGGTTAGCGATCG";

export function AlignView({ a }) {
  if (!a || !a.length) return <p className="muted">No matching region found with these scores.</p>;
  const W = 60, starts = [];
  for (let i = 0; i < a.length; i += W) starts.push(i);
  const cls = (r, q) => (r === "-" || q === "-" ? "g" : r === q ? "m" : "x");
  const row = (str, i) => [...str.slice(i, i + W)].map((ch, k) => <span key={k} className={cls(a.ref_aln[i + k], a.query_aln[i + k])}>{ch}</span>);
  return <div><div className="legend"><span className="m">Match</span><span className="x">Mismatch</span><span className="g">Gap</span></div>
    <div className="aln" tabIndex={0} role="group" aria-label="Sequence alignment">
      {starts.map((i) => <div key={i} className="blk"><div>Ref&nbsp;{row(a.ref_aln, i)}</div>
        <div className="mid">&nbsp;&nbsp;&nbsp;&nbsp;{a.midline.slice(i, i + W).replace(/ /g, "\u00a0")}</div><div>Qry&nbsp;{row(a.query_aln, i)}</div></div>)}</div></div>;
}
export function AlignSummary({ a }) {
  return <div className="stack"><div className="metrics"><Metric label="Alignment score" value={a.score} hint="Higher means a closer match." />
    <Metric label="Identity" value={a.identity + "%"} hint="Share of positions that match." /></div>
    <Section title="Alignment details"><div className="metrics">
      <Metric label="Matches" value={a.matches} /><Metric label="Mismatches" value={a.mismatches} /><Metric label="Gaps" value={a.gaps} /><Metric label="Length" value={a.length} />
      <Metric label="Reference region" value={a.length ? `${a.ref_start}–${a.ref_end}` : "-"} /><Metric label="Query region" value={a.length ? `${a.query_start}–${a.query_end}` : "-"} /></div></Section>
    <AlignView a={a} /></div>;
}
