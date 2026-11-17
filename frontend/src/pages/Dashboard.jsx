import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Badge, Err, Stat, fmt } from "../ui.jsx";
import { useAuth } from "../App.jsx";

export function AnalysisTable({ items }) {
  return <div className="scroll"><table><thead><tr><th>ID</th><th>Name</th><th>Date</th><th>Length</th><th>Candidates</th><th>Mode</th><th>Status</th><th></th></tr></thead>
    <tbody>{items.map((a) => <tr key={a.id}><td>#{a.id}</td><td>{a.name}</td><td>{fmt(a.created_at)}</td><td>{a.seq_length}</td>
      <td>{a.status === "completed" ? a.n_candidates : "-"}</td><td>{a.mode_used || a.execution_mode}</td><td><Badge s={a.status} /></td>
      <td><Link to={`/analysis/${a.id}`}>Open</Link></td></tr>)}</tbody></table></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [st, setSt] = useState(null), [recent, setRecent] = useState(null), [err, setErr] = useState("");
  const load = () => Promise.all([api("/stats"), api("/analyses?size=5")]).then(([s, r]) => { setSt(s); setRecent(r.items); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  return <div><h1>Welcome back, {user.name}</h1><Err msg={err} />
    {err && <button className="btn" onClick={load}>Retry</button>}
    {st && <div className="grid4"><Stat label="Total analyses" value={st.total_analyses} /><Stat label="Bases processed" value={st.total_bases.toLocaleString()} />
      <Stat label="Candidates identified" value={st.total_candidates.toLocaleString()} /><Stat label="Last 7 days" value={st.recent_7d} /></div>}
    <div className="row" style={{ marginBottom: "1rem" }}><Link className="btn primary" to="/analysis/new">New Analysis</Link>
      <Link className="btn" to="/alignment">Run Sequence Alignment</Link><Link className="btn" to="/benchmark">View Benchmark Results</Link></div>
    <div className="card"><h2>Recent analyses</h2>
      {!recent ? <p className="muted">Loading…</p> : recent.length === 0 ? <p className="muted">No analyses yet. <Link to="/analysis/new">Start your first one.</Link></p> : <AnalysisTable items={recent} />}</div></div>;
}
