import { Link } from "react-router-dom";
export const Err = ({ msg }) => msg ? <div className="alert err" role="alert">{msg}</div> : null;
export const Stat = ({ label, value }) => <div className="stat"><div className="muted">{label}</div><div className="big">{value}</div></div>;
export const Badge = ({ s }) => <span className={"badge " + s}>{s}</span>;
export const fmt = (d) => d ? new Date(d).toLocaleString() : "-";
export const Logo = () => <Link to="/" className="logo">🧬 Gene<b>Weaver</b></Link>;

export function AlignStats({ a }) {
  return <div className="grid4">
    <Stat label="Score" value={a.score} /><Stat label="Identity" value={a.identity + "%"} />
    <Stat label="Length" value={a.length} /><Stat label="Matches" value={a.matches} />
    <Stat label="Mismatches" value={a.mismatches} /><Stat label="Gaps" value={a.gaps} />
    <Stat label="Ref coords" value={a.length ? `${a.ref_start}-${a.ref_end}` : "-"} />
    <Stat label="Query coords" value={a.length ? `${a.query_start}-${a.query_end}` : "-"} /></div>;
}

export function AlignView({ a }) {
  if (!a || !a.length) return <p className="muted">No alignment found (no positive-scoring match).</p>;
  const W = 60, starts = [];
  for (let i = 0; i < a.length; i += W) starts.push(i);
  const cls = (r, q) => (r === "-" || q === "-" ? "g" : r === q ? "m" : "x");
  const row = (str, i) => [...str.slice(i, i + W)].map((ch, k) => <span key={k} className={cls(a.ref_aln[i + k], a.query_aln[i + k])}>{ch}</span>);
  return <div>
    <div className="legend"><span className="m">match</span><span className="x">mismatch</span><span className="g">gap (insertion/deletion)</span></div>
    <div className="aln" tabIndex={0} aria-label="Sequence alignment">
      {starts.map((i) => <div key={i} className="blk">
        <div>Ref&nbsp;&nbsp;{row(a.ref_aln, i)}</div>
        <div className="mid">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{a.midline.slice(i, i + W).replace(/ /g, "\u00a0")}</div>
        <div>Qry&nbsp;&nbsp;{row(a.query_aln, i)}</div></div>)}
    </div></div>;
}

export function Pager({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="pager"><button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
    <span>Page {page} / {pages} ({total} rows)</span>
    <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div>;
}
