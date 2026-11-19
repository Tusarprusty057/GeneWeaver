import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, download } from "../api.js";
import { Empty, Loading, Notice, PageHeader, Pager, Section, Status, fmt } from "../ui.jsx";

export default function History() {
  const [q, setQ] = useState({ search: "", status: "", mode: "", date_from: "", date_to: "", order: "desc" });
  const [page, setPage] = useState(1), [data, setData] = useState(null), [err, setErr] = useState(""), [del, setDel] = useState(null);
  const dlg = useRef();
  const load = () => {
    setErr("");
    const p = new URLSearchParams({ ...Object.fromEntries(Object.entries(q).filter(([, v]) => v)), page, size: 10 });
    api("/analyses?" + p).then(setData).catch((e) => setErr(e.message));
  };
  useEffect(load, [q, page]);
  useEffect(() => { if (del) dlg.current.showModal(); }, [del]);
  const set = (k) => (e) => { setPage(1); setQ({ ...q, [k]: e.target.value }); };
  async function confirmDelete() {
    try { await api("/analyses/" + del.id, { method: "DELETE" }); } catch (e) { setErr(e.message); }
    dlg.current.close(); setDel(null); load();
  }
  const filtered = Object.entries(q).some(([k, v]) => v && !(k === "order" && v === "desc"));
  return <div className="stack-lg"><PageHeader title="Analysis History" subtitle="Open, export or delete your past analyses." action={<Link className="btn primary" to="/analysis/new">New Analysis</Link>} />
    <div className="stack"><div className="row"><div><label htmlFor="s">Search</label><input id="s" placeholder="Name or ID" value={q.search} onChange={set("search")} /></div>
      <div><label htmlFor="st">Status</label><select id="st" value={q.status} onChange={set("status")}><option value="">All</option><option value="completed">Completed</option><option value="running">Running</option><option value="pending">Waiting</option><option value="failed">Failed</option></select></div></div>
      <Section title="More filters"><div className="row">
        <div><label htmlFor="md">Processed on</label><select id="md" value={q.mode} onChange={set("mode")}><option value="">All</option><option value="cpu">CPU</option><option value="gpu">GPU</option></select></div>
        <div><label htmlFor="df">From date</label><input id="df" type="date" value={q.date_from} onChange={set("date_from")} /></div>
        <div><label htmlFor="dt">To date</label><input id="dt" type="date" value={q.date_to} onChange={set("date_to")} /></div>
        <div><label htmlFor="o">Sort</label><select id="o" value={q.order} onChange={set("order")}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></div></div></Section></div>
    {err && <Notice kind="error">{err} <button className="btn sm" onClick={load}>Try again</button></Notice>}
    <section className="panel">{!data ? (err ? null : <Loading />) : data.items.length === 0
      ? (filtered ? <Empty title="No matching analyses." text="Try a different search or filter." /> : <Empty title="No analyses yet." text="Upload a DNA sequence to start your first analysis." action={<Link className="btn primary" to="/analysis/new">Start Analysis</Link>} />)
      : <><div className="scroll"><table><thead><tr><th>ID</th><th>Analysis</th><th>Date</th><th>Candidates</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{data.items.map((a) => <tr key={a.id}><td>#{a.id}</td><td><Link to={`/analysis/${a.id}`}>{a.name}</Link></td><td>{fmt(a.created_at)}</td><td>{a.status === "completed" ? a.n_candidates.toLocaleString() : "-"}</td><td><Status s={a.status} /></td>
          <td><div className="inline"><Link className="btn sm" to={`/analysis/${a.id}`}>Open</Link>
            {a.status === "completed" && a.type !== "alignment" && <button className="btn sm" onClick={() => download(`/analyses/${a.id}/export.csv`, `analysis_${a.id}.csv`).catch((e) => setErr(e.message))}>CSV</button>}
            <button className="btn sm danger" onClick={() => setDel(a)}>Delete</button></div></td></tr>)}</tbody></table></div>
        <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} /></>}</section>
    <dialog ref={dlg} onClose={() => setDel(null)}><h2>Delete this analysis?</h2><p className="muted" style={{ margin: "8px 0 20px" }}>“{del?.name}” and its results will be removed. This cannot be undone.</p>
      <div className="inline" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => dlg.current.close()}>Cancel</button><button className="btn danger" onClick={confirmDelete}>Delete</button></div></dialog></div>;
}
