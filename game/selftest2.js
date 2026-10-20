// ?selftest&ch=2 : play chapter 2 headless end to end and report what breaks. Results -> console + window.SELFTEST.
export async function run(D) {
  const out = [], g = () => D.get(), P = () => g().player, pos = () => P().pos.clone(), F = () => g().flow;
  const log = (ok, name, info = "") => { out.push(`${ok ? "PASS" : "FAIL"} ${name} ${info}`); console.log(`SELFTEST ${ok ? "PASS" : "FAIL"} ${name} ${info}`); };
  const errs = []; addEventListener("error", e => errs.push(e.message)); addEventListener("unhandledrejection", e => errs.push(String(e.reason)));
  const at = (x, z, y = 0) => { P().teleport(x, y + 2, z); D.sim({}, 0.6); };
  const face = (x, z) => { const p = pos(); g().rig.yaw = Math.atan2(x - p.x, z - p.z) + Math.PI; };
  const talkTo = (x, z) => { at(x + 2.5, z + 2.5); D.talk(); };
  try {
    at(0, 18); log(P().grounded && g().mode === "play", "grounded at spawn", `feet ${P().feet().toFixed(2)} mode ${g().mode}`);
    // walk each path out of camp
    for (const [name, x, z] of [["to glade", -40, 0], ["to grove", 40, 0], ["to falls", 2, -50]]) {
      at(0, 10); face(x, z); const a = pos(); D.sim({ mz: 1, run: true }, 2.5); log(pos().distanceTo(a) > 25, `path ${name}`, `moved ${pos().distanceTo(a).toFixed(1)}`);
    }
    // Moyaki: ask, three spices (one on a rock), done
    talkTo(-7, 1.5); log(F().heroes.moyaki === "task", "moyaki gives the spice task", F().heroes.moyaki);
    for (const [x, y, z] of [[50, 0, -10], [66, 0, 12], [72, 3, -6]]) { at(x, z, y); }
    log(F().got.spice === 3, "three spices collected", `${F().got.spice}/3`);
    talkTo(-7, 1.5); log(F().heroes.moyaki === "done", "moyaki won over", F().heroes.moyaki);
    // Mouch: race timeout resets, then a clean run
    talkTo(-52, 6); log(F().heroes.mouch === "task", "mouch gives the race", F().heroes.mouch);
    const RINGS = [[-56, 3, -10], [-70, 4.5, -14], [-82, 3, 0], [-72, 6.2, 12], [-58, 3.2, 10]];
    { const [x, y, z] = RINGS[0]; P().teleport(x, y - 2, z); D.sim({}, 0.05); const got1 = F().got.ring; at(-64, 20); D.sim({}, 31); log(got1 === 1 && F().got.ring === 0, "race times out and resets", `after 1 ring ${got1}, after 31 s ${F().got.ring}`); }
    for (const [x, y, z] of RINGS) { P().teleport(x, y - 2, z); D.sim({}, 0.05); }
    log(F().got.ring === 5, "five rings in time", `${F().got.ring}/5`);
    D.sim({}, 0.6); talkTo(-52, 6); log(F().heroes.mouch === "done", "mouch won over", F().heroes.mouch);
    // the high ring is really reachable with a jump from the ground
    { const [x, y, z] = RINGS[3]; at(x, z + 0.01); let top = 0; D.sim({ jumpPressed: true }, 0.01); for (let i = 0; i < 40; i++) { D.sim({}, 1 / 60); top = Math.max(top, P().feet() + 2); } log(top > y - 2.6, "high ring reachable by jumping", `body centre peaks ${top.toFixed(1)} vs ring ${y}`); }
    // Salmonad: climb the falls steps to the ledge for the map
    talkTo(0, -64); log(F().heroes.salmonad === "task", "salmonad gives the map task", F().heroes.salmonad);
    { const route = [[-4, -60, 2.5], [-12, -62, 5], [-20, -68, 7.5], [-24, -75, 10], [-16, -77, 12.5], [-12, -85, 15]];
      at(-4, -52); let ok = 0;
      for (let i = 0; i < route.length; i++) {
        const [x, z, h] = route[i]; face(x, z);
        D.sim({ mz: 1, run: true }, 0.12); D.sim({ mz: 1, run: true, jumpPressed: true }, 0.01); D.sim({ mz: 1, run: true, jumpPressed: true }, 0.25);
        let tt = 0; while (tt < 2.5) { const q = pos(), close = Math.hypot(x - q.x, z - q.z) < 1.2; face(x, z); D.sim({ mz: close ? 0 : 1 }, 1 / 60); tt += 1 / 60; if (P().grounded && tt > 0.2) break; }
        if (Math.abs(P().feet() - h) < 0.8) ok++; else { log(false, "falls climb", `missed step ${i} (${x},${z}) top ${h}: at (${pos().x.toFixed(1)},${pos().z.toFixed(1)}) feet ${P().feet().toFixed(1)}`); break; }
      }
      log(ok === route.length, "falls steps climbable", `${ok}/${route.length}`); }
    log(F().got.map === 1, "map picked up on the ledge", `${F().got.map}`);
    talkTo(0, -64); log(F().heroes.salmonad === "done", "salmonad won over", F().heroes.salmonad);
    log(F().phase === "gather", "everyone in -> gather", F().phase);
    // campfire -> outro cutscene -> chapter complete
    at(0, 5); D.sim({}, 0.2); log(g().mode === "cine", "campfire starts the outro cutscene", g().mode);
    if (g().cine) g().cine.skip(); await new Promise(r => setTimeout(r, 400));
    log(F().phase === "complete" && g().mode === "result", "chapter 2 complete", `phase ${F().phase} mode ${g().mode}`);
  } catch (e) { log(false, "EXCEPTION", e.stack || e); }
  log(errs.length === 0, "no runtime errors", errs.join(" | "));
  window.SELFTEST = out; console.log("SELFTEST DONE", out.filter(l => l.startsWith("FAIL")).length, "failures");
}
