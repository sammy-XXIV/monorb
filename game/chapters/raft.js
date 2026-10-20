// Swamp raft ferry between the east dock and the west rock. Pure, so it can be tested without a browser.
export const EAST = -44, WEST = -114, SPEED = 6, GRACE = 1.5;
const far = x => (Math.abs(x - EAST) < Math.abs(x - WEST) ? WEST : EAST);

export const createRaft = () => ({ x: EAST, goal: EAST, off: 99, vx: 0 });

export function stepRaft(r, onRaft, playerX, dt) {
  let { x, goal, off } = r;
  if (onRaft) { if (off > GRACE) goal = far(x); off = 0; }                  // boarding: sail to the far end (a jump on board keeps the course)
  else { off += dt; if (off > GRACE) goal = far(playerX) === WEST ? EAST : WEST; }   // left behind: come to the end nearest the player
  const d = goal - x, s = Math.sign(d) * Math.min(Math.abs(d), SPEED * dt);
  return { x: x + s, goal, off, vx: dt > 0 ? s / dt : 0 };
}
