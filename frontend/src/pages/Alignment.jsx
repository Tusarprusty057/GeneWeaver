import { useState } from "react";
import { api } from "../api.js";
import { AlignSummary, Field, Notice, PageHeader, SAMPLE_QRY, SAMPLE_REF, Section, dnaError, inspectDna } from "../ui.jsx";

export default function Alignment() {
  const [f, setF] = useState({ reference: "", query: "", align_mode: "local", match: 2, mismatch: 1, gap_open: 2, gap_extend: 0.5 });
  const [res, setRes] = useState(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const load = (k) => (e) => { const fl = e.target.files[0]; if (fl) fl.text().then((t) => setF((p) => ({ ...p, [k]: t }))); };
  const a = inspectDna(f.reference), b = inspectDna(f.query);
  const ok = !a.empty && !b.empty && !dnaError(a) && !dnaError(b);
  async function run(e) {
    e.preventDefault(); setErr(""); setBusy(true); setRes(null);
    try { setRes(await api("/align", { method: "POST", body: { ...f, match: +f.match, mismatch: +f.mismatch, gap_open: +f.gap_open, gap_extend: +f.gap_extend } })); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return <div className="stack-lg"><PageHeader title="Sequence Alignment" subtitle="Compare two DNA sequences. Results are not saved to your history." />
    <form className="panel stack" onSubmit={run}>
      <div className="row">
        <Field id="r" label="First sequence" required error={!a.empty && dnaError(a)} hint="Paste DNA or a FASTA record."><textarea id="r" value={f.reference} onChange={set("reference")} /><input type="file" aria-label="Upload first sequence" onChange={load("reference")} style={{ marginTop: 8 }} /></Field>
        <Field id="q" label="Second sequence" required error={!b.empty && dnaError(b)} hint="Up to 10,000 letters each."><textarea id="q" value={f.query} onChange={set("query")} /><input type="file" aria-label="Upload second sequence" onChange={load("query")} style={{ marginTop: 8 }} /></Field></div>
      <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setF({ ...f, reference: SAMPLE_REF, query: SAMPLE_QRY })}>Use sample sequences</button>
      <Section title="Advanced Settings" note="Scoring"><div className="row">
        <Field id="m" label="Alignment type" hint="Local finds the best matching part."><select id="m" value={f.align_mode} onChange={set("align_mode")}><option value="local">Local</option><option value="global">Global</option></select></Field>
        {[["match", "Match reward"], ["mismatch", "Mismatch penalty"], ["gap_open", "Gap open penalty"], ["gap_extend", "Gap extend penalty"]].map(([k, l]) => <Field key={k} id={k} label={l}><input id={k} type="number" step="0.1" min="0" value={f[k]} onChange={set(k)} /></Field>)}</div></Section>
      <Notice kind="error">{err}</Notice>
      <div><button className="btn primary" disabled={busy || !ok}>{busy ? "Comparing…" : "Compare Sequences"}</button></div></form>
    {res && <section className="panel"><h2 style={{ marginBottom: 16 }}>Result</h2><AlignSummary a={res} /></section>}</div>;
}
