// Moyaki: purple cat-headed fish on four stubby legs, built from refs/catfish.png (front / left / back / right views).
// Front-view pixel (px, py) -> x = (px - 313) * U, y = (461 - py) * U ; side-view pixel sx -> z = (880 - sx) * U. Faces +z, ~3.6 tall.
import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";

const U = 3.6 / 301;
const E = 1.45;                                                    // body length stretch (fish), applied to everything placed from the side view
const WX = 0.8;                                                     // body width squeeze (thinner), applied to everything placed from the front view
const fx = px => (px - 313) * U * WX, fy = py => (461 - py) * U, sz = sx => (880 - sx) * U * E;
const A = 177 * U * WX, B = 118 * U, C = 180 * U * E, CY = fy(303);          // body semi-axes (width, height, length), centre height
const COL = { body: 0x8a4f9a, belly: 0xa04aa8, leg: 0xa244a2, pink: 0xfcb1ca, lip: 0x9b746a, scale: 0x4a1f58, stripe: 0xe07ad8 };
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });

// body pattern: scale arcs + light wavy stripes on the sides and back, plain face window at the front (sphere UV: u=0.25 is +z)
function bodyTexture() {
  const W = 1024, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, "#8f55a0"); grad.addColorStop(0.6, "#8a4f9a"); grad.addColorStop(1, "#a04aa8");
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + rnd() * 60},20,${80 + rnd() * 60},0.12)`; g.fillRect(rnd() * W, rnd() * H, 3 + rnd() * 6, 3 + rnd() * 6); }   // fur mottling
  // pattern placed by distance d from the face (front, u = 0.25) on both sides, so left and right match
  const U2 = (d, side) => (((0.25 + side * d) % 1) + 1) % 1 * W;
  g.lineCap = "round";
  for (const side of [-1, 1]) {
    for (const d0 of [0.2, 0.29, 0.37, 0.44]) {                       // 4 diagonal light stripes, belly-front to top-back
      g.strokeStyle = "rgba(245,165,240,0.9)"; g.lineWidth = 8; g.beginPath();
      for (let y = 60; y <= H - 30; y += 6) { const d = d0 + (0.5 - y / H) * 0.06 + Math.sin(y * 0.03) * 0.004, x = U2(d, side); y === 60 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
      g.strokeStyle = "rgba(205,80,205,0.35)"; g.lineWidth = 34; g.beginPath();          // soft magenta band beside each stripe
      for (let y = 60; y <= H - 30; y += 6) { const d = d0 + 0.025 + (0.5 - y / H) * 0.06, x = U2(d, side); y === 60 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = "#3c1648"; g.lineWidth = 5;                       // scale arcs: bigger, sparser, upper body, opening toward the tail
    for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) {
      const d = 0.17 + i * 0.034 + (row % 2) * 0.017, x = U2(d, side), y = 80 + row * 55 + rnd() * 8;
      g.beginPath(); side > 0 ? g.arc(x - 12, y, 18, -0.9, 0.9) : g.arc(x + 12, y, 18, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function buildMoyaki({ faceUrl = "face.png", lipPts = null } = {}) {
  const root = new THREE.Group(), add = (m, parent = root) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  // ---- body: ellipsoid, tapering toward the tail (fish), head end full ----
  const geo = new THREE.SphereGeometry(1, 96, 64), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = z < 0 ? 1 + z * 0.38 : 1;                               // narrower toward the back
    p.setXYZ(i, x * A * k, CY + y * B * k + (z < 0 ? -z * 0.12 : 0), z * C);
  }
  geo.computeVertexNormals();
  const body = add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: bodyTexture() })));
  const surfZ = (x, y) => C * Math.sqrt(Math.max(0, 1 - (x / A) ** 2 - ((y - CY) / B) ** 2));
  // ---- face: eyes + brows + lips cut from the front view, projected on the front of the body ----
  const F = { x0: 165, x1: 465, y0: 225, y1: 405 }, UP = 0.42;     // face raised: purple chin below the lips like the reference
  new THREE.TextureLoader().load(faceUrl, tex => {
    tex.colorSpace = THREE.SRGBColorSpace; root.updateMatrixWorld(true);
    const w = (F.x1 - F.x0) * U * WX, h = (F.y1 - F.y0) * U;
    const par = root.parent, keep = [root.position.clone(), root.quaternion.clone(), root.scale.clone()];   // the decal projects in world space: build it with the character at the origin
    par?.remove(root); root.position.set(0, 0, 0); root.quaternion.identity(); root.scale.setScalar(1); root.updateMatrixWorld(true);
    const g = new DecalGeometry(body, new THREE.Vector3(fx((F.x0 + F.x1) / 2), fy((F.y0 + F.y1) / 2) + UP, C), new THREE.Euler(), new THREE.Vector3(w, h, C * 1.1));
    root.position.copy(keep[0]); root.quaternion.copy(keep[1]); root.scale.copy(keep[2]); par?.add(root);
    const d = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    d.userData.decal = true; root.add(d);
  });
  // ---- 3D lips along the drawn lip line (they stick out in the side view) ----
  if (lipPts) {
    const pts = lipPts.map(([x, y]) => { const X = fx(F.x0 + x), Y = fy(F.y0 + y) + UP; return new THREE.Vector3(X, Y, surfZ(X, Y) + 0.06); });
    const lip = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.13, 12), lam(COL.lip)));
    for (const e of [pts[0], pts[pts.length - 1]]) { const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lip.material)); c.position.copy(e); }
  }
  // ---- cat ears: purple outer, pink inner, near the front of the head ----
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(fx(313 + s * 112), fy(222), sz(845)); ear.rotation.set(-0.15, 0, -s * 0.28); root.add(ear);
    const outer = add(new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 4), lam(COL.body)), ear); outer.scale.set(1, 1, 0.5); outer.rotation.y = Math.PI / 4; outer.position.y = 0.4;
    const inner = add(new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.72, 4), lam(COL.pink)), ear); inner.scale.set(1, 1, 0.3); inner.rotation.y = Math.PI / 4; inner.position.set(0, 0.36, 0.12);
  }
  // ---- pink forked tail: side-profile shape, extruded thick ----
  const T = (sx, sy) => new THREE.Vector2(-sz(sx), (492 - sy) * U);   // side view: ground at 492
  const sh = new THREE.Shape();
  const r0 = T(1040, 232), up = T(1132, 196), notch = T(1092, 272), lo = T(1135, 345), r1 = T(1040, 318);
  sh.moveTo(r0.x, r0.y); sh.quadraticCurveTo(T(1090, 206).x, T(1090, 206).y, up.x, up.y);
  sh.quadraticCurveTo(T(1112, 240).x, T(1112, 240).y, notch.x, notch.y);
  sh.quadraticCurveTo(T(1112, 305).x, T(1112, 305).y, lo.x, lo.y);
  sh.quadraticCurveTo(T(1090, 340).x, T(1090, 340).y, r1.x, r1.y); sh.closePath();
  const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 4, curveSegments: 16 });
  tg.translate(0, 0, -0.09); tg.rotateY(Math.PI / 2);               // shape x -> world -z, extrusion -> world x
  { const p = tg.attributes.position, z0 = sz(1040), z1 = sz(1135);   // thickness tapers root -> tips
    for (let i = 0; i < p.count; i++) { const t = Math.min(1, Math.max(0, (p.getZ(i) - z0) / (z1 - z0))); p.setX(i, p.getX(i) * (1 - 0.5 * t)); }
    tg.computeVertexNormals(); }
  const tail = add(new THREE.Mesh(tg, lam(COL.pink)));
  tail.position.y = CY - (492 - 275) * U + 0.05;                     // line the tail root up with the body's centre line
  // ---- four stubby legs ----
  for (const s of [-1, 1]) for (const zz of [sz(845), sz(1005)]) {
    const zn = zz / C, k = zn < 0 ? 1 + zn * 0.38 : 1, lx = s * Math.min(1.2 * WX, A * k * Math.sqrt(Math.max(0, 1 - zn * zn)) * 0.6);   // stay under the body (it narrows toward the tail)
    const under = CY - B * k * Math.sqrt(Math.max(0, 1 - (lx / (A * k)) ** 2 - zn * zn)) + (zn < 0 ? -zn * 0.12 : 0);
    const top = under + 0.4, leg = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.26, top - 0.26, 6, 14), lam(COL.leg)));
    leg.position.set(lx, top / 2, zz);
    // cat paw: rounded foot with three toe beans on the front
    const paw = add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), lam(COL.leg))); paw.scale.set(0.34, 0.17, 0.4); paw.position.set(lx, 0.15, zz + 0.1);
    for (let t = -1; t <= 1; t++) { const toe = add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), lam(COL.leg))); toe.position.set(lx + t * 0.15, 0.1, zz + 0.42);
      const claw = add(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), lam(0xf2e6ee))); claw.rotation.x = Math.PI / 2 + 0.35; claw.position.set(lx + t * 0.15, 0.07, zz + 0.55); }   // small claws
  }
  root.userData.body = body;
  return root;
}
