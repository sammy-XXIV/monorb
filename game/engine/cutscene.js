// In-engine cutscene: a list of shots. Each shot eases the camera from `cam` to `to` ([x,y,z, lookX,lookY,lookZ]) over `dur`
// seconds, shows an optional subtitle `line` [who, text], runs `start()` once and `tick(u, dt)` every frame (u: 0..1).
// next() jumps to the following shot (tap); skip() runs every remaining shot to its end state.
export function createCutscene(camera, shots, ui) {
  let i = -1, t = 0, done = false;
  const enter = k => { i = k; t = 0; const s = shots[i]; if (!s) { done = true; ui.line(null); return; } s.start?.(); ui.line(s.line || null); };
  const finish = s => s.tick?.(1, 0);
  enter(0);
  const cut = {
    get done() { return done; },
    update(dt) {
      if (done) return true;
      const s = shots[i]; t += dt; const u = Math.min(1, t / s.dur), e = u * u * (3 - 2 * u);
      const a = s.cam, b = s.to || s.cam;
      if (a) { camera.position.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e);
        camera.lookAt(a[3] + (b[3] - a[3]) * e, a[4] + (b[4] - a[4]) * e, a[5] + (b[5] - a[5]) * e); }
      s.tick?.(u, dt);
      if (t >= s.dur) enter(i + 1);
      return done;
    },
    next() { if (!done) { finish(shots[i]); enter(i + 1); } },
    skip() { while (!done) { finish(shots[i]); enter(i + 1); } },
  };
  return cut;
}
