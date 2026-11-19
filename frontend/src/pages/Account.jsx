import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Field, Notice, PageHeader, fmt } from "../ui.jsx";

function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem("gw_theme") || "light");
  const [exec, setExec] = useState(localStorage.getItem("gw_exec") || "auto");
  const [gpu, setGpu] = useState(null), [saved, setSaved] = useState("");
  useEffect(() => { api("/hardware").then((h) => setGpu(h.hardware.gpu)).catch(() => {}); }, []);
  const pickTheme = (e) => { setTheme(e.target.value); document.documentElement.dataset.theme = e.target.value; localStorage.setItem("gw_theme", e.target.value); setSaved("Saved."); };
  const pickExec = (e) => { setExec(e.target.value); localStorage.setItem("gw_exec", e.target.value); setSaved("Saved."); };
  return <div className="stack-lg"><PageHeader title="Settings" subtitle="These choices are saved in this browser." />
    <section className="panel stack"><h2>Appearance</h2><Field id="th" label="Theme"><select id="th" value={theme} onChange={pickTheme}><option value="light">Light</option><option value="dark">Dark</option></select></Field></section>
    <section className="panel stack"><h2>Analysis defaults</h2>
      <Field id="ex" label="Default processing" hint={gpu && !gpu.available ? "GPU is not available on this computer, so Automatic will use CPU." : ""}>
        <select id="ex" value={exec} onChange={pickExec}><option value="auto">Automatic</option><option value="cpu">CPU</option><option value="gpu" disabled={gpu && !gpu.available}>GPU</option></select></Field></section>
    <section className="panel stack"><h2>Your data</h2><p className="muted small">Analyses are stored only in your local database. Delete any analysis from Analysis History.</p></section>
    {saved && <Notice kind="ok">{saved}</Notice>}</div>;
}

function Profile() {
  const { user, logout } = useAuth();
  const [f, setF] = useState({ current: "", next: "", confirm: "" }), [errs, setErrs] = useState({}), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setMsg(null);
    const er = {};
    if (!f.current) er.current = "Enter your current password.";
    if (f.next.length < 8) er.next = "Use at least 8 characters.";
    if (f.next !== f.confirm) er.confirm = "Passwords do not match.";
    setErrs(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { await api("/auth/password", { method: "POST", body: { current: f.current, new: f.next } }); setMsg({ k: "ok", t: "Password changed." }); setF({ current: "", next: "", confirm: "" }); }
    catch (x) { setMsg({ k: "error", t: x.message }); } finally { setBusy(false); }
  }
  return <div className="stack-lg"><PageHeader title="Profile" />
    <section className="panel"><dl className="sum"><dt>Name</dt><dd>{user.name}</dd><dt>Email</dt><dd>{user.email}</dd><dt>Member since</dt><dd>{fmt(user.created_at)}</dd></dl></section>
    <form className="panel stack" onSubmit={submit} noValidate><h2>Change password</h2>
      <Field id="cp" label="Current password" error={errs.current}><input id="cp" type="password" autoComplete="current-password" value={f.current} onChange={set("current")} /></Field>
      <Field id="np" label="New password" error={errs.next} hint="At least 8 characters."><input id="np" type="password" autoComplete="new-password" value={f.next} onChange={set("next")} /></Field>
      <Field id="cf" label="Confirm new password" error={errs.confirm}><input id="cf" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></Field>
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}<div><button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button></div></form>
    <div><button className="btn" onClick={logout}>Log out</button></div></div>;
}
export default function Account({ kind }) { return kind === "settings" ? <Settings /> : <Profile />; }
