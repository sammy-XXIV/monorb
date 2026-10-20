// Rapier physics: static colliders for the level, kinematic platforms, and the player's character controller.
import RAPIER from "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js";
import * as THREE from "three";

export async function createPhysics() {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -50, z: 0 });
  const platforms = new Map();                    // collider handle -> platform (for carrying the player)
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), c = new THREE.Vector3();
  const api = {
    RAPIER, world,
    box(cx, cy, cz, hx, hy, hz, rotY = 0) {
      const d = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz);
      if (rotY) d.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY));
      return world.createCollider(d);
    },
    cylinder(cx, cy, cz, r, hh) { return world.createCollider(RAPIER.ColliderDesc.cylinder(hh, r).setTranslation(cx, cy, cz)); },
    // static box collider from an object's world-space bounds (shrink trims fluffy edges like leaves)
    fromObject(obj, { shrink = 1, kind = "box" } = {}) {
      obj.updateMatrixWorld(true); box3.setFromObject(obj); box3.getCenter(c); box3.getSize(v).multiplyScalar(0.5);
      v.x *= shrink; v.z *= shrink;
      return kind === "cyl" ? api.cylinder(c.x, c.y, c.z, Math.max(v.x, v.z), v.y) : api.box(c.x, c.y, c.z, v.x, v.y, v.z);
    },
    // moving / sinking platform: kinematic body with a box collider; move it with setPos
    platform(cx, cy, cz, hx, hy, hz) {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(cx, cy, cz));
      const col = world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
      const p = { body, col, pos: new THREE.Vector3(cx, cy, cz), delta: new THREE.Vector3(),
        setPos(x, y, z) { p.delta.set(x - p.pos.x, y - p.pos.y, z - p.pos.z); p.pos.set(x, y, z); body.setNextKinematicTranslation({ x, y, z }); } };
      platforms.set(col.handle, p); return p;
    },
    platformUnder(x, y, z, maxDist = 0.6, exclude) {
      const hit = world.castRay(new RAPIER.Ray({ x, y, z }, { x: 0, y: -1, z: 0 }), maxDist, true, undefined, undefined, exclude);   // exclude = the player's collider, so the ray skips its own capsule
      return hit ? platforms.get(hit.collider.handle) || null : null;
    },
    platformOf: collider => platforms.get(collider.handle) || null,
    step(dt) { world.timestep = dt; world.step(); platforms.forEach(p => p.delta.set(0, 0, 0)); },
  };
  return api;
}
