import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Field, Notice, PageHeader, SAMPLE_QRY, SAMPLE_REF, Section, dnaError, inspectDna } from "../ui.jsx";

const MAX = 5 * 1024 * 1024;
const TYPES = [["crispr", "Find CRISPR targets", "Search the sequence for guide sites next to a PAM."],
  ["alignment", "Compare DNA sequences", "Align your sequence with a second one."],
  ["full", "Run a complete analysis", "Do both in one run."]];
const label = (t) => TYPES.find((x) => x[0] === t)[1];

export default function NewAnalysis({ fixedType }) {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [hw, setHw] = useState(null);
  const [f, setF] = useState({ name: "", reference: "", query: "", type: fixedType || "crispr", guide_len: 20, pam: "NGG", strands: "both", compare_guide: "",
    execution_mode: localStorage.getItem("gw_exec") || "auto", align_mode: "local", match: 2, mismatch: 1, gap_open: 2, gap_extend: 0.5 });
  const [file, setFile] = useState(null), [fileErr, setFileErr] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { api("/hardware").then(setHw).catch(() => {}); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const gpu = hw?.hardware.gpu;
  const ref = inspectDna(f.reference), qry = inspectDna(f.query);
  const needQ = f.type !== "crispr";
  const refOk = !ref.empty && !dnaError(ref), qryOk = !needQ || (!qry.empty && !dnaError(qry));
  const exec = f.execution_mode === "gpu" && !gpu?.available ? "auto" : f.execution_mode;

  function onFile(e) {
    const fl = e.target.files[0]; if (!fl) return;
    if (fl.size > MAX) return setFileErr("This file is larger than 5 MB.");
    if (!/\.(fa|fasta|fna|txt)$/i.test(fl.name)) return setFileErr("Use a .fasta, .fa, .fna or .txt file.");
    fl.text().then((t) => { setFileErr(""); setFile({ name: fl.name, size: fl.size }); setF((p) => ({ ...p, reference: t, name: p.name || fl.name.replace(/\.[^.]+$/, "") })); });
  }
  async function start() {
    setErr(""); setBusy(true);
    try {
      const body = { name: f.name.trim() || "Untitled analysis", reference: f.reference, query: needQ ? f.query : null, analysis_type: f.type, guide_len: +f.guide_len, pam: f.pam, strands: f.strands,
        compare_guide: f.compare_guide.trim() || null, execution_mode: exec, align_mode: f.align_mode, match: +f.match, mismatch: +f.mismatch, gap_open: +f.gap_open, gap_extend: +f.gap_extend };
      nav("/analysis/" + (await api("/analyses", { method: "POST", body })).id);
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  const steps = ["Add DNA", "Choose analysis", "Review"];
  return <div>
    <PageHeader title={fixedType ? "CRISPR Scanner" : "New Analysis"} subtitle={fixedType ? "Find CRISPR target candidates in a DNA sequence." : "Three short steps. You can change everything before you start."} />
    <ol className="stepper" style={{ padding: 0 }} aria-label="Progress">{steps.map((s, i) => <li key={s} className={step === i + 1 ? "on" : step > i + 1 ? "done" : ""} aria-current={step === i + 1 ? "step" : undefined}><b>{i + 1}</b>{s}</li>)}</ol>

    {step === 1 && <section className="panel stack"><div><h2>Add Your DNA Sequence</h2><p className="muted small">Upload a FASTA file or paste a DNA sequence.</p></div>
      <Field id="rf" label="DNA sequence" required error={!ref.empty && dnaError(ref)} hint="Letters A, C, G, T and N only. FASTA headers (lines starting with >) are fine.">
        <textarea id="rf" value={f.reference} onChange={set("reference")} placeholder={">my_sequence\nATGGCTAGCTAGGATCC…"} /></Field>
      <div className="row"><Field id="up" label="Or upload a file" error={fileErr} hint="FASTA or text file, up to 5 MB."><input id="up" type="file" accept=".fa,.fasta,.fna,.txt" onChange={onFile} /></Field>
        <div><span className="lbl">Need an example?</span><button type="button" className="btn" onClick={() => { setFile(null); setF({ ...f, reference: SAMPLE_REF, query: SAMPLE_QRY, name: f.name || "Sample analysis" }); }}>Use sample sequence</button></div></div>
      {!ref.empty && !dnaError(ref) && <Notice kind="ok">Your DNA sequence is valid. {file && `${file.name} · ${(file.size / 1024).toFixed(1)} KB · `}{ref.length.toLocaleString()} letters{ref.records > 1 && `. The file has ${ref.records} sequences; only the first one is used.`}</Notice>}
      <div className="btns"><button className="btn primary" disabled={!refOk} onClick={() => setStep(2)}>Continue</button></div></section>}

    {step === 2 && <section className="panel stack">
      {!fixedType && <div><h2>What would you like to analyze?</h2></div>}
      {!fixedType && TYPES.map(([v, t, d]) => <label key={v} className={"choice" + (f.type === v ? " sel" : "")}><input type="radio" name="type" checked={f.type === v} onChange={() => setF({ ...f, type: v })} /><div><b>{t}</b><span>{d}</span></div></label>)}
      {needQ && <Field id="q" label="Second DNA sequence" required error={!qry.empty && dnaError(qry)} hint="The sequence to compare with the first one (up to 10,000 letters each).">
        <textarea id="q" value={f.query} onChange={set("query")} /></Field>}
      <Section title="Advanced Settings" note="Defaults work for most cases"><div className="stack">
        {f.type !== "alignment" && <div className="row">
          <Field id="pm" label="PAM" hint="NGG is used by SpCas9. N means any base."><input id="pm" value={f.pam} onChange={set("pam")} /></Field>
          <Field id="gl" label="Guide length" hint="Usually 20."><input id="gl" type="number" min="10" max="30" value={f.guide_len} onChange={set("guide_len")} /></Field>
          <Field id="st" label="Strands to scan"><select id="st" value={f.strands} onChange={set("strands")}><option value="both">Both</option><option value="forward">Forward only</option><option value="reverse">Reverse only</option></select></Field></div>}
        {f.type !== "alignment" && <Field id="cg" label="Compare guide (optional)" hint="A guide of the same length. Each candidate is scored by how many letters differ."><input id="cg" className="mono" value={f.compare_guide} onChange={set("compare_guide")} /></Field>}
        {needQ && <div className="row">
          <Field id="am" label="Alignment type" hint="Local finds the best matching part. Global aligns everything."><select id="am" value={f.align_mode} onChange={set("align_mode")}><option value="local">Local</option><option value="global">Global</option></select></Field>
          {[["match", "Match reward"], ["mismatch", "Mismatch penalty"], ["gap_open", "Gap open penalty"], ["gap_extend", "Gap extend penalty"]].map(([k, l]) => <Field key={k} id={k} label={l}><input id={k} type="number" step="0.1" min="0" value={f[k]} onChange={set(k)} /></Field>)}</div>}
        <Field id="em" label="Processing" hint={gpu ? (gpu.available ? `GPU found: ${gpu.name}.` : "No GPU found. CPU processing will be used.") : ""}>
          <select id="em" value={exec} onChange={set("execution_mode")}><option value="auto">Automatic</option><option value="cpu">CPU</option><option value="gpu" disabled={!gpu?.available}>GPU{gpu?.available ? "" : " (not available)"}</option></select></Field></div></Section>
      <div className="btns"><button className="btn" onClick={() => setStep(1)}>Back</button><button className="btn primary" disabled={!qryOk} onClick={() => setStep(3)}>Continue</button></div></section>}

    {step === 3 && <section className="panel stack"><h2>Review</h2>
      <Field id="nm" label="Analysis name" hint="Helps you find it later."><input id="nm" value={f.name} onChange={set("name")} placeholder="Untitled analysis" /></Field>
      <dl className="sum"><dt>Analysis</dt><dd>{label(f.type)}</dd><dt>DNA sequence</dt><dd>{ref.length.toLocaleString()} letters{file && ` (${file.name})`}</dd>
        {needQ && <><dt>Second sequence</dt><dd>{qry.length.toLocaleString()} letters</dd></>}
        {f.type !== "alignment" && <><dt>CRISPR settings</dt><dd>{f.guide_len}-letter guide, PAM {f.pam.toUpperCase()}, {f.strands} strand{f.strands === "both" ? "s" : ""}</dd></>}
        {needQ && <><dt>Alignment</dt><dd>{f.align_mode}; match {f.match}, mismatch −{f.mismatch}, gap −{f.gap_open}/−{f.gap_extend}</dd></>}
        <dt>Processing</dt><dd>{{ auto: "Automatic", cpu: "CPU", gpu: "GPU" }[exec]}</dd></dl>
      <Notice kind="error">{err}</Notice>
      <div className="btns"><button className="btn" onClick={() => setStep(2)}>Back</button><button className="btn primary" disabled={busy} onClick={start}>{busy ? "Starting…" : "Start Analysis"}</button></div></section>}</div>;
}
