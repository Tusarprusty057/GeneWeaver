import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Empty, Loading, Metric, Notice, PageHeader, Status, fmt } from "../ui.jsx";
import { useAuth } from "../auth.jsx";

export function AnalysisTable({ items }) {
  return <div className="scroll"><table><thead><tr><th>Analysis</th><th>Date</th><th>Sequences</th><th>Status</th><th><span className="sr-only" style={{ position: "absolute", left: -9999 }}>Action</span></th></tr></thead>
    <tbody>{items.map((a) => <tr key={a.id}><td><Link to={`/analysis/${a.id}`}>{a.name}</Link></td><td>{fmt(a.created_at)}</td><td>{a.n_records}</td><td><Status s={a.status} /></td>
      <td><Link to={`/analysis/${a.id}`}>View</Link></td></tr>)}</tbody></table></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [st, setSt] = useState(null), [recent, setRecent] = useState(null), [err, setErr] = useState("");
  const load = () => { setErr(""); Promise.all([api("/stats"), api("/analyses?size=5")]).then(([s, r]) => { setSt(s); setRecent(r.items); }).catch((e) => setErr(e.message)); };
  useEffect(load, []);
  return <div className="stack-lg">
    <PageHeader title={`Welcome back, ${user.name.split(" ")[0]}`} subtitle="Here is an overview of your DNA analyses." action={<Link className="btn primary" to="/analysis/new">New Analysis</Link>} />
    {err && <Notice kind="error">{err} <button className="btn sm" onClick={load}>Try again</button></Notice>}
    {!st && !err && <Loading />}
    {st && <div className="metrics"><Metric label="Total analyses" value={st.total_analyses} /><Metric label="DNA bases processed" value={st.total_bases.toLocaleString()} />
      <Metric label="Candidates found" value={st.total_candidates.toLocaleString()} /><Metric label="Last 7 days" value={st.recent_7d} hint="Analyses started" /></div>}
    <section className="panel"><div className="inline" style={{ marginBottom: 12 }}><h2>Recent activity</h2><span className="sp" /><Link to="/history" className="small">View all</Link></div>
      {!recent ? (err ? null : <Loading />) : recent.length === 0
        ? <Empty title="No analyses yet." text="Upload a DNA sequence to start your first analysis." action={<Link className="btn primary" to="/analysis/new">Start Analysis</Link>} />
        : <AnalysisTable items={recent} />}</section></div>;
}
