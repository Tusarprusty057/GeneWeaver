import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Err } from "../ui.jsx";

const MAX = 5 * 1024 * 1024;
function summarize(t) {
  const recs = t.trim() ? (t.trim().startsWith(">") ? t.split(">").slice(1) : [t]) : [];
  const lens = recs.map((r) => (t.trim().startsWith(">") ? r.split("\n").slice(1).join("") : r).replace(/\s/g, "").length);
  return { count: recs.length, first: lens[0] || 0 };
}

export default function NewAnalysis() {
  const nav = useNavigate();
  const [hw, setHw] = useState(null);
  const [f, setF] = useState({ name: "", reference: "", query: "", guide_len: 20, pam: "NGG", strands: "both", compare_guide: "",
    execution_mode: "auto", align_mode: "local", match: 2, mismatch: 1, gap_open: 2, gap_extend: 0.5 });
  const [file, setFile] = useState(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { api("/hardware").then(setHw).catch((e) => setErr(e.message)); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const gpu = hw?.hardware.gpu;
  const sum = summarize(f.reference);

  function onFile(e) {
    const fl = e.target.files[0]; if (!fl) return;
    if (fl.size > MAX) return setErr("File too large (max 5 MB)");
    if (!/\.(fa|fasta|fna|txt)$/i.test(fl.name)) return setErr("Use .fasta, .fa, .fna or .txt");
    const r = new FileReader();
    r.onload = () => { setErr(""); setFile({ name: fl.name, size: fl.size }); setF((p) => ({ ...p, reference: r.result, name: p.name || fl.name })); };
    r.readAsText(fl);
  }
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const body = { ...f, guide_len: +f.guide_len, match: +f.match, mismatch: +f.mismatch, gap_open: +f.gap_open, gap_extend: +f.gap_extend,
        query: f.query.trim() || null, compare_guide: f.compare_guide.trim() || null };
      nav("/analysis/" + (await api("/analyses", { method: "POST", body })).id);
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  return <div><h1>New DNA Analysis</h1>
    <form onSubmit={submit}>
      <div className="card"><h2>1. Input</h2>
        <label htmlFor="nm">Analysis name</label><input id="nm" required value={f.name} onChange={set("name")} />
        <label htmlFor="rf">Reference DNA (paste, or upload FASTA/TXT)</label>
        <textarea id="rf" value={f.reference} onChange={set("reference")} placeholder=">seq1&#10;ACGT…" required />
        <input type="file" aria-label="Upload FASTA or TXT" accept=".fa,.fasta,.fna,.txt" onChange={onFile} />
        <p className="muted">{file && `${file.name} · ${(file.size / 1024).toFixed(1)} KB · `}{sum.count} record(s) · first record {sum.first.toLocaleString()} bases{sum.count > 1 && " (only the first record is analysed)"}</p></div>
      <div className="card"><h2>2. CRISPR configuration</h2><div className="row">
        <div><label htmlFor="pm">PAM (IUPAC; SpCas9 = NGG)</label><input id="pm" value={f.pam} onChange={set("pam")} /></div>
        <div><label htmlFor="gl">Guide length</label><input id="gl" type="number" min="10" max="30" value={f.guide_len} onChange={set("guide_len")} /></div>
        <div><label htmlFor="st">Strands</label><select id="st" value={f.strands} onChange={set("strands")}><option value="both">Both</option><option value="forward">Forward</option><option value="reverse">Reverse</option></select></div></div>
        <label htmlFor="cg">Compare guide (optional, same length; scores mismatches against it)</label><input id="cg" className="mono" value={f.compare_guide} onChange={set("compare_guide")} /></div>
      <div className="card"><h2>3. Alignment (optional)</h2>
        <label htmlFor="q">Query DNA (leave empty to skip; both sequences ≤ 10,000 bases)</label><textarea id="q" value={f.query} onChange={set("query")} />
        <div className="row"><div><label htmlFor="am">Mode</label><select id="am" value={f.align_mode} onChange={set("align_mode")}><option>local</option><option>global</option></select></div>
          {[["match", "Match reward"], ["mismatch", "Mismatch penalty"], ["gap_open", "Gap open penalty"], ["gap_extend", "Gap extend penalty"]].map(([k, l]) =>
            <div key={k}><label htmlFor={k}>{l}</label><input id={k} type="number" step="0.1" min="0" value={f[k]} onChange={set(k)} /></div>)}</div></div>
      <div className="card"><h2>4. Processing</h2>
        <label htmlFor="em">Execution mode</label>
        <select id="em" value={f.execution_mode} onChange={set("execution_mode")}><option value="auto">Automatic</option><option value="cpu">CPU</option><option value="gpu" disabled={!gpu?.available}>GPU{gpu?.available ? "" : " (not available)"}</option></select>
        {hw && <p className="muted">CPU: {hw.hardware.cpu} ({hw.hardware.cpu_cores} cores) · GPU: {gpu.available ? `${gpu.name} (${gpu.framework})` : `not available — ${gpu.reason}`}</p>}</div>
      <Err msg={err} /><button className="btn primary" disabled={busy}>{busy ? "Submitting…" : "Review OK — start analysis"}</button>
    </form></div>;
}
