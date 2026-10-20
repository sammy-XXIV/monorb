// ?selftest : drive the real game logic headless and report what breaks. Results -> console + window.SELFTEST.
export async function run(D) {
  const out = [], g = () => D.get(), P = () => g().player, pos = () => P().pos.clone();
  const log = (ok, name, info = "") => { out.push(`${ok ? "PASS" : "FAIL"} ${name} ${info}`); console.log(`SELFTEST ${ok ? "PASS" : "FAIL"} ${name} ${info}`); };
  const errs = []; addEventListener("error", e => errs.push(e.message)); addEventListener("unhandledrejection", e => errs.push(String(e.reason)));
  const at = (x, z) => { P().teleport(x, 2, z); D.sim({}, 0.6); };            // drop in, settle on the ground
  const reset = () => { const s = g(); if (s.mode !== "play") { D.begin(); } };
  const walkFrom = (x, z, yaw, secs = 2) => {                               // walk with camera yaw so "forward" = yaw direction
    reset(); at(x, z); g().rig.yaw = yaw + Math.PI; const a = pos(); D.sim({ mz: 1 }, secs); const b = pos();
    return { d: Math.hypot(b.x - a.x, b.z - a.z), a, b };
  };
  try {
    // 1. ground + basic movement from spawn, 8 directions
    at(0, 14); log(P().grounded, "grounded at spawn", `feet y=${P().feet().toFixed(2)}`);
    for (let k = 0; k < 8; k++) { const yaw = k * Math.PI / 4, r = walkFrom(0, 14, yaw); log(r.d > 12, `walk dir ${k * 45}deg from spawn`, `moved ${r.d.toFixed(1)} (expect ~17)`); }
    // 2. run is faster than walk
    reset(); at(0, 20); g().rig.yaw = Math.PI; let a = pos(); D.sim({ mz: 1, run: true }, 1); log(pos().distanceTo(a) > 12, "run speed", `moved ${pos().distanceTo(a).toFixed(1)} in 1s`);
    // 3. jump + double jump heights
    reset(); at(0, 20); let y0 = P().feet(), peak = y0; D.sim({ jumpPressed: true }, 0.01); for (let i = 0; i < 90; i++) { D.sim({}, 1 / 60); peak = Math.max(peak, P().feet()); }
    log(peak - y0 > 3, "jump height", `${(peak - y0).toFixed(2)}`); log(P().grounded, "lands after jump");
    reset(); at(0, 20); y0 = P().feet(); peak = y0; D.sim({ jumpPressed: true }, 0.2); D.sim({ jumpPressed: true }, 0.01); for (let i = 0; i < 80; i++) { D.sim({}, 1 / 60); peak = Math.max(peak, P().feet()); }
    log(peak - y0 > 5, "double jump height", `${(peak - y0).toFixed(2)}`);
    // 3b. running jump reach: how far does a running jump carry (swamp gaps are ~7 units, stump-to-rock 7)
    reset(); at(0, 20); g().rig.yaw = Math.PI; D.sim({ mz: 1, run: true }, 0.6); a = pos(); D.sim({ mz: 1, run: true, jumpPressed: true }, 0.01);
    let t = 0; while (!P().grounded || t < 0.1) { D.sim({ mz: 1, run: true }, 1 / 60); t += 1 / 60; if (t > 3) break; }
    log(pos().distanceTo(a) > 10, "running jump reach", `${pos().distanceTo(a).toFixed(1)} units in ${t.toFixed(2)}s`);
    // 3c. swamp raft: hop on at the dock, ride it out (spin to swat sludge blobs), hop onto the shard rock
    { const face = (x, z) => { const p = pos(); g().rig.yaw = Math.atan2(x - p.x, z - p.z) + Math.PI; };
      reset(); P().teleport(-36, 0, 0); D.sim({}, 0.5); const h0 = g().hits;
      const L0 = g().level; face(L0.raft().x, 0); D.sim({ mz: 1, jumpPressed: true }, 0.01); let tt = 0; while (Math.abs(pos().x - L0.raft().x) > 0.8 && tt < 3) { face(L0.raft().x, 0); D.sim({ mz: 1 }, 1 / 60); tt += 1 / 60; } D.sim({}, 0.3);
      log(Math.abs(P().feet() - 1.6) < 0.4 && g().mode === "play", "board raft", `at (${pos().x.toFixed(1)},${pos().z.toFixed(1)}) feet ${P().feet().toFixed(2)}`);
      { const L = g().level; D.sim({}, 1); D.sim({ jumpPressed: true }, 0.01); let air = ""; for (let i = 0; i < 6; i++) { D.sim({}, 0.25); air += ` ${(pos().x - L.raft().x).toFixed(2)}/${P().feet().toFixed(1)}/${P().carry.x.toFixed(1)}`; }
        log(Math.abs(pos().x - L.raft().x) < 2.5 && Math.abs(P().feet() - 1.6) < 0.4, "jump on the moving raft lands back on it", `offset/feet/carry:${air}`); }
      tt = 0; let tr = ""; while (pos().x > -112.5 && tt < 18 && g().mode === "play") { D.sim({ spinPressed: Math.round(tt * 60) % 40 === 0 }, 1 / 60); tt += 1 / 60; if (Math.round(tt * 60) % 15 === 0) tr += ` ${pos().x.toFixed(1)}/${P().feet().toFixed(1)}/${g().hits}`; }
      log(pos().x < -112 && P().feet() > 1, "raft carries you across", `x=${pos().x.toFixed(1)} after ${tt.toFixed(1)}s, hits taken ${g().hits - h0}, mode=${g().mode} trace(x/feet/hits):${tr}`);
      face(-123, 0); D.sim({ mz: 1 }, 0.1); D.sim({ mz: 1, jumpPressed: true }, 0.01); D.sim({ mz: 1 }, 0.3); D.sim({ mz: 1, jumpPressed: true }, 0.01);
      tt = 0; while (tt < 2.5) { const q = pos(), close = Math.hypot(-123 - q.x, q.z) < 1.2; face(-123, 0); D.sim({ mz: close ? 0 : 1 }, 1 / 60); tt += 1 / 60; if (P().grounded && tt > 0.3) break; }
      log(g().flow.shards.has("swamp"), "swamp shard from the raft", `at (${pos().x.toFixed(1)},${pos().z.toFixed(1)}) feet ${P().feet().toFixed(2)}`);
      // the old glitch: fall in the sludge -> must respawn on dry land and be able to walk, not bounce forever
      reset(); P().teleport(-60, 2, 10); D.sim({}, 1.5); const a2 = pos(); g().rig.yaw = Math.PI / 2 + Math.PI; D.sim({ mz: 1 }, 1); 
      log(P().grounded && pos().distanceTo(a2) > 3 && g().mode === "play", "sludge respawn lands on dry bank", `respawned (${a2.x.toFixed(1)},${a2.z.toFixed(1)}), then moved ${pos().distanceTo(a2).toFixed(1)}`); }
    // 4. every path out of the hub
    for (const [name, x, z, yaw] of [["to swamp", -20, 0, -Math.PI / 2], ["to graveyard", 20, 0, Math.PI / 2], ["to ruins (first block needs a jump)", 0, 26, 0], ["to sealed road (blocked)", 0, -22, Math.PI]]) {
      const r = walkFrom(x, z, yaw, 2.5); log(name.includes("blocked") ? r.d < 14 : name.includes("jump") ? r.d > 10 : r.d > 15, `path ${name}`, `moved ${r.d.toFixed(1)} end (${r.b.x.toFixed(0)},${r.b.z.toFixed(0)})`);
    }
    // 5. walk around the graveyard aisle + ruins base
    for (const [name, x, z, yaw] of [["graveyard aisle", 46, 0, Math.PI / 2], ["ruins base", 0, 42, 0], ["swamp bank", -33, -12, 0]]) {
      const r = walkFrom(x, z, yaw, 1.5); log(r.d > 4 || g().mode !== "play", `move in ${name}`, `moved ${r.d.toFixed(1)} mode=${g().mode} hits=${g().hits}`);
    }
    // 6. talk to the Doctor
    reset(); const doc = g().level.doctor.position; at(doc.x + 3, doc.z + 3); D.talk(); log(g().flow.phase === "explore", "doctor intro -> explore", g().flow.phase);
    // 7. shards: stand on each one
    for (const s of g().level.shards) { reset(); P().teleport(s.x, s.y - 2.2, s.z); D.sim({}, 0.3); }
    log(g().flow.shards.size === 3, "collect 3 shards", `${g().flow.shards.size}/3 phase=${g().flow.phase}`);
    // 8. return to Doctor -> chase
    reset(); at(doc.x + 3, doc.z + 3); D.talk(); log(g().flow.phase === "chase" && g().level.chasing(), "doctor return -> chase", g().flow.phase);
    // 9. chase corridor is open and runnable: run 6 s south
    reset(); at(0, -30); g().rig.yaw = 0; a = pos(); { let side = 1; for (let i = 0; i < 360 && g().mode === "play"; i++) {   // a player who jumps logs and sidesteps stones
      const blocked = P().speed < 8 && i > 10; if (blocked) side = -side;
      D.sim({ mz: 1, mx: blocked ? side : 0, run: true, jumpPressed: blocked || (i % 50 === 0) }, 1 / 60); } }
    log(a.z - pos().z > 60 || g().mode !== "play", "chase run south", `dz=${(a.z - pos().z).toFixed(1)} mode=${g().mode}`);
    // 10. portal completes
    if (g().mode === "play") { at(0, -226); D.sim({ mz: 1 }, 1); }
    log(g().flow.phase === "complete", "portal completes chapter", `phase=${g().flow.phase} mode=${g().mode}`);
  } catch (e) { log(false, "EXCEPTION", e.stack || e); }
  log(errs.length === 0, "no runtime errors", errs.join(" | "));
  window.SELFTEST = out; console.log("SELFTEST DONE", out.filter(l => l.startsWith("FAIL")).length, "failures");
}
