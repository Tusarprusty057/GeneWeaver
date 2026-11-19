import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Loader2 } from "lucide-react";
import { api, download } from "../api.js";
import { AlignSummary, Loading, Metric, Notice, PageHeader, Pager, Section, Status, fmt } from "../ui.jsx";

function Candidates({ id }) {
  const [q, setQ] = useState({ strand: "", sort: "start", order: "asc" }), [page, setPage] = useState(1), [d, setD] = useState(null), [err, setErr] = useState("");
  useEffect(() => {
    const p = new URLSearchParams({ ...Object.fromEntries(Object.entries(q).filter(([, v]) => v)), page, size: 20 });
    api(`/analyses/${id}/candidates?` + p).then(setD).catch((e) => setErr(e.message));
  }, [id, q, page]);
  const set = (k) => (e) => { setPage(1); setQ({ ...q, [k]: e.target.value }); };
  return <div className="stack"><div className="row">
    <div><label htmlFor="cs">Strand</label><select id="cs" value={q.strand} onChange={set("strand")}><option value="">Both</option><option value="+">Forward (+)</option><option value="-">Reverse (−)</option></select></div>
    <div><label htmlFor="so">Sort by</label><select id="so" value={q.sort} onChange={set("sort")}><option value="start">Position</option><option value="gc">GC content</option><option value="guide">Guide sequence</option></select></div>
    <div><label htmlFor="od">Order</label><select id="od" value={q.order} onChange={set("order")}><option value="asc">Low to high</option><option value="desc">High to low</option></select></div></div>
    <Notice kind="error">{err}</Notice>
    {d && (d.items.length === 0 ? <p className="muted">No candidates match this filter.</p> : <><div className="scroll"><table><thead><tr><th>ID</th><th>Guide</th><th>PAM</th><th>Strand</th><th>Position</th><th>GC</th><th>Differences</th></tr></thead>
      <tbody>{d.items.map((c) => <tr key={c.id}><td>{c.id}</td><td className="mono">{c.guide}</td><td className="mono">{c.pam}</td><td>{c.strand}</td><td>{c.start}–{c.end}</td><td>{(c.gc * 100).toFixed(0)}%</td><td>{c.mismatches ?? "-"}</td></tr>)}</tbody></table></div>
      <Pager page={d.page} size={d.size} total={d.total} onPage={setPage} /></>)}
    <p className="hint">GC = share of G and C letters. Differences = letters that differ from your compare guide (if you gave one). Candidates are patterns only. They are not proof that a guide works.</p></div>;
}

export default function Analysis() {
  const { id } = useParams();
  const [a, setA] = useState(null), [err, setErr] = useState("");
  const load = useCallback(() => api("/analyses/" + id).then(setA).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (a && (a.status === "pending" || a.status === "running")) { const t = setTimeout(load, 1500); return () => clearTimeout(t); } }, [a, load]);
  const dl = (path, name) => download(`/analyses/${id}/${path}`, name).catch((e) => setErr(e.message));
  if (!a) return <div className="stack">{err ? <><Notice kind="error">{err === "Analysis not found" ? "We could not find this analysis." : err}</Notice><Link className="btn" to="/history">Back to history</Link></> : <Loading />}</div>;
  const r = a.result, done = a.status === "completed", crispr = a.type !== "alignment", aln = r?.alignment;
  const hist = done && r.gc_hist.map((n, i) => ({ gc: Math.round((i / a.params.guide_len) * 100) + "%", count: n }));
  const exp = done && <div className="inline"><button className="btn sm" onClick={() => dl("report.pdf", `report_${id}.pdf`)}><Download size={14} />PDF report</button>
    {crispr && <button className="btn sm" onClick={() => dl("export.csv", `analysis_${id}.csv`)}>CSV</button>}<button className="btn sm" onClick={() => dl("export.json", `analysis_${id}.json`)}>JSON</button></div>;
  return <div className="stack-lg">
    <PageHeader title={a.name} subtitle={<span className="inline"><Status s={a.status} /><span>· {fmt(a.created_at)} · {a.seq_length.toLocaleString()} letters</span></span>} action={exp} />
    {(a.status === "pending" || a.status === "running") && <Notice><span className="inline"><Loader2 size={14} className="spin" />{r?.stage ? r.stage + "…" : "Waiting to start…"} This page updates by itself.</span></Notice>}
    {a.status === "failed" && <><Notice kind="error">Analysis failed. Please check your input and try again.</Notice><Section title="Technical message"><p className="mono">{a.error}</p></Section><Link className="btn primary" to="/analysis/new">Start a new analysis</Link></>}
    {done && <>
      <div className="metrics">
        {crispr && <Metric label="Candidates found" value={a.n_candidates.toLocaleString()} hint={`${r.strand_counts["+"]} forward · ${r.strand_counts["-"]} reverse`} />}
        {aln && <Metric label="Alignment score" value={aln.score} hint="Higher means a closer match." />}
        {aln && <Metric label="Identity" value={aln.identity + "%"} hint="Share of positions that match." />}
        <Metric label="Processed on" value={(a.mode_used || "cpu").toUpperCase()} hint={`${(r.timing.total_ms / 1000).toFixed(2)} s total`} /></div>
      <Notice>These results show sequence patterns and similarity only. They do not show that a guide works or is safe.</Notice>
      {crispr && <Section title="CRISPR candidates" note={`${a.n_candidates.toLocaleString()} found`} open><Candidates id={id} /></Section>}
      {aln && <Section title="Alignment" note={aln.mode} open><AlignSummary a={aln} /></Section>}
      {crispr && a.n_candidates > 0 && <Section title="GC content chart"><div style={{ height: 240 }}><ResponsiveContainer><BarChart data={hist}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="gc" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#14A89A" name="Candidates" /></BarChart></ResponsiveContainer></div></Section>}
      <Section title="Technical details"><div className="stack">
        <p>Run time (ms): {Object.entries(r.timing).filter(([k, v]) => typeof v === "number").map(([k, v]) => `${k.replace("_ms", "")} ${v}`).join(" · ")}</p>
        {r.timing.gpu && <p>GPU: copy to GPU {r.timing.gpu.h2d_ms.toFixed(3)} · kernel {r.timing.gpu.kernel_ms.toFixed(3)} · copy back {r.timing.gpu.d2h_ms.toFixed(3)} ms</p>}
        <p className="small muted">Computer: {r.hardware.cpu} ({r.hardware.cpu_cores} cores) · GPU: {r.hardware.gpu.available ? r.hardware.gpu.name : "not available"}</p>
        <p className="small muted">Software: {Object.entries(r.software).map(([k, v]) => `${k} ${v}`).join(" · ")}</p>
        <p className="mono" style={{ wordBreak: "break-all" }}>Settings: {JSON.stringify(a.params)}</p><p className="mono" style={{ wordBreak: "break-all" }}>Sequence SHA-256: {a.seq_hash}</p></div></Section></>}
    <Link to="/history" className="small">← Analysis history</Link></div>;
}
