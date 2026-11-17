import { useEffect, useState } from "react";
import { api, download } from "../api.js";
import { Err, Pager } from "../ui.jsx";
import { AnalysisTable } from "./Dashboard.jsx";
import { Link } from "react-router-dom";

export default function History() {
  const [q, setQ] = useState({ search: "", status: "", mode: "", date_from: "", date_to: "", order: "desc" });
  const [page, setPage] = useState(1), [data, setData] = useState(null), [err, setErr] = useState("");
  const load = () => {
    const p = new URLSearchParams({ ...Object.fromEntries(Object.entries(q).filter(([, v]) => v)), page, size: 10 });
    api("/analyses?" + p).then(setData).catch((e) => setErr(e.message));
  };
  useEffect(load, [q, page]);
  const set = (k) => (e) => { setPage(1); setQ({ ...q, [k]: e.target.value }); };
  async function del(a) {
    if (!window.confirm(`Delete analysis #${a.id} "${a.name}"? This cannot be undone.`)) return;
    try { await api("/analyses/" + a.id, { method: "DELETE" }); load(); } catch (e) { setErr(e.message); }
  }
  return <div><h1>Analysis History</h1><Err msg={err} />
    <div className="card"><div className="row">
      <div><label htmlFor="s">Search name or ID</label><input id="s" value={q.search} onChange={set("search")} /></div>
      <div><label htmlFor="st">Status</label><select id="st" value={q.status} onChange={set("status")}><option value="">All</option><option>completed</option><option>running</option><option>pending</option><option>failed</option></select></div>
      <div><label htmlFor="md">Mode used</label><select id="md" value={q.mode} onChange={set("mode")}><option value="">All</option><option>cpu</option><option>gpu</option></select></div>
      <div><label htmlFor="df">From</label><input id="df" type="date" value={q.date_from} onChange={set("date_from")} /></div>
      <div><label htmlFor="dt">To</label><input id="dt" type="date" value={q.date_to} onChange={set("date_to")} /></div>
      <div><label htmlFor="o">Sort</label><select id="o" value={q.order} onChange={set("order")}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></div></div></div>
    <div className="card">{!data ? <p className="muted">Loading…</p> : data.items.length === 0 ? <p className="muted">No analyses match. <Link to="/analysis/new">Create one.</Link></p> : <>
      <AnalysisTable items={data.items} />
      <div className="scroll" style={{ marginTop: ".6rem" }}>{data.items.map((a) => <span key={a.id} style={{ marginRight: "1rem", whiteSpace: "nowrap" }}>#{a.id}:
        {a.status === "completed" && <> <button className="btn" onClick={() => download(`/analyses/${a.id}/export.csv`, `analysis_${a.id}.csv`).catch((e) => setErr(e.message))}>CSV</button></>}
        {" "}<button className="btn danger" onClick={() => del(a)}>Delete</button></span>)}</div>
      <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} /></>}</div></div>;
}
