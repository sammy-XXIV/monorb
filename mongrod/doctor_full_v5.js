// The Doctor (crystal dragon in a lab coat), built from refs/Neon Crystal Dragon Character Turnaround.png.
// Front-view pixel (px, py) -> x = (px - 285) * U, y = (548 - py) * U ; side-view pixel sx -> z = (277 - sx) * U. Faces +z, ~4.6 tall.
import * as THREE from "three";

const U = 4.6 / 443;
const fx = px => (px - 285) * U, fy = py => (548 - py) * U, sz = sx => (277 - sx) * U;
const C = { purple: 0x7352b5, purpleDark: 0x4e3590, coat: 0xe6d6cc, coatShade: 0xcbb8ad, teal: 0x1f8fb0, tealDark: 0x15607a,
            claw: 0xf0dcc8, crystal: 0x2a7dff, crystalCore: 0x9fd8ff, brooch: 0x3fe8ff };
const lam = c => new THREE.MeshLambertMaterial({ color: c });

export function buildDoctor() {
  const root = new THREE.Group(), add = (m, parent = root) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const ell = (rx, ry, rz, mat, x, y, z, seg = 32) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(12, seg * 0.6)), mat)); m.scale.set(rx, ry, rz); m.position.set(x, y, z); return m; };

  // ---------- head: everything modelled in 3D (painted drawings only work head-on) ----------
  const head = new THREE.Group(); root.add(head);
  const HCc = new THREE.Vector3(fx(282), fy(185), sz(228)), HCr = new THREE.Vector3(125 * U, 90 * U, 92 * U);       // cranium
  const MC = new THREE.Vector3(fx(282), fy(252), sz(158)), MR = new THREE.Vector3(108 * U, 50 * U, 80 * U);   // tip at sx~78 like the side view          // muzzle
  const A0 = 95 * Math.PI / 180;                                                                                       // grin spans +-95 deg round the muzzle
  const upperY = a => MC.y + 0.12 + 0.18 * (a / A0) ** 2;                                                               // corners curl up
  const lowerY = a => upperY(a) - 0.62 * Math.max(0, 1 - (a / A0) ** 2) ** 0.6 - 0.02;   // wide-open grin
  const onM = (a, y, out = 0) => { const s = Math.sqrt(Math.max(0, 1 - ((y - MC.y) / MR.y) ** 2));
    return new THREE.Vector3(MC.x + (MR.x * s + out) * Math.sin(a), y, MC.z + (MR.z * s + out) * Math.cos(a)); };
  const skin = (mesh, tanTest) => {                                                                                    // vertex colours: purple / tan jaw
    mesh.updateMatrix(); const g = mesh.geometry, p = g.attributes.position, v = new THREE.Vector3(), cols = [], cP = new THREE.Color(C.purple), cT = new THREE.Color(0xe8b8a0);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrix); const c = tanTest(v) ? cT : cP; cols.push(c.r, c.g, c.b); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  };
  const vc = new THREE.MeshLambertMaterial({ vertexColors: true });
  const cranium = ell(HCr.x, HCr.y, HCr.z, vc, HCc.x, HCc.y, HCc.z, 48); head.add(cranium);
  skin(cranium, () => false);
  const muzzle = ell(MR.x, MR.y, MR.z, vc, MC.x, MC.y, MC.z, 48); head.add(muzzle);
  skin(muzzle, v => { const a = Math.atan2(v.x - MC.x, v.z - MC.z); return Math.abs(a) < A0 + 0.25 ? v.y < upperY(Math.max(-A0, Math.min(A0, a))) + 0.07 : v.y < MC.y; });
  // mouth: dark red open grin carved as a strip on the muzzle surface, tongue, rows of teeth
  { const N = 40, pos = [], idx = [];
    const R = 10;                                                     // rows between the lips, so the strip follows the snout's curve
    for (let i = 0; i <= N; i++) { const a = -A0 + 2 * A0 * i / N; for (let j = 0; j <= R; j++) pos.push(...onM(a, upperY(a) + (lowerY(a) - upperY(a)) * j / R, 0.015).toArray()); }
    for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const k = i * (R + 1) + j, k2 = k + R + 1; idx.push(k, k + 1, k2, k + 1, k2 + 1, k2); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const cols = [], cIn = new THREE.Color(0x6a1232), cTongue = new THREE.Color(0xd8506e);
    for (let i = 0; i <= N; i++) { const a = -A0 + 2 * A0 * i / N; for (let j = 0; j <= R; j++) { const tg = j / R > 0.62 && Math.abs(a) < A0 * 0.42; const c = tg ? cTongue : cIn; cols.push(c.r, c.g, c.b); } }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    head.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))); }
  // teeth: flat triangles lying ON the snout surface, base on the lip line, tip pointing into the mouth along the surface
  const toothMat = new THREE.MeshLambertMaterial({ color: 0xfff3e4, side: THREE.DoubleSide });
  const toothGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(0, 1, 0)]); toothGeo.computeVertexNormals();
  const tooth = (a, yBase, yTip, w) => {
    const base = onM(a, yBase, 0.05), tip = onM(a, yTip, 0.05), up = tip.clone().sub(base), len = up.length(); up.normalize();
    const nrm = new THREE.Vector3((base.x - MC.x) / MR.x ** 2, (base.y - MC.y) / MR.y ** 2, (base.z - MC.z) / MR.z ** 2).normalize();
    const side = new THREE.Vector3().crossVectors(up, nrm).normalize(), n2 = new THREE.Vector3().crossVectors(side, up);
    const t = new THREE.Mesh(toothGeo, toothMat); t.matrixAutoUpdate = false;
    t.matrix.makeBasis(side.multiplyScalar(w), up.multiplyScalar(len), n2).setPosition(base); head.add(t);
  };
  for (let i = 0; i < 13; i++) {                                     // upper row
    const a = -A0 * 0.82 + 2 * A0 * 0.82 * i / 12, open = upperY(a) - lowerY(a), k = 1 - 0.4 * Math.abs(a / A0);
    tooth(a, upperY(a), upperY(a) - Math.min(0.3 * k, open * 0.42), 0.2 * k);
  }
  for (let i = 0; i < 10; i++) {                                     // lower row
    const a = -A0 * 0.66 + 2 * A0 * 0.66 * i / 9, open = upperY(a) - lowerY(a), k = 1 - 0.4 * Math.abs(a / A0);
    tooth(a, lowerY(a), lowerY(a) + Math.min(0.24 * k, open * 0.35), 0.17 * k);
  }

  // nose: purple bump on top of the snout with two dark nostrils
  const nose = ell(0.4, 0.18, 0.3, lam(C.purple), MC.x, MC.y + MR.y * 0.66, MC.z + MR.z * 0.68); head.add(nose);
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), lam(0x2a1440)); n.position.set(MC.x + s * 0.13, MC.y + MR.y * 0.7, MC.z + MR.z * 0.68 + 0.27); head.add(n); }
  // eyes: big white eyeball, blue iris, black pupil, highlight; angry purple brow ridge over each
  const crZ = (x, y) => HCc.z + HCr.z * Math.sqrt(Math.max(0, 1 - ((x - HCc.x) / HCr.x) ** 2 - ((y - HCc.y) / HCr.y) ** 2));
  for (const s of [-1, 1]) {
    const ex = HCc.x + s * 0.55, ey = fy(186), ez = crZ(ex, ey) - 0.08, look = new THREE.Vector3(s * 0.12, 0, 1).normalize();
    const eye = new THREE.Group(); eye.position.set(ex, ey, ez); eye.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), look); head.add(eye);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.33, 24, 16), lam(0xffffff)); ball.scale.set(1, 1.1, 0.75); eye.add(ball);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), new THREE.MeshLambertMaterial({ color: 0x1f8ee8 })); iris.scale.set(1, 1.1, 0.4); iris.position.set(-s * 0.04, -0.02, 0.22); eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), lam(0x0a0a14)); pupil.scale.set(1, 1.1, 0.4); pupil.position.set(-s * 0.04, -0.02, 0.27); eye.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(-s * 0.02 + 0.05, 0.06, 0.3); eye.add(glint);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 6, 12), lam(C.purpleDark)); brow.rotation.z = Math.PI / 2 + s * 0.42;   // slants down toward the nose: angry
    brow.position.set(ex - s * 0.04, ey + 0.34, crZ(ex, ey + 0.34) + 0.02); head.add(brow);
  }
  // teal cheek fins (side view: three leaves pointing back behind the cheek)
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 4), lam(k % 2 ? C.teal : C.tealDark)), head);
    f.scale.set(1, 1, 0.35); f.position.set(s * 118 * U, fy(195 + k * 22), sz(300));
    f.rotation.set(-1.2 + k * 0.25, 0, s * (1.1 - k * 0.15));
  }

  // ---------- crystals: glowing blue shards along the spine: 3 rows on the head, one row down the back and tail ----------
  const crystalMat = new THREE.MeshStandardMaterial({ color: C.crystal, emissive: 0x1f6dff, emissiveIntensity: 2.4, roughness: 0.25, metalness: 0.1, flatShading: true });
  const coreMat = new THREE.MeshBasicMaterial({ color: C.crystalCore });
  // leaf profile: widest a third of the way up, long sharp tip (the drawing's crystals), 4 faces -> faceted
  const LEAF = new THREE.LatheGeometry([[0, 0], [0.55, 0.18], [0.5, 0.45], [0.26, 0.75], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 4);
  const shard = (pos, dir, len, w) => {
    const g = new THREE.Group(); g.position.copy(pos); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const s = add(new THREE.Mesh(LEAF, crystalMat), g); s.scale.set(w * 1.45, len, w * 0.6);
    const core = new THREE.Mesh(LEAF, coreMat); core.scale.set(w * 0.6, len * 0.72, w * 0.72); core.position.y = len * 0.1; g.add(core);
    root.add(g); return g;
  };
  // one arc of wide leaf crystals along the spine (read off the side view), alternating a little left/right so the
  // front view fans out; the head ones also get a smaller pair either side
  const spine = new THREE.CatmullRomCurve3([[205, 100], [262, 108], [312, 150], [340, 220], [356, 295], [368, 365], [395, 422], [450, 447], [500, 442], [532, 424]]
    .map(([x, y]) => new THREE.Vector3(0, fy(y), sz(x))));
  const NC = 15;
  for (let i = 0; i < NC; i++) {
    const t = i / (NC - 1), p = spine.getPoint(t), tg = spine.getTangent(t);
    const out = new THREE.Vector3(0, -tg.z, tg.y); if (out.y < 0 && out.z > 0) out.negate(); out.normalize();
    const len = t < 0.3 ? 1.5 : 1.5 - (t - 0.3) * 1.55, tilt = (i % 2 ? 1 : -1) * 0.22;
    const dir = out.clone().add(new THREE.Vector3(tilt, 0.15, -0.25)).normalize();
    shard(p, dir, Math.max(0.35, len), Math.max(0.35, len) * 0.42);
    if (t < 0.32) for (const sx of [-1, 1]) shard(p.clone().add(new THREE.Vector3(sx * 0.38, -0.15, 0.05)), out.clone().add(new THREE.Vector3(sx * 0.9, 0.05, -0.1)).normalize(), len * 0.8, len * 0.34);
  }

  // ---------- neck, body, belly ----------
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.75, 20), lam(C.purple))).position.set(fx(285), fy(285), sz(262));          // neck
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.3, 24), lam(C.teal))).position.set(fx(285), fy(312), sz(270));             // turtleneck
  ell(78 * U, 95 * U, 78 * U, lam(C.purple), fx(288), fy(410), sz(265));                                                              // belly/torso
  // ---------- lab coat: open-front shell that flares, collar flaps, short sleeves, badges, glowing brooch ----------
  const coatMat = new THREE.MeshLambertMaterial({ color: C.coat, side: THREE.DoubleSide });
  const coat = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 1, 40, 8, true, Math.PI * 0.16, Math.PI * 1.68), coatMat));
  { const p = coat.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const t = 0.5 - p.getY(i); p.setZ(i, p.getZ(i) - t * t * 0.3); } coat.geometry.computeVertexNormals(); }   // hem sweeps back
  coat.scale.set(102 * U, (492 - 305) * U, 86 * U); coat.position.set(fx(288), fy(398), sz(272));                                            // gap (theta 0) faces the front
  for (const s of [-1, 1]) {
    const col = add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.08), coatMat)); col.position.set(fx(288) + s * 0.42, fy(300), sz(240)); col.rotation.set(-0.35, s * 0.55, s * 0.25);   // collar flaps
    const lap = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.0, 0.07), new THREE.MeshLambertMaterial({ color: C.coatShade, side: THREE.DoubleSide }))); lap.position.set(fx(288) + s * 0.5, fy(345), sz(272) + 0.88); lap.rotation.set(0.1, s * 0.6, s * -0.3);   // lapels
  }
  const brooch = add(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.brooch).multiplyScalar(1.4) })));
  brooch.rotation.x = Math.PI / 2; brooch.position.set(fx(290), fy(372), sz(272) + 0.98);
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.05, 10, 28), lam(0xbfc8d8))); ring.position.copy(brooch.position);
  const tri = (c) => { const sh = new THREE.Shape(); sh.moveTo(-0.17, 0.14); sh.lineTo(0.17, 0.14); sh.lineTo(0, -0.17); sh.closePath(); return new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); };
  const b1 = add(tri(C.purpleDark)); b1.position.set(fx(222), fy(395), sz(272) + 0.92); b1.rotation.y = -0.45;
  const b2 = add(tri(C.teal)); b2.position.set(fx(368), fy(388), sz(272) + 0.92); b2.rotation.y = 0.45;

  // ---------- arms: short sleeve, purple forearm, clawed hand (+ bracer on the right) ----------
  const limb = (a, b, r, mat) => { const d = b.clone().sub(a), m = add(new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 14), mat)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; };
  for (const s of [-1, 1]) {
    const sh = new THREE.Vector3(fx(285) + s * 112 * U, fy(330), sz(270)), el = new THREE.Vector3(fx(285) + s * 150 * U, fy(372), sz(250)), ha = new THREE.Vector3(fx(285) + s * 168 * U, fy(410), sz(225));
    const sleeve = limb(sh, el.clone().lerp(sh, 0.15), 0.27, coatMat);
    limb(el, ha, 0.2, lam(C.purple));
    const hand = ell(0.27, 0.26, 0.24, lam(C.purple), ha.x, ha.y - 0.05, ha.z);
    for (let k = -1; k <= 1; k++) { const cl = add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 8), lam(C.claw))); cl.position.set(ha.x + k * 0.12, ha.y - 0.28, ha.z + 0.12); cl.rotation.x = Math.PI + 0.4; }
    if (s > 0) { const br = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.3, 18), lam(C.purpleDark))); br.position.copy(el.clone().lerp(ha, 0.5)); br.quaternion.copy(sleeve.quaternion);
      for (let k = 0; k < 4; k++) { const dot = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam(C.teal))); const a = k / 4 * Math.PI - Math.PI / 2; dot.position.copy(br.position).add(new THREE.Vector3(Math.sin(a) * 0.05, Math.cos(a) * 0.1, 0.26)); } }
  }
  // ---------- legs + clawed feet ----------
  for (const s of [-1, 1]) {
    const hip = new THREE.Vector3(fx(288) + s * 55 * U, fy(470), sz(275)), ft = new THREE.Vector3(fx(288) + s * 75 * U, fy(530), sz(265));
    limb(hip, ft, 0.27, lam(C.purple));
    const foot = ell(0.34, 0.17, 0.42, lam(C.purple), ft.x, 0.17, ft.z + 0.12);
    for (let k = -1; k <= 1; k++) { const cl = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 8), lam(C.claw))); cl.position.set(ft.x + k * 0.15, 0.1, ft.z + 0.5); cl.rotation.x = Math.PI / 2; }
  }
  // ---------- tail along the lower spine ----------
  const tailCurve = new THREE.CatmullRomCurve3([[350, 420], [400, 462], [460, 472], [510, 452], [545, 418]].map(([x, y]) => new THREE.Vector3(0, fy(y), sz(x))));
  const tail = add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 32, 0.4, 12), lam(C.purple)));
  { const p = tail.geometry.attributes.position, c0 = tailCurve.getSpacedPoints(32); // taper toward the tip (Tube samples by arc length)
    for (let i = 0; i < p.count; i++) { const seg = Math.floor(i / 13), t = seg / 32, k = 1 - t * 0.85, ctr = c0[Math.min(32, seg)];
      p.setXYZ(i, ctr.x + (p.getX(i) - ctr.x) * k, ctr.y + (p.getY(i) - ctr.y) * k, ctr.z + (p.getZ(i) - ctr.z) * k); } p.needsUpdate = true; tail.geometry.computeVertexNormals(); }
  root.userData.head = head;
  return root;
}
