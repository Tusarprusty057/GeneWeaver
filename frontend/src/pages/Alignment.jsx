import { useState } from "react";
import { api } from "../api.js";
import { AlignStats, AlignView, Err } from "../ui.jsx";

export default function Alignment() {
  const [f, setF] = useState({ reference: "", query: "", align_mode: "local", match: 2, mismatch: 1, gap_open: 2, gap_extend: 0.5 });
  const [res, setRes] = useState(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const load = (k) => (e) => { const fl = e.target.files[0]; if (fl) fl.text().then((t) => setF((p) => ({ ...p, [k]: t }))); };
  async function run(e) {
    e.preventDefault(); setErr(""); setBusy(true); setRes(null);
    try { setRes(await api("/align", { method: "POST", body: { ...f, match: +f.match, mismatch: +f.mismatch, gap_open: +f.gap_open, gap_extend: +f.gap_extend } })); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return <div><h1>Sequence Alignment</h1>
    <form className="card" onSubmit={run}>
      <div className="row"><div><label htmlFor="r">Reference (FASTA or raw)</label><textarea id="r" required value={f.reference} onChange={set("reference")} /><input type="file" aria-label="Reference file" onChange={load("reference")} /></div>
        <div><label htmlFor="q">Query (FASTA or raw)</label><textarea id="q" required value={f.query} onChange={set("query")} /><input type="file" aria-label="Query file" onChange={load("query")} /></div></div>
      <div className="row"><div><label htmlFor="m">Mode</label><select id="m" value={f.align_mode} onChange={set("align_mode")}><option>local</option><option>global</option></select></div>
        {[["match", "Match reward"], ["mismatch", "Mismatch penalty"], ["gap_open", "Gap open penalty"], ["gap_extend", "Gap extend penalty"]].map(([k, l]) =>
          <div key={k}><label htmlFor={k}>{l}</label><input id={k} type="number" step="0.1" min="0" value={f[k]} onChange={set(k)} /></div>)}</div>
      <Err msg={err} /><button className="btn primary" disabled={busy} style={{ marginTop: ".8rem" }}>{busy ? "Aligning…" : "Align"}</button></form>
    {res && <div className="card"><h2>Result</h2><AlignStats a={res} /><AlignView a={res} /></div>}</div>;
}
