import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, download } from "../api.js";
import { AlignStats, AlignView, Badge, Err, Pager, Stat, fmt } from "../ui.jsx";

function Candidates({ id }) {
  const [q, setQ] = useState({ strand: "", sort: "start", order: "asc" }), [page, setPage] = useState(1), [d, setD] = useState(null), [err, setErr] = useState("");
  useEffect(() => {
    const p = new URLSearchParams({ ...Object.fromEntries(Object.entries(q).filter(([, v]) => v)), page, size: 25 });
    api(`/analyses/${id}/candidates?` + p).then(setD).catch((e) => setErr(e.message));
  }, [id, q, page]);
  const set = (k) => (e) => { setPage(1); setQ({ ...q, [k]: e.target.value }); };
  return <div className="card"><h2>CRISPR candidates</h2>
    <div className="row"><div><label htmlFor="cs">Strand</label><select id="cs" value={q.strand} onChange={set("strand")}><option value="">Both</option><option value="+">+</option><option value="-">-</option></select></div>
      <div><label htmlFor="so">Sort by</label><select id="so" value={q.sort} onChange={set("sort")}><option value="start">Start</option><option value="gc">GC content</option><option value="guide">Guide</option></select></div>
      <div><label htmlFor="od">Order</label><select id="od" value={q.order} onChange={set("order")}><option value="asc">Ascending</option><option value="desc">Descending</option></select></div></div>
    <Err msg={err} />
    {d && (d.items.length === 0 ? <p className="muted">No candidates.</p> : <><div className="scroll"><table><thead><tr><th>ID</th><th>Guide</th><th>PAM</th><th>Strand</th><th>Start</th><th>End</th><th>Len</th><th>GC</th><th>Mismatches</th></tr></thead>
      <tbody>{d.items.map((c) => <tr key={c.id}><td>{c.id}</td><td className="mono">{c.guide}</td><td className="mono">{c.pam}</td><td>{c.strand}</td><td>{c.start}</td><td>{c.end}</td><td>{c.length}</td><td>{(c.gc * 100).toFixed(0)}%</td><td>{c.mismatches ?? "-"}</td></tr>)}</tbody></table></div>
      <Pager page={d.page} size={d.size} total={d.total} onPage={setPage} /></>)}
    <p className="muted">Computational candidates only. No claim of guide efficacy or safety.</p></div>;
}

export default function Analysis() {
  const { id } = useParams();
  const [a, setA] = useState(null), [err, setErr] = useState("");
  const load = useCallback(() => api("/analyses/" + id).then(setA).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (a && (a.status === "pending" || a.status === "running")) { const t = setTimeout(load, 1500); return () => clearTimeout(t); } }, [a, load]);
  const dl = (path, name) => download(`/analyses/${id}/${path}`, name).catch((e) => setErr(e.message));
  if (!a) return <div><Err msg={err} />{!err && <p>Loading…</p>}<Link to="/history">Back to history</Link></div>;
  const r = a.result, done = a.status === "completed";
  const hist = r?.gc_hist.map((n, i) => ({ gc: Math.round((i / (a.params.guide_len)) * 100) + "%", count: n }));
  return <div><h1>#{a.id} · {a.name} <Badge s={a.status} /></h1><Err msg={err} />
    {(a.status === "pending" || a.status === "running") && <div className="alert info">Status: {a.status}. This page refreshes until the job finishes.</div>}
    {a.status === "failed" && <div className="alert err">Analysis failed: {a.error}</div>}
    <div className="grid4"><Stat label="Created" value={fmt(a.created_at)} /><Stat label="Sequence" value={`${a.seq_id} (${a.seq_length.toLocaleString()} bp)`} />
      <Stat label="Mode (requested → used)" value={`${a.execution_mode} → ${a.mode_used || "-"}`} /><Stat label="Candidates" value={done ? a.n_candidates : "-"} /></div>
    {done && <>
      <div className="card"><h2>Export</h2><div className="row" style={{ maxWidth: 420 }}>
        <button className="btn" onClick={() => dl("export.csv", `analysis_${id}.csv`)}>CSV</button><button className="btn" onClick={() => dl("export.json", `analysis_${id}.json`)}>JSON</button>
        <button className="btn" onClick={() => dl("report.pdf", `report_${id}.pdf`)}>PDF report</button></div></div>
      <div className="card"><h2>Input &amp; configuration</h2><p className="mono" style={{ wordBreak: "break-all" }}>sha256 {a.seq_hash}</p>
        <p className="mono">{JSON.stringify(a.params)}</p>{a.query_length && <p>Query length: {a.query_length}</p>}</div>
      {r.gc_hist.some(Boolean) && <div className="card"><h2>GC content distribution (candidates)</h2><div style={{ height: 240 }}><ResponsiveContainer><BarChart data={hist}>
        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="gc" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#14B8A6" /></BarChart></ResponsiveContainer></div>
        <p className="muted">Forward (+): {r.strand_counts["+"]} · Reverse (−): {r.strand_counts["-"]}</p></div>}
      <Candidates id={id} />
      {r.alignment && <div className="card"><h2>Alignment ({r.alignment.mode})</h2><AlignStats a={r.alignment} /><AlignView a={r.alignment} /></div>}
      <div className="card"><h2>Computation</h2>
        <p>Timings (ms): scan {r.timing.scan_ms}{r.timing.score_ms != null && <>, scoring {r.timing.score_ms}</>}{r.timing.align_ms != null && <>, alignment {r.timing.align_ms}</>}, total {r.timing.total_ms}</p>
        {r.timing.gpu && <p>GPU: H2D {r.timing.gpu.h2d_ms.toFixed(3)} · kernel {r.timing.gpu.kernel_ms.toFixed(3)} · D2H {r.timing.gpu.d2h_ms.toFixed(3)} ms</p>}
        <p className="muted">CPU: {r.hardware.cpu} ({r.hardware.cpu_cores} cores) · GPU: {r.hardware.gpu.available ? r.hardware.gpu.name : "not available"}</p>
        <p className="muted">Software: {Object.entries(r.software).map(([k, v]) => `${k} ${v}`).join(" · ")}</p></div></>}
    <Link to="/history">← History</Link></div>;
}
