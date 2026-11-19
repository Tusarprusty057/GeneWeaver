import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, Link, useLocation, useNavigate } from "react-router-dom";
import { AlignJustify, BookOpen, Crosshair, FileText, Gauge, History as HistoryIcon, LayoutDashboard, LogOut, Menu, PlusCircle, Settings as SettingsIcon, User, X } from "lucide-react";
import { api, hasToken, setToken } from "./api.js";
import { AuthCtx, useAuth } from "./auth.jsx";
import { Loading, Logo } from "./ui.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewAnalysis from "./pages/NewAnalysis.jsx";
import Alignment from "./pages/Alignment.jsx";
import Benchmark from "./pages/Benchmark.jsx";
import History from "./pages/History.jsx";
import Analysis from "./pages/Analysis.jsx";
import Reports from "./pages/Reports.jsx";
import Account from "./pages/Account.jsx";
import Docs from "./pages/Docs.jsx";

const NAV = [
  ["Workspace", [["/dashboard", "Overview", LayoutDashboard], ["/analysis/new", "New Analysis", PlusCircle], ["/history", "Analysis History", HistoryIcon]]],
  ["Analysis tools", [["/crispr-scanner", "CRISPR Scanner", Crosshair], ["/alignment", "Sequence Alignment", AlignJustify], ["/benchmark", "Performance Benchmark", Gauge]]],
  ["Data", [["/reports", "Saved Reports", FileText]]],
  ["Help", [["/documentation", "Documentation", BookOpen]]],
  ["Account", [["/settings", "Settings", SettingsIcon], ["/profile", "Profile", User]]]];

function Shell() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return <div className="shell">
    <div className="top"><button aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button><Logo /></div>
    {open && <div className="scrim" onClick={() => setOpen(false)} />}
    <aside className={"side" + (open ? " open" : "")} aria-label="Main navigation">
      <div className="inline"><Logo /><span className="sp" />{open && <button className="btn ghost sm" style={{ width: "auto", color: "#fff" }} aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} /></button>}</div>
      <nav>{NAV.map(([g, items]) => <div key={g}><div className="grp">{g}</div>
        {items.map(([to, label, Icon]) => <NavLink key={to} to={to} end className={({ isActive }) => "nav" + (isActive ? " active" : "")}><Icon size={17} />{label}</NavLink>)}</div>)}</nav>
      <div className="foot"><button className="btn" onClick={logout}><LogOut size={16} />Log out</button></div></aside>
    <main className="main"><Outlet /></main></div>;
}

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="main"><Loading /></div>;
  return user ? <Shell /> : <Navigate to="/login" replace />;
}

const NotFound = () => <div className="auth" style={{ textAlign: "center" }}><h1>Page not found</h1><p className="muted" style={{ margin: "12px 0 20px" }}>The page you want does not exist.</p><Link className="btn primary" to="/">Go to home</Link></div>;

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
        <Route path="/crispr-scanner" element={<NewAnalysis fixedType="crispr" />} />
        <Route path="/analysis/:id" element={<Analysis />} />
        <Route path="/alignment" element={<Alignment />} />
        <Route path="/benchmark" element={<Benchmark />} />
        <Route path="/history" element={<History />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Account kind="settings" />} />
        <Route path="/profile" element={<Account kind="profile" />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes></AuthCtx.Provider>;
}
