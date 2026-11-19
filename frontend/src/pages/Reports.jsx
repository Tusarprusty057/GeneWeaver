import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, download } from "../api.js";
import { Empty, Loading, Notice, PageHeader, Pager, fmt } from "../ui.jsx";

export default function Reports() {
  const [page, setPage] = useState(1), [data, setData] = useState(null), [err, setErr] = useState("");
  useEffect(() => { api(`/analyses?status=completed&page=${page}&size=10`).then(setData).catch((e) => setErr(e.message)); }, [page]);
  const dl = (a, path, ext) => download(`/analyses/${a.id}/${path}`, `${path.split(".")[0]}_${a.id}.${ext}`).catch((e) => setErr(e.message));
  return <div className="stack-lg"><PageHeader title="Saved Reports" subtitle="Download a report for any completed analysis." />
    <Notice kind="error">{err}</Notice>
    <section className="panel">{!data ? (err ? null : <Loading />) : data.items.length === 0
      ? <Empty title="No reports yet." text="Finish an analysis and its report will appear here." action={<Link className="btn primary" to="/analysis/new">Start Analysis</Link>} />
      : <><div className="scroll"><table><thead><tr><th>Analysis</th><th>Date</th><th>Download</th></tr></thead>
        <tbody>{data.items.map((a) => <tr key={a.id}><td><Link to={`/analysis/${a.id}`}>{a.name}</Link></td><td>{fmt(a.created_at)}</td>
          <td><div className="inline"><button className="btn sm" onClick={() => dl(a, "report.pdf", "pdf")}>PDF report</button>
            {a.type !== "alignment" && <button className="btn sm" onClick={() => dl(a, "export.csv", "csv")}>CSV</button>}<button className="btn sm" onClick={() => dl(a, "export.json", "json")}>JSON</button></div></td></tr>)}</tbody></table></div>
        <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} /></>}</section></div>;
}
