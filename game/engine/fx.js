// Particles: floating embers / fireflies (instanced points), one-shot bursts (hits, pickups), glowing wisps.
import * as THREE from "three";

const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,0.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

// ambient drifting particles inside a box
export function drift(scene, { count = 300, box = [200, 30, 200], center = [0, 10, 0], color = 0xffa25a, size = 0.6, speed = 0.6 } = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { for (let k = 0; k < 3; k++) pos[i * 3 + k] = center[k] + (Math.random() - 0.5) * box[k]; seed[i] = Math.random() * 100; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: dot, color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  return { pts, update(t) {
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += Math.sin(t * 0.7 + seed[i]) * 0.01 * speed + 0.006 * speed;
      pos[i * 3] += Math.cos(t * 0.5 + seed[i]) * 0.01 * speed;
      if (pos[i * 3 + 1] > center[1] + box[1] / 2) pos[i * 3 + 1] = center[1] - box[1] / 2;
    }
    geo.attributes.position.needsUpdate = true;
  } };
}

// one-shot radial burst
const bursts = [];
export function burst(scene, at, { color = 0xffffff, count = 24, speed = 10, life = 0.6, size = 0.9 } = {}) {
  const pos = new Float32Array(count * 3), vel = [];
  for (let i = 0; i < count; i++) { pos.set([at.x, at.y, at.z], i * 3); const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.5)); vel.push(v); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: dot, color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts); bursts.push({ pts, pos, vel, t: 0, life, scene });
}
export function updateBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.t += dt; const k = b.t / b.life;
    b.vel.forEach((v, j) => { v.y -= 18 * dt; b.pos[j * 3] += v.x * dt; b.pos[j * 3 + 1] += v.y * dt; b.pos[j * 3 + 2] += v.z * dt; });
    b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = 1 - k;
    if (k >= 1) { b.scene.remove(b.pts); b.pts.geometry.dispose(); bursts.splice(i, 1); }
  }
}

// collectible glowing wisp (blue flame orb)
export function wisp(color = 0x6fe3ff) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2) })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(2.6); g.add(halo); return g;
}

// cheap stand-in for a point light: additive glow sprite (lights cost every lit pixel; sprites cost almost nothing)
export function glowSprite(color, size = 3) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
  s.scale.setScalar(size); return s;
}
