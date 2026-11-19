from playwright.sync_api import sync_playwright
import time
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for vp in [{"width":1280,"height":800},{"width":390,"height":800}]:
        pg=b.new_page(viewport=vp)
        pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
        pg.on("pageerror",lambda e: errs.append(str(e)))
        pg.on("response",lambda r: errs.append(f"{r.status} {r.url}") if r.status>=400 and "auth/login" not in r.url else None)
        pg.goto("http://localhost:5173/register")
        pg.fill("#n","Tusar Test"); pg.fill("#e",f"t{int(time.time())}{vp['width']}@x.com"); pg.fill("#p","password123"); pg.fill("#c","password123")
        pg.check("text=I understand"); pg.click("button:has-text('Create account')")
        pg.wait_for_url("**/dashboard"); pg.wait_for_selector("text=No analyses yet.")
        pg.goto("http://localhost:5173/analysis/new")
        pg.click("text=Use sample sequence"); pg.wait_for_selector("text=valid")
        pg.click("button:has-text('Continue')")
        pg.click("text=Run a complete analysis"); pg.click("button:has-text('Continue')")
        pg.click("button:has-text('Start Analysis')")
        pg.wait_for_url("**/analysis/*"); pg.wait_for_selector("text=Candidates found",timeout=15000)
        pg.screenshot(path=f"/tmp/result_{vp['width']}.png",full_page=True)
        assert pg.locator(".aln").count()>=1
        with pg.expect_download() as d: pg.click("button:has-text('PDF report')")
        pg.goto("http://localhost:5173/benchmark"); pg.click("button:has-text('Run Benchmark')"); pg.wait_for_selector("text=CPU Time"); pg.screenshot(path=f"/tmp/bench_{vp['width']}.png",full_page=True)
        pg.goto("http://localhost:5173/history"); pg.wait_for_selector("text=Sample analysis")
        pg.goto("http://localhost:5173/reports"); pg.wait_for_selector("text=PDF report")
        pg.goto("http://localhost:5173/dashboard"); pg.screenshot(path=f"/tmp/dash_{vp['width']}.png")
        assert pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"), "h-scroll "+str(vp)
        pg.close()
    b.close()
print("ERRORS:",errs); print("E2E OK")
