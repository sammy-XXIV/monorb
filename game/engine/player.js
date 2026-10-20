// Player: Rapier capsule + character controller. Walk/run, coyote time, jump buffer, double jump, spin attack, knockback, platform riding.
import * as THREE from "three";

export const CAP_R = 1.0, CAP_HH = 1.25;           // capsule: ~4.5 units tall, matches the Chog
const FEET = CAP_HH + CAP_R;                        // centre -> feet
const WALK = 9, RUN = 16, ACCEL = 60, AIR_ACCEL = 30, JUMP_V = 15.5, DJUMP_V = 13, GRAVITY = -30, MAX_FALL = -32;   // floatier: apex ~4u, ~0.5 s up
const COYOTE = 0.12, BUFFER = 0.12, SPIN_T = 0.4, SPIN_CD = 0.55;

export function createPlayer(phys, spawn) {
  const { RAPIER, world } = phys;
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + FEET, spawn.z));
  const col = world.createCollider(RAPIER.ColliderDesc.capsule(CAP_HH, CAP_R), body);
  const ctl = world.createCharacterController(0.05);
  ctl.enableAutostep(1.0, 0.4, true); ctl.enableSnapToGround(0.6); ctl.setMaxSlopeClimbAngle(50 * Math.PI / 180); ctl.setSlideEnabled(true);
  const vel = new THREE.Vector3(), pos = new THREE.Vector3(spawn.x, spawn.y + FEET, spawn.z);
  const p = {
    pos, vel, heading: 0, grounded: false, speed: 0, coyote: 0, buffer: 0, jumps: 0, spin: 0, spinCd: 0, invuln: 0, knock: new THREE.Vector3(), carry: new THREE.Vector3(), onPlat: null,
    feet: () => pos.y - FEET,
    teleport(x, y, z) { pos.set(x, y + FEET, z); body.setTranslation({ x, y: y + FEET, z }, true); vel.set(0, 0, 0); p.knock.set(0, 0, 0); p.carry.set(0, 0, 0); p.onPlat = null; p.grounded = false; },
    hurt(fromX, fromZ, power = 22) {               // knockback away from the source + a little hop
      if (p.invuln > 0) return false;
      const dx = pos.x - fromX, dz = pos.z - fromZ, n = Math.hypot(dx, dz) || 1;
      p.knock.set(dx / n * power, 0, dz / n * power); vel.y = 12; p.invuln = 1.2; return true;
    },
    bounce(v = 18) { vel.y = v; p.jumps = 1; },     // after stomping an enemy
    // input: {mx, mz} camera-relative move (-1..1), run, jumpPressed, spinPressed; camYaw: camera heading
    update(dt, input, camYaw) {
      const ev = [];
      p.invuln = Math.max(0, p.invuln - dt); p.spinCd = Math.max(0, p.spinCd - dt); p.spin = Math.max(0, p.spin - dt);
      // camera-relative wish direction
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      // forward f = (sin, cos); screen-right r = (-cos, sin) when looking along f
      const wx = input.mz * sin - input.mx * cos, wz = input.mz * cos + input.mx * sin, wl = Math.min(1, Math.hypot(wx, wz));
      const target = (input.run ? RUN : WALK) * wl, a = (p.grounded ? ACCEL : AIR_ACCEL) * dt;
      const tx = wl > 0.01 ? wx / Math.hypot(wx, wz) * target : 0, tz = wl > 0.01 ? wz / Math.hypot(wx, wz) * target : 0;
      vel.x += Math.max(-a, Math.min(a, tx - vel.x)); vel.z += Math.max(-a, Math.min(a, tz - vel.z));
      if (wl > 0.01) { let d = Math.atan2(wx, wz) - p.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); p.heading += d * Math.min(1, dt * 14); }
      // jump: coyote time + input buffer + one air jump
      p.coyote = p.grounded ? COYOTE : Math.max(0, p.coyote - dt);
      p.buffer = input.jumpPressed ? BUFFER : Math.max(0, p.buffer - dt);
      if (p.buffer > 0 && (p.coyote > 0 || p.jumps < 2)) {
        const air = p.coyote <= 0; vel.y = air ? DJUMP_V : JUMP_V; p.jumps = air ? 2 : 1; p.buffer = 0; p.coyote = 0; ev.push(air ? "djump" : "jump");
      }
      if (input.spinPressed && p.spinCd === 0) { p.spin = SPIN_T; p.spinCd = SPIN_CD; ev.push("spin"); }
      vel.y = Math.max(MAX_FALL, vel.y + GRAVITY * dt);
      p.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
      const plat = p.grounded ? p.onPlat : null;          // the moving platform the controller touched under us last step
      if (plat) p.carry.set(plat.delta.x / dt, 0, plat.delta.z / dt); else if (p.grounded) p.carry.set(0, 0, 0);   // leaving a moving platform keeps its momentum (jump on the raft, land on the raft)
      const air = !p.grounded, move = { x: (vel.x + p.knock.x + (air ? p.carry.x : 0)) * dt, y: vel.y * dt, z: (vel.z + p.knock.z + (air ? p.carry.z : 0)) * dt };   // on the platform Rapier carries us itself
      ctl.computeColliderMovement(col, move);
      const m = ctl.computedMovement(), was = p.grounded;
      let hitPlat = null, hitOther = false;
      for (let i = 0; i < ctl.numComputedCollisions(); i++) { const c = ctl.computedCollision(i), pl = c && c.collider ? phys.platformOf(c.collider) : null; if (pl) hitPlat = pl; else if (c) hitOther = true; }
      pos.set(pos.x + m.x, pos.y + m.y, pos.z + m.z); body.setNextKinematicTranslation(pos);
      p.grounded = ctl.computedGrounded();
      p.onPlat = !p.grounded ? null : hitPlat || (hitOther ? null : p.onPlat);   // contacts are only reported on some frames: stay on the platform until we leave it
      if (p.grounded && vel.y < 0) { vel.y = -1; p.jumps = 0; if (!was) ev.push("land"); }
      if (!p.grounded && m.y > move.y * 0.5 && vel.y > 0 && move.y > 0 && m.y < move.y * 0.2) vel.y = 0;   // bonked a ceiling
      p.speed = Math.hypot(vel.x, vel.z);
      return ev;
    },
  };
  return p;
}
