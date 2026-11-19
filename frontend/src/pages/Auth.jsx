import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Field, Logo, Notice } from "../ui.jsx";
import { useAuth } from "../auth.jsx";

const score = (p) => [p.length >= 8, p.length >= 12, /[A-Z]/.test(p) && /[a-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;

export default function Auth({ mode }) {
  const reg = mode === "register";
  const { signIn } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [show, setShow] = useState(false), [errs, setErrs] = useState({}), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const s = score(f.password);
  async function submit(e) {
    e.preventDefault(); setMsg("");
    const er = {};
    if (reg && !f.name.trim()) er.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = "Enter a valid email address.";
    if (reg && f.password.length < 8) er.password = "Use at least 8 characters.";
    if (!reg && !f.password) er.password = "Enter your password.";
    if (reg && f.password !== f.confirm) er.confirm = "Passwords do not match.";
    if (reg && !f.terms) er.terms = "Please accept the terms to continue.";
    setErrs(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { signIn(await api(reg ? "/auth/register" : "/auth/login", { method: "POST", body: reg ? { name: f.name, email: f.email, password: f.password } : { email: f.email, password: f.password } })); }
    catch (x) { setMsg(x.message === "Email already registered" ? "This email already has an account. Try signing in." : x.message); setBusy(false); }
  }
  return <div className="auth"><div style={{ marginBottom: 24 }}><Logo /></div>
    <form className="panel stack" onSubmit={submit} noValidate><div><h1>{reg ? "Create your account" : "Sign in"}</h1>
      <p className="muted small" style={{ marginTop: 4 }}>{reg ? "It takes less than a minute." : "Welcome back."}</p></div>
      {reg && <Field id="n" label="Full name" required error={errs.name}><input id="n" autoComplete="name" value={f.name} onChange={set("name")} /></Field>}
      <Field id="e" label="Email" required error={errs.email}><input id="e" type="email" autoComplete="email" value={f.email} onChange={set("email")} /></Field>
      <Field id="p" label="Password" required error={errs.password} hint={reg ? "At least 8 characters." : ""}>
        <input id="p" type={show ? "text" : "password"} autoComplete={reg ? "new-password" : "current-password"} value={f.password} onChange={set("password")} />
        {reg && f.password && <div className="meter" aria-hidden><i style={{ width: s * 20 + "%", background: s < 3 ? "var(--err)" : s < 4 ? "var(--warn)" : "var(--ok)" }} /></div>}</Field>
      {reg && <Field id="c" label="Confirm password" required error={errs.confirm}><input id="c" type={show ? "text" : "password"} autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></Field>}
      <label className="inline" style={{ fontWeight: 400 }}><input type="checkbox" checked={show} onChange={() => setShow(!show)} /> Show password</label>
      {reg && <div className={"field" + (errs.terms ? " invalid" : "")}><label className="inline" style={{ fontWeight: 400 }}><input type="checkbox" checked={f.terms} onChange={set("terms")} /> I understand this is a learning and research tool.</label>{errs.terms && <div className="ferr">{errs.terms}</div>}</div>}
      <Notice kind="error">{msg}</Notice>
      <button className="btn primary" disabled={busy} style={{ width: "100%" }}>{busy ? "Please wait…" : reg ? "Create account" : "Sign in"}</button>
      <p className="muted small">{reg ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New here? <Link to="/register">Create an account</Link>. Password reset is not available in this local version.</>}</p>
    </form></div>;
}
