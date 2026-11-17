const tok = () => localStorage.getItem("gw_token");
function fmtErr(d, fallback) {
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x.loc ? x.loc.slice(1).join(".") + ": " : "") + x.msg).join("; ");
  return fallback;
}
export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (tok()) headers.Authorization = "Bearer " + tok();
  let res;
  try { res = await fetch("/api" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error("API unreachable. Is the backend running on port 8000?"); }
  if (res.status === 204) return null;
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && tok() && !path.startsWith("/auth/login")) { localStorage.removeItem("gw_token"); window.location.href = "/login"; }
    throw new Error(fmtErr(data?.detail, res.statusText));
  }
  return data;
}
export async function download(path, filename) {
  const res = await fetch("/api" + path, { headers: { Authorization: "Bearer " + tok() } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Download failed");
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click(); URL.revokeObjectURL(url);
}
export function setToken(t) { t ? localStorage.setItem("gw_token", t) : localStorage.removeItem("gw_token"); }
export const hasToken = () => !!tok();
