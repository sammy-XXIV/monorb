// Salmonad: round purple fish with googly eyes, big double orange lips that wrap round to the sides, ribbed orange fins.
// Built from refs/salmon.png, stretched E x longer as asked. Front px -> x = (px - 301) U, y = (519 - py) U; side px -> z = (sx - 963) U E. Faces +z.
import * as THREE from "three";

const U = 4.0 / 462, E = 1.6;
const fx = px => (px - 301) * U, fy = py => (519 - py) * U, sz = sx => (sx - 963) * U * E;
const A = 140 * U, B = 150 * U, C = 213 * U * E, CY = fy(301);   // round ball from the front
const COL = { body: 0x9354c3, belly: 0xa868d4, fin: 0xb86c36, finDark: 0x7a3f1a, lip: 0xbc6e36, white: 0xffffff, ink: 0x14101c };
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });

// ribbed fin texture: rays fanning from the base (v = 0) to the edge
const finTex = (() => {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#b86c36"; g.fillRect(0, 0, 256, 256);
  const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, "rgba(120,60,20,0.35)"); gr.addColorStop(1, "rgba(220,140,70,0.2)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#5e2e10"; g.lineWidth = 4; g.lineCap = "round";
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(128 + i * 6, 250); g.quadraticCurveTo(128 + i * 22, 140, 128 + i * 34, 40); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const finMat = new THREE.MeshLambertMaterial({ map: finTex, side: THREE.DoubleSide });

// leaf fin in its own plane: base at origin, tip at +y (length L), max width W; uv u across, v along
function finGeo(L, W, shape = "leaf") {
  const s = new THREE.Shape();
  if (shape === "sail") {                                         // dorsal: long base, tip swept back (side view)
    const R0 = -L * 0.45;                                             // root sunk into the curved back: no gap under the fin
    s.moveTo(-W * 0.62, R0); s.quadraticCurveTo(-W * 0.2, L * 0.3, W * 0.28, L); s.quadraticCurveTo(W * 0.38, L * 0.5, W * 0.5, 0); s.lineTo(W * 0.5, R0); s.closePath();   // leading edge rises gradually out of the back
  } else if (shape === "tail") {                                         // fan with a shallow notch at the end
    s.moveTo(-W * 0.12, 0); s.quadraticCurveTo(-W * 0.55, L * 0.55, -W * 0.5, L); s.quadraticCurveTo(0, L * 0.82, W * 0.5, L);
    s.quadraticCurveTo(W * 0.55, L * 0.55, W * 0.12, 0); s.closePath();
  } else {
    s.moveTo(-W * 0.3, 0); s.quadraticCurveTo(-W * 0.62, L * 0.55, 0, L); s.quadraticCurveTo(W * 0.62, L * 0.55, W * 0.3, 0); s.closePath();
  }
  const T = Math.max(0.05, Math.min(W, L) * 0.07);               // fin thickness: thin but solid, not paper
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: T * 0.6, bevelSize: T * 0.5, bevelSegments: 3, curveSegments: 24 });
  g.translate(0, 0, -T / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / W + 0.5, p.getY(i) / L);
  g.computeVertexNormals();
  return g;
}

export function buildSalmonad() {
  const root = new THREE.Group(), add = (m, parent = root) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  // ---- body: round front, tapering toward the tail ----
  const geo = new THREE.SphereGeometry(1, 96, 64), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = z < 0 ? 1 + z * 0.42 : 1;
    p.setXYZ(i, x * A * k, CY + y * B * k, z * C);
  }
  geo.computeVertexNormals();
  add(new THREE.Mesh(geo, lam(COL.body)));
  const surf = (x, y) => C * Math.sqrt(Math.max(0, 1 - (x / A) ** 2 - ((y - CY) / B) ** 2));   // front surface z (z >= 0)
  // ---- googly eyes on the upper front ----
  for (const [px, py] of [[272, 252], [342, 251]]) {                // middle of the face
    const x = fx(px), y = fy(py), z = surf(x, y) - 0.12;
    const n = new THREE.Vector3(x / A ** 2, (y - CY) / B ** 2, z / C ** 2).normalize();
    const eye = new THREE.Group(); eye.position.set(x, y, z); eye.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().lerp(new THREE.Vector3(0, 0, 1), 0.85).normalize()); root.add(eye);   // look forward, not cross-eyed outward
    const ball = add(new THREE.Mesh(new THREE.SphereGeometry(37 * U, 24, 16), lam(COL.white)), eye); ball.scale.z = 0.8;
    const pupil = add(new THREE.Mesh(new THREE.SphereGeometry(14 * U, 16, 12), lam(COL.ink)), eye); pupil.position.set(4 * U, 2 * U, 28 * U); pupil.scale.z = 0.5;
  }
  // ---- lips: two thick orange tubes wrapping round the front and running back along the sides (side view: to sx ~925) ----
  { const r = 16.4 * U, yU = CY - 0.26 * B, yL = CY - 0.47 * B, zEnd = C * 0.25 + 0.35;   // lips touch, like the drawing
    const ring = y => { const k = Math.sqrt(Math.max(0, 1 - ((y - CY) / B) ** 2)); return { ax: A * k - r * 0.15, cz: C * k + r * 0.6 }; };
    const at = (y, t) => { const e = ring(y); return new THREE.Vector3(e.ax * Math.sin(t), y, e.cz * Math.cos(t)); };
    const thU = Math.acos(Math.max(-1, Math.min(1, zEnd / ring(yU).cz))), thL = Math.acos(Math.max(-1, Math.min(1, zEnd / ring(yL).cz)));
    const pts = [], N = 40;
    for (let i = 0; i <= N; i++) pts.push(at(yU, -thU + 2 * thU * i / N));                   // upper lip, left -> right
    for (let i = 1; i < 6; i++) { const a = Math.PI * i / 6, y = (yU + yL) / 2 + (yU - yL) / 2 * Math.cos(a);   // rounded corner bulging back
      const t = thU + (thL - thU) * i / 6 + 0.06 * Math.sin(a); pts.push(at(y, t)); }
    for (let i = 0; i <= N; i++) pts.push(at(yL, thL - 2 * thL * i / N));                    // lower lip, right -> left
    for (let i = 1; i < 6; i++) { const a = Math.PI * i / 6, y = (yU + yL) / 2 - (yU - yL) / 2 * Math.cos(a);
      const t = -thL + (thL - thU) * i / 6 - 0.06 * Math.sin(a); pts.push(at(y, t)); }
    add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 220, r, 14, true), lam(COL.lip)));
  }
  // ---- fins ----
  const fin = (geo, pos, dir, faceNormal) => {                     // orient: local +y -> dir, local +z -> faceNormal (made perpendicular)
    const m = add(new THREE.Mesh(geo, finMat)); const y = dir.clone().normalize(), z = faceNormal.clone().sub(y.clone().multiplyScalar(faceNormal.dot(y))).normalize(), x = new THREE.Vector3().crossVectors(y, z);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); m.position.copy(pos); return m;
  };
  // dorsal: on top, in the side plane, leaning back
  fin(finGeo(125 * U, 155 * U * E, "sail"), new THREE.Vector3(0, CY + B - 0.1, sz(905)), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0));   // local +x -> world -z: tip leans back
  // tail: at the back end, fanning back
  fin(finGeo(105 * U * 1.3, 200 * U, "tail"), new THREE.Vector3(0, CY, -C * 0.93), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0));
  // pectorals: low on each side, pointing out and down, facing forward
  for (const s of [-1, 1]) fin(finGeo(100 * U, 85 * U), new THREE.Vector3(s * A * 0.92, fy(371), C * 0.25), new THREE.Vector3(s, -0.55, -0.15), new THREE.Vector3(0, 0, 1));
  // pelvics: two under the front, pointing down and slightly out
  for (const s of [-1, 1]) fin(finGeo(80 * U, 75 * U), new THREE.Vector3(s * 0.38, CY - B * 0.9, C * 0.35), new THREE.Vector3(s * 0.3, -1, 0.05), new THREE.Vector3(0, 0, 1));
  return root;
}
