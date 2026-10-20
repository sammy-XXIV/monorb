// Skull minion brain: patrol -> chase -> windup (telegraph) -> lunge -> recover. Pure; the scene just mirrors it.
export const SEE = 16, GIVE_UP = 30, STRIKE = 4.5, WINDUP = 0.55, LUNGE_T = 0.35, LUNGE_SPEED = 26, RECOVER = 0.8, HIT_R = 2.6;
const PATROL_SPEED = 3, CHASE_SPEED = 8.5;

export function createEnemy({ a, b }) {
  return { x: a.x, z: a.z, a, b, home: { ...a }, goal: "b", state: "patrol", t: 0, dirX: 0, dirZ: 1, heading: 0, hitDone: false };
}

const toward = (e, tx, tz, speed, dt) => {
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
  if (d > 1e-3) { const s = Math.min(d, speed * dt); e.x += dx / d * s; e.z += dz / d * s; e.heading = Math.atan2(dx, dz); }
  return d;
};

// returns { enemy, hitPlayer }
export function stepEnemy(prev, p, dt) {
  const e = { ...prev }; let hitPlayer = false;
  if (e.state === "dead") return { enemy: e, hitPlayer };
  e.t += dt;
  const d = Math.hypot(p.x - e.x, p.z - e.z);
  switch (e.state) {
    case "patrol": {
      const g = e[e.goal]; if (toward(e, g.x, g.z, PATROL_SPEED, dt) < 0.3) e.goal = e.goal === "a" ? "b" : "a";
      if (d < STRIKE) { e.state = "windup"; e.t = 0; e.heading = Math.atan2(p.x - e.x, p.z - e.z); }   // ambushed up close: swing straight away
      else if (d < SEE) { e.state = "chase"; e.t = 0; }
      break;
    }
    case "chase":
      if (d > GIVE_UP) { e.state = "return"; e.t = 0; break; }
      if (d < STRIKE) { e.state = "windup"; e.t = 0; e.heading = Math.atan2(p.x - e.x, p.z - e.z); break; }
      toward(e, p.x, p.z, CHASE_SPEED, dt); break;
    case "windup":                                   // stands still, flashes: the player's cue to dodge
      if (e.t >= WINDUP) { const dx = p.x - e.x, dz = p.z - e.z, n = Math.hypot(dx, dz) || 1; e.dirX = dx / n; e.dirZ = dz / n; e.state = "lunge"; e.t = 0; e.hitDone = false; }
      break;
    case "lunge":
      e.x += e.dirX * LUNGE_SPEED * dt; e.z += e.dirZ * LUNGE_SPEED * dt;
      if (!e.hitDone && Math.hypot(p.x - e.x, p.z - e.z) < HIT_R && Math.abs((p.y || 0)) < 3) { hitPlayer = true; e.hitDone = true; }
      if (e.t >= LUNGE_T) { e.state = "recover"; e.t = 0; }
      break;
    case "recover":
      if (e.t >= RECOVER) { e.state = d < SEE ? "chase" : "return"; e.t = 0; }
      break;
    case "return":
      if (d < SEE * 0.7) { e.state = "chase"; e.t = 0; break; }
      if (toward(e, e.home.x, e.home.z, PATROL_SPEED * 1.5, dt) < 0.3) { e.state = "patrol"; e.t = 0; }
      break;
  }
  return { enemy: e, hitPlayer };
}
