// ?selftest&ch=N (N = 3..10): play one story chapter headless in auto mode (dialogue/cutscenes resolve instantly, fights are won,
// roam parts are solved by the chapter's autoSolve), and report what breaks. Results -> console + window.SELFTEST.
export async function run(D) {
  const out = [], g = () => D.get();
  const log = (ok, name, info = "") => { out.push(`${ok ? "PASS" : "FAIL"} ${name} ${info}`); console.log(`SELFTEST ${ok ? "PASS" : "FAIL"} ${name} ${info}`); };
  const errs = []; const trace = e => (e && e.stack ? e.stack.split(/\r?\n/).slice(1, 3).map(x => x.trim().replace(/https?:\/\/[^/]+\/game\//, "")).join(" <- ") : "");
  const holes = () => { const bad = []; const walk = (o, path) => { (o.children || []).forEach((c, i) => { if (!c) bad.push(`${path}/${o.name || o.type}#${o.id}[${i}/${o.children.length}]`); else walk(c, `${path}/${o.name || o.type}`); }); }; walk(D.scene, ""); return bad.slice(0, 3).join(" ; "); };
  addEventListener("error", e => { if (!errs.some(x => x.startsWith(e.message))) errs.push(e.message + " @ " + trace(e.error) + " | holes: " + holes() + " | mode " + g().mode); });
  addEventListener("unhandledrejection", e => errs.push(String(e.reason && e.reason.stack || e.reason)));
  const n = g().chap;
  try {
    log(g().level && typeof g().level.script === "function", `chapter ${n} loaded`, `mode ${g().mode}`);
    const t0 = performance.now(); let seenRoam = false, seenFight = false;
    while (g().mode !== "result" && performance.now() - t0 < 150000) {
      if (g().roaming) seenRoam = true; if (g().mode === "fight") seenFight = true;
      if (document.querySelector(".pill") && /Story error/.test(document.body.innerText)) break;
      await new Promise(r => setTimeout(r, 50));
    }
    const err = (document.body.innerText.match(/Story error: .*/) || [""])[0];
    log(g().mode === "result", `chapter ${n} plays through to the result screen`, `mode ${g().mode} ${err} roam ${seenRoam} fight ${seenFight} ${((performance.now() - t0) / 1000).toFixed(1)}s`);
    const key = Object.keys(localStorage).find(k => k.startsWith("monadverse:")), sv = key ? JSON.parse(localStorage.getItem(key)) : {};
    log((sv.done || []).includes(n) && sv.chapter >= n + 1, `chapter ${n} is saved as done`, JSON.stringify({ done: sv.done, chapter: sv.chapter, badges: sv.badges }));
    log(/Chapter \d+ complete/.test(document.getElementById("resTitle").textContent), "result screen shows", document.getElementById("resTitle").textContent);
  } catch (e) { log(false, "EXCEPTION", e.stack || e); }
  log(errs.length === 0, "no runtime errors", errs.join(" | "));
  window.SELFTEST = out; console.log("SELFTEST DONE", out.filter(l => l.startsWith("FAIL")).length, "failures");
}
