import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Err, Logo } from "../ui.jsx";
import { useAuth } from "../App.jsx";

function strength(p) {
  let s = 0;
  if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export default function Auth({ mode }) {
  const reg = mode === "register";
  const { signIn } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const s = strength(f.password);
  async function submit(e) {
    e.preventDefault(); setErr("");
    if (reg) {
      if (f.password.length < 8) return setErr("Password needs at least 8 characters");
      if (f.password !== f.confirm) return setErr("Passwords do not match");
      if (!f.terms) return setErr("Please accept the terms");
    }
    setBusy(true);
    try { signIn(await api(reg ? "/auth/register" : "/auth/login", { method: "POST", body: reg ? { name: f.name, email: f.email, password: f.password } : { email: f.email, password: f.password } })); }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  return <div className="auth"><div style={{ textAlign: "center", marginBottom: "1rem" }}><Logo /></div>
    <form className="card" onSubmit={submit}><h1>{reg ? "Create account" : "Sign in"}</h1>
      {reg && <><label htmlFor="n">Full name</label><input id="n" required value={f.name} onChange={set("name")} /></>}
      <label htmlFor="e">Email</label><input id="e" type="email" required value={f.email} onChange={set("email")} />
      <label htmlFor="p">Password</label><input id="p" type={show ? "text" : "password"} required value={f.password} onChange={set("password")} />
      {reg && <><div className="meter"><i style={{ width: s * 20 + "%", background: s < 3 ? "var(--err)" : s < 4 ? "var(--warn)" : "var(--ok)" }} /></div>
        <label htmlFor="c">Confirm password</label><input id="c" type={show ? "text" : "password"} required value={f.confirm} onChange={set("confirm")} /></>}
      <label><input type="checkbox" checked={show} onChange={() => setShow(!show)} /> Show password</label>
      {reg && <label><input type="checkbox" checked={f.terms} onChange={set("terms")} /> I accept the terms of use (educational tool, no clinical claims)</label>}
      <Err msg={err} />
      <button className="btn primary" disabled={busy} style={{ width: "100%", marginTop: ".8rem" }}>{busy ? "Please wait…" : reg ? "Register" : "Sign in"}</button>
      <p className="muted">{reg ? <>Have account? <Link to="/login">Sign in</Link></> : <>No account? <Link to="/register">Register</Link></>}</p>
      {!reg && <p className="muted">Forgot password: not available in this local build. Register a new account.</p>}
    </form></div>;
}
