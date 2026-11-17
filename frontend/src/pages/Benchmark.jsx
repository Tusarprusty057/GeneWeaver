import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api.js";
import { Err, Stat } from "../ui.jsx";

const r = (x) => (x == null ? "-" : x.toFixed(3));

export default function Benchmark() {
  const [hw, setHw] = useState(null), [res, setRes] = useState(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [sizes, setSizes] = useState("1000, 10000, 100000, 1000000"), [reps, setReps] = useState(5);
  useEffect(() => { api("/hardware").then(setHw).catch((e) => setErr(e.message)); api("/benchmarks/latest").then(setRes).catch(() => {}); }, []);
  async function run(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { setRes(await api("/benchmark", { method: "POST", body: { sizes: sizes.split(",").map((x) => parseInt(x.trim(), 10)).filter(Boolean), repeats: +reps } })); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  const g = hw?.hardware.gpu, gpuRun = res?.rows.some((x) => x.gpu);
  const chart = res?.rows.map((x) => ({ n: x.n, CPU: x.cpu_ms.median, "GPU kernel": x.gpu?.kernel_ms.median, "GPU end-to-end": x.gpu?.total_ms.median, Speedup: x.speedup_total }));
  return <div><h1>Benchmarking</h1>
    {hw && <div className="grid4"><Stat label="CPU" value={hw.hardware.cpu} /><Stat label="CPU cores" value={hw.hardware.cpu_cores} />
      <Stat label="GPU" value={g.available ? g.name : "Not available"} /><Stat label="GPU framework" value={g.available ? g.framework : "-"} /></div>}
    {g && !g.available && <div className="alert info">GPU not available: {g.reason}. CPU benchmark still works. GPU numbers are never simulated.</div>}
    <form className="card" onSubmit={run}><h2>Configuration</h2>
      <p className="muted">Workload: score N seeded random 20-nt guides (GC count + mismatches vs a reference guide). Same data for CPU and GPU. This is candidate scoring, not GPU dynamic-programming alignment.</p>
      <div className="row"><div><label htmlFor="s">Candidate counts (comma list, up to 6, max 2,000,000)</label><input id="s" value={sizes} onChange={(e) => setSizes(e.target.value)} /></div>
        <div><label htmlFor="rp">Repetitions</label><input id="rp" type="number" min="1" max="50" value={reps} onChange={(e) => setReps(e.target.value)} /></div></div>
      <Err msg={err} /><button className="btn primary" disabled={busy} style={{ marginTop: ".8rem" }}>{busy ? "Running…" : "Run benchmark"}</button></form>
    {res && <><div className="card"><h2>Results ({res.timestamp})</h2><div className="scroll"><table><thead><tr><th>Candidates</th><th>CPU median ms</th><th>CPU std</th>
      {gpuRun && <><th>GPU kernel ms</th><th>GPU transfer ms (H2D+D2H)</th><th>GPU end-to-end ms</th><th>Speedup (e2e)</th><th>Verified</th></>}</tr></thead>
      <tbody>{res.rows.map((x) => <tr key={x.n}><td>{x.n.toLocaleString()}</td><td>{r(x.cpu_ms.median)}</td><td>{r(x.cpu_ms.std)}</td>
        {gpuRun && (x.gpu ? <><td>{r(x.gpu.kernel_ms.median)}</td><td>{r(x.gpu.h2d_ms.median + x.gpu.d2h_ms.median)}</td><td>{r(x.gpu.total_ms.median)}</td><td>{r(x.speedup_total)}×</td><td>{x.verified ? "yes" : "NO"}</td></> : <td colSpan="5">-</td>)}</tr>)}</tbody></table></div>
      <p className="muted">Speedup = CPU median / GPU end-to-end median. Repeats: {res.repeats}. Input: {res.input}. CPU: {res.hardware.cpu}.</p></div>
      <div className="card"><h2>Runtime vs candidate count (ms, log scale)</h2><div style={{ height: 300 }}><ResponsiveContainer><LineChart data={chart}>
        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="n" scale="log" domain={["auto", "auto"]} type="number" /><YAxis scale="log" domain={["auto", "auto"]} /><Tooltip /><Legend />
        <Line dataKey="CPU" stroke="#2864DC" /><Line dataKey="GPU kernel" stroke="#14B8A6" /><Line dataKey="GPU end-to-end" stroke="#E6A23C" /></LineChart></ResponsiveContainer></div></div>
      {gpuRun && <div className="card"><h2>Speedup (end-to-end)</h2><div style={{ height: 240 }}><ResponsiveContainer><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="n" type="number" scale="log" domain={["auto", "auto"]} /><YAxis /><Tooltip /><Line dataKey="Speedup" stroke="#16A36A" /></LineChart></ResponsiveContainer></div></div>}</>}</div>;
}
