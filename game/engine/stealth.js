// Stealth guards for story chapters: pure patrol + vision rules (the scene just mirrors them).
export const seesCones = t => /laser|glass|visor|vr/.test(((t && t.Eyes) || "").toLowerCase());   // Eyes with glass/visor/laser can see patrol cones

export function createGuard({ path, speed = 3, range = 12, angle = 0.6, turn = 0.6, pause = 0.6 }) {
  return { path, speed, range, angle, turn, pause, i: 0, dir: 1, wait: 0, x: path[0][0], z: path[0][1], heading: 0, hold: 0 };
}

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export function stepGuard(g, dt) {
  if (g.wait > 0) { g.wait -= dt; return g; }
  const [tx, tz] = g.path[g.i], dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz); const dh = wrap(want - g.heading); g.heading += Math.max(-g.turn * dt * 6, Math.min(g.turn * dt * 6, dh));
  if (d < 0.15) {   // arrived: pause, then head for the next point (ping-pong along the path)
    g.wait = g.pause; if (g.i + g.dir >= g.path.length || g.i + g.dir < 0) g.dir *= -1; g.i += g.dir; return g;
  }
  if (Math.abs(dh) < 0.9) { const s = Math.min(d, g.speed * dt); g.x += dx / d * s; g.z += dz / d * s; }
  return g;
}

// player: { run, still } -> does this guard notice a player at (px, pz)?
export function canSee(g, px, pz, { run = false, still = false } = {}) {
  const dx = px - g.x, dz = pz - g.z, d = Math.hypot(dx, dz), r = g.range * (run ? 1 : 0.65) * (still ? 0.54 : 1);
  if (d > r) return false; if (d < 1.2) return true;
  return Math.abs(wrap(Math.atan2(dx, dz) - g.heading)) < g.angle;
}
