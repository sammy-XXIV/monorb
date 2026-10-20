// Chapter 1 — Escape the wasteland. Pure state: creatures patrol across the lane, touching one costs a hit.
export const GOAL_Z = 55, LANE_X = 7, TOUCH = 2.2, INVULN = 1.0, KNOCK = 2;   // TOUCH matches the 2.2x creature size

const START = [8, 15, 22, 30, 38, 46].map((z, i) => ({ x: (i % 2 ? 1 : -1) * 4, z, dir: i % 2 ? -1 : 1, speed: 2.5 + (i % 3) }));

export function createCh1(rules) {
  const state = {};
  const reset = () => Object.assign(state, { hits: 0, invuln: 0, reviveUsed: false, knockback: 0, creatures: START.map(c => ({ ...c })) });
  reset();
  function step(dt, p) {
    const ev = []; state.knockback = 0;
    state.invuln = Math.max(0, state.invuln - dt);
    for (const c of state.creatures) {                         // patrol left-right across the lane
      c.x += c.dir * c.speed * dt;
      if (Math.abs(c.x) > LANE_X) { c.x = Math.sign(c.x) * LANE_X; c.dir *= -1; }
    }
    if (p.z >= GOAL_Z) return ["complete"];
    if (state.invuln === 0 && state.creatures.some(c => Math.hypot(c.x - p.x, c.z - p.z) < TOUCH)) {
      state.hits++; state.invuln = INVULN; state.knockback = -KNOCK; ev.push("hit");
      if (state.hits >= rules.maxHits) {
        if (rules.revive && !state.reviveUsed) { state.reviveUsed = true; state.hits = 0; ev.push("revive"); }
        else ev.push("fail");
      }
    }
    return ev;
  }
  return { state, step, reset };
}
