// Third-person camera: drag (mouse / touch) or Q/E to orbit, wheel to zoom; follows smoothly. Can be pinned to a fixed view (cutscenes, chase).
import * as THREE from "three";

export function createCameraRig(camera, dom) {
  const rig = { yaw: Math.PI, pitch: 0.42, dist: 19, target: new THREE.Vector3(), look: new THREE.Vector3(), pinned: null };
  let drag = null;
  dom.addEventListener("pointerdown", e => { if (!drag) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 }; });   // one finger owns the look; others (joystick) are ignored
  const end = e => { if (!drag || e.pointerId !== drag.id) return; rig.lastDragMoved = drag.moved; drag = null; };
  addEventListener("pointerup", end); addEventListener("pointercancel", end);
  addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    rig.yaw -= dx * 0.006; rig.pitch = Math.max(0.08, Math.min(1.25, rig.pitch + dy * 0.004));
  });
  dom.addEventListener("wheel", e => { rig.dist = Math.max(9, Math.min(34, rig.dist + e.deltaY * 0.02)); }, { passive: true });
  const want = new THREE.Vector3(), lookWant = new THREE.Vector3();
  rig.update = (dt, focus, keys) => {
    if (keys.has("KeyQ")) rig.yaw += dt * 2.2; if (keys.has("KeyE")) rig.yaw -= dt * 2.2;
    if (rig.pinned) { want.copy(rig.pinned.pos); lookWant.copy(rig.pinned.look); }
    else {
      lookWant.set(focus.x, focus.y + 2.2, focus.z);
      want.set(focus.x + Math.sin(rig.yaw) * Math.cos(rig.pitch) * rig.dist, focus.y + 2 + Math.sin(rig.pitch) * rig.dist, focus.z + Math.cos(rig.yaw) * Math.cos(rig.pitch) * rig.dist);
    }
    const k = 1 - Math.exp(-dt * (rig.pinned ? 3 : 9));
    camera.position.lerp(want, k); rig.look.lerp(lookWant, k); camera.lookAt(rig.look);
  };
  rig.snap = focus => { rig.update(1, focus, new Set()); camera.position.copy(want); rig.look.copy(lookWant); camera.lookAt(rig.look); };
  // the direction the player should treat as "forward" (away from the camera)
  rig.moveYaw = () => rig.yaw + Math.PI;
  return rig;
}
