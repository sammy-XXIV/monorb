// Chapter 1 visuals: a dead purple forest at dusk, skull creatures patrolling the lane, the blue-flame time device at the end.
import * as THREE from "three";
import { outlineId } from "../render.js";
import { GOAL_Z, LANE_X } from "./ch1.js";

const lambert = c => new THREE.MeshLambertMaterial({ color: c });
const ink = (m, id) => outlineId(m, id);

export function buildCh1(scene) {
  const g = new THREE.Group(), parts = [];
  const put = (m, outline = true, id) => { g.add(m); if (outline) { ink(m, id); parts.push(m); } return m; };
  scene.background = new THREE.Color(0x6b5a86); scene.fog = new THREE.Fog(0x6b5a86, 18, 70);
  // ground + path
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 120), lambert(0x3d3150)); ground.rotation.x = -Math.PI / 2; ground.position.z = 30; g.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(LANE_X * 2 + 2, GOAL_Z + 12), lambert(0x4b3d5e)); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, GOAL_Z / 2); g.add(path);
  // dead trees both sides (deterministic layout)
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1, x = side * (LANE_X + 3 + rnd() * 14), z = -6 + rnd() * (GOAL_Z + 20), h = 9 + rnd() * 10, r = 0.35 + rnd() * 0.4;
    const trunk = put(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, h, 7), lambert(0x2a2236))); trunk.position.set(x, h / 2, z); trunk.rotation.z = (rnd() - 0.5) * 0.12;
    for (let b = 0; b < 3; b++) {                 // bare branches
      const bl = 2 + rnd() * 3, br = put(new THREE.Mesh(new THREE.CylinderGeometry(0.08, r * 0.35, bl, 5), lambert(0x2a2236)));
      br.position.set(x + (rnd() - 0.5) * 0.5, h * (0.55 + b * 0.13), z); br.rotation.set((rnd() - 0.5) * 1.2, rnd() * 6, (rnd() > 0.5 ? 1 : -1) * (0.7 + rnd() * 0.5));
    }
  }
  // gravestones / rubble along the path
  for (let i = 0; i < 14; i++) {
    const s = put(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3 + rnd(), 0.35), lambert(0x6a6478)));
    s.position.set((i % 2 ? 1 : -1) * (LANE_X + 1.3 + rnd()), 0.65, 3 + i * 4); s.rotation.set(0, rnd() - 0.5, (rnd() - 0.5) * 0.3);
  }
  // time device: stone pedestal + blue flame + light
  const ped = put(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 1.2, 10), lambert(0x585269))); ped.position.set(0, 0.6, GOAL_Z + 2);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.6, 12), new THREE.MeshBasicMaterial({ color: 0x5ad8ff })); flame.position.set(0, 2.6, GOAL_Z + 2); g.add(flame);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 12), new THREE.MeshBasicMaterial({ color: 0xd6f6ff })); core.position.set(0, 2.2, GOAL_Z + 2); g.add(core);
  const light = new THREE.PointLight(0x5ad8ff, 40, 18); light.position.set(0, 3, GOAL_Z + 2); g.add(light);
  // skull creatures: pale round body, dark eye sockets, little feet (one shared outline id per creature)
  const creatures = [];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group(), id = 5000 + i;
    const body = put(new THREE.Mesh(new THREE.SphereGeometry(0.75, 18, 14), lambert(0xd9d4e4)), true, id); body.scale.set(1, 0.9, 1); body.position.y = 0.95; g.remove(body); c.add(body);
    for (const s of [-1, 1]) {
      const eye = put(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), lambert(0x1a1424)), true, id + 100); eye.scale.set(1, 1.2, 0.4); eye.position.set(s * 0.28, 1.05, 0.66); g.remove(eye); c.add(eye);
      const foot = put(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lambert(0x8f86a3)), true, id); foot.position.set(s * 0.35, 0.18, 0.1); g.remove(foot); c.add(foot);
    }
    c.scale.setScalar(2.2);                       // Chog-sized, like the chapter card
    g.add(c); creatures.push(c);
  }
  scene.add(g);
  let t = 0;
  return {
    group: g, parts,
    sync(state, dt) {                             // creatures follow the pure state; flame flickers
      t += dt;
      state.creatures.forEach((s, i) => { const c = creatures[i]; c.position.set(s.x, Math.abs(Math.sin(t * 8 + i)) * 0.25, s.z); c.rotation.y = s.dir > 0 ? Math.PI / 2 : -Math.PI / 2; });
      flame.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 9) * 0.12, 1); light.intensity = 36 + Math.sin(t * 11) * 6;
    },
    dispose() { scene.remove(g); scene.fog = null; },
  };
}
