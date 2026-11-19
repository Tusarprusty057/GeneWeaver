import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api.js";
import { Field, Loading, Metric, Notice, PageHeader, Section } from "../ui.jsx";

const t = (x) => (x == null ? "-" : x < 10 ? x.toFixed(2) : x.toFixed(1)) + " ms";

export default function Benchmark() {
  const [hw, setHw] = useState(null), [res, setRes] = useState(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [sizes, setSizes] = useState("1000, 10000, 100000, 1000000"), [reps, setReps] = useState(5);
  useEffect(() => { api("/hardware").then(setHw).catch((e) => setErr(e.message)); api("/benchmarks/latest").then(setRes).catch(() => {}); }, []);
  async function run(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { setRes(await api("/benchmark", { method: "POST", body: { sizes: sizes.split(",").map((x) => parseInt(x.trim(), 10)).filter(Boolean), repeats: +reps } })); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  const g = hw?.hardware.gpu, last = res?.rows[res.rows.length - 1], hasGpu = !!last?.gpu;
  const chart = res?.rows.map((x) => ({ n: x.n, CPU: +x.cpu_ms.median.toFixed(3), GPU: x.gpu ? +x.gpu.total_ms.median.toFixed(3) : undefined }));
  return <div className="stack-lg"><PageHeader title="Performance Comparison" subtitle="Measure how fast CPU and GPU score DNA guide candidates on your computer." />
    {!hw && !err && <Loading />}
    {hw && <div className="chips"><span className="chip good">CPU ready</span>
      <span className={"chip " + (g.available ? "good" : "off")}>{g.available ? `GPU ready: ${g.name}` : "GPU not available"}</span>
      <span className="chip">Mode: {g.available ? "CPU and GPU" : "CPU only"}</span></div>}
    {g && !g.available && <Notice>GPU processing is not available on this computer ({g.reason}). You can still run the CPU test. GPU results are never simulated.</Notice>}
    <form className="panel stack" onSubmit={run}>
      <p className="muted small">The test scores random 20-letter guides (GC count and letter differences). CPU and GPU get the exact same input. It does not test full sequence alignment.</p>
      <div className="row"><Field id="s" label="Number of guides to score" hint="Comma-separated. Up to 6 values, max 2,000,000 each."><input id="s" value={sizes} onChange={(e) => setSizes(e.target.value)} /></Field>
        <Field id="rp" label="Repeats" hint="More repeats give steadier results."><input id="rp" type="number" min="1" max="50" value={reps} onChange={(e) => setReps(e.target.value)} /></Field></div>
      <Notice kind="error">{err}</Notice><div><button className="btn primary" disabled={busy}>{busy ? "Running test…" : "Run Benchmark"}</button></div></form>
    {!res && !busy && <p className="muted">No benchmark yet. Run the test to see results.</p>}
    {res && <>
      <div className="metrics"><Metric label="CPU Time" value={t(last.cpu_ms.median)} hint={`For ${last.n.toLocaleString()} guides (median)`} />
        <Metric label="GPU Time" value={hasGpu ? t(last.gpu.total_ms.median) : "Not available"} hint={hasGpu ? "Includes copying data" : "No GPU in this run"} />
        <Metric label="Speedup" value={hasGpu ? last.speedup_total.toFixed(1) + "×" : "-"} hint="How many times faster one mode is than the other." /></div>
      {hasGpu && !last.verified && <Notice kind="error">GPU and CPU results did not match. Do not trust the GPU timings.</Notice>}
      <section className="panel"><h2 style={{ marginBottom: 12 }}>Time by number of guides</h2><div style={{ height: 280 }}><ResponsiveContainer><LineChart data={chart}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="n" type="number" scale="log" domain={["dataMin", "dataMax"]} /><YAxis scale="log" allowDataOverflow domain={[(m) => Math.max(m / 2, 0.001), (m) => m * 2]} unit=" ms" width={70} /><Tooltip /><Legend />
        <Line dataKey="CPU" stroke="#3269D6" /><Line dataKey="GPU" stroke="#14A89A" /></LineChart></ResponsiveContainer></div><p className="hint">Lower is faster. Both axes use a log scale.</p></section>
      <Section title="Hardware and Technical Details"><div className="stack">
        <p className="small">Measured {res.timestamp}. {res.repeats} repeats after one warm-up run. Input: {res.input}.</p>
        <div className="scroll"><table><thead><tr><th>Guides</th><th>CPU median</th><th>CPU std dev</th>{hasGpu && <><th>GPU kernel</th><th>Data copy</th><th>GPU total</th></>}</tr></thead>
          <tbody>{res.rows.map((x) => <tr key={x.n}><td>{x.n.toLocaleString()}</td><td>{t(x.cpu_ms.median)}</td><td>{t(x.cpu_ms.std)}</td>{hasGpu && (x.gpu ? <><td>{t(x.gpu.kernel_ms.median)}</td><td>{t(x.gpu.h2d_ms.median + x.gpu.d2h_ms.median)}</td><td>{t(x.gpu.total_ms.median)}</td></> : <td colSpan="3">-</td>)}</tr>)}</tbody></table></div>
        <p className="small muted">CPU: {res.hardware.cpu} ({res.hardware.cpu_cores} cores) · GPU: {res.hardware.gpu.available ? `${res.hardware.gpu.name} via ${res.hardware.gpu.framework}` : "not available"} · {Object.entries(res.software).map(([k, v]) => `${k} ${v}`).join(" · ")}</p></div></Section></>}</div>;
}
