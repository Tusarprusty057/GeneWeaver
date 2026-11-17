import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, Link, useNavigate } from "react-router-dom";
import { api, hasToken, setToken } from "./api.js";
import { Logo } from "./ui.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewAnalysis from "./pages/NewAnalysis.jsx";
import Alignment from "./pages/Alignment.jsx";
import Benchmark from "./pages/Benchmark.jsx";
import History from "./pages/History.jsx";
import Analysis from "./pages/Analysis.jsx";
import Docs from "./pages/Docs.jsx";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function Shell() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(document.documentElement.dataset.theme);
  const flip = () => { const t = theme === "dark" ? "light" : "dark"; setTheme(t); document.documentElement.dataset.theme = t; localStorage.setItem("gw_theme", t); };
  const links = [["/dashboard", "Overview"], ["/analysis/new", "New Analysis"], ["/alignment", "Sequence Alignment"],
    ["/benchmark", "Benchmarking"], ["/history", "Analysis History"], ["/documentation", "Documentation"]];
  return <div className="shell">
    <aside className="side"><Logo />
      <nav>{links.map(([to, l]) => <NavLink key={to} to={to} end>{l}</NavLink>)}</nav>
      <div className="side-foot"><div className="muted">{user.name}<br />{user.email}</div>
        <button className="btn" onClick={flip}>{theme === "dark" ? "Light" : "Dark"} mode</button>
        <button className="btn" onClick={logout}>Log out</button></div></aside>
    <main className="main"><Outlet /></main></div>;
}

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading…</p>;
  return user ? <Shell /> : <Navigate to="/login" replace />;
}

const NotFound = () => <div className="center"><h1>404</h1><p>Page not found.</p><Link className="btn primary" to="/">Go home</Link></div>;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasToken());
  const nav = useNavigate();
  useEffect(() => { if (hasToken()) api("/auth/me").then(setUser).catch(() => setToken(null)).finally(() => setLoading(false)); }, []);
  const signIn = (r) => { setToken(r.token); setUser(r.user); nav("/dashboard"); };
  const logout = () => { setToken(null); setUser(null); nav("/"); };
  return <AuthCtx.Provider value={{ user, loading, signIn, logout }}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />
      <Route path="/documentation" element={<Docs />} />
      <Route element={<Protected />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analysis/new" element={<NewAnalysis />} />
        <Route path="/analysis/:id" element={<Analysis />} />
        <Route path="/alignment" element={<Alignment />} />
        <Route path="/benchmark" element={<Benchmark />} />
        <Route path="/history" element={<History />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes></AuthCtx.Provider>;
}
