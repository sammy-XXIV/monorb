// Player movement: pure, so it can be tested without a browser.
const WALK = 4, RUN = 8, JUMP = 9, GRAVITY = -25, MAX_DT = 0.05;

export function stepPlayer(p, input, dt) {
  dt = Math.min(dt, MAX_DT);                       // a long frame (tab in background) can't tunnel through things
  const len = Math.hypot(input.fx || 0, input.fz || 0), k = len > 1 ? 1 / len : 1;
  const fx = (input.fx || 0) * k, fz = (input.fz || 0) * k, moving = len > 0.01;
  const sp = moving ? (input.run ? RUN : WALK) : 0;
  let { x, z, y, vy, heading } = p;
  x += fx * sp * dt; z += fz * sp * dt;
  if (moving) {                                    // turn smoothly toward the move direction
    const target = Math.atan2(fx, fz); let d = target - heading;
    d = Math.atan2(Math.sin(d), Math.cos(d)); heading += d * Math.min(1, dt * 12);
  }
  if (input.jump && y === 0) vy = JUMP;
  vy += GRAVITY * dt; y += vy * dt;
  if (y <= 0) { y = 0; vy = 0; }
  return { x, z, y, vy, heading, speed: sp * Math.min(1, len) };
}
