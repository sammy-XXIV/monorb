// Mongrod (crystal dragon in a lab coat: the inventor who becomes the tyrant), built from refs/Neon Crystal Dragon Character Turnaround.png.
// Front-view pixel (px, py) -> x = (px - 285) * U, y = (548 - py) * U ; side-view pixel sx -> z = (277 - sx) * U. Faces +z, ~4.6 tall.
import * as THREE from "three";

const U = 4.6 / 443;
const fx = px => (px - 285) * U, fy = py => (548 - py) * U, sz = sx => (277 - sx) * U;
const C = { purple: 0x7352b5, purpleDark: 0x4e3590, coat: 0xe6d6cc, coatShade: 0xcbb8ad, teal: 0x1f8fb0, tealDark: 0x15607a,
            claw: 0xf0dcc8, crystal: 0x2a7dff, crystalCore: 0x9fd8ff, brooch: 0x3fe8ff };
const lam = c => new THREE.MeshLambertMaterial({ color: c });

export function buildMongrod() {
  const root = new THREE.Group(), add = (m, parent = root) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const ell = (rx, ry, rz, mat, x, y, z, seg = 32) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(12, Math.round(seg * 0.6))), mat)); m.scale.set(rx, ry, rz); m.position.set(x, y, z); return m; };

  // ---------- head: everything modelled in 3D (painted drawings only work head-on) ----------
  const head = new THREE.Group(); root.add(head);
  const HCc = new THREE.Vector3(fx(282), fy(185), sz(228)), HCr = new THREE.Vector3(125 * U, 90 * U, 92 * U);       // cranium
  const MC = new THREE.Vector3(fx(282), fy(252), sz(160)), MR = new THREE.Vector3(108 * U, 50 * U, 90 * U);   // tip at sx~78 like the side view          // muzzle
  const A0 = 95 * Math.PI / 180;                                                                                       // grin spans +-95 deg round the muzzle
  const upperY = a => MC.y + 0.12 + 0.18 * (a / A0) ** 2;                                                               // corners curl up
  const lowerY = a => upperY(a) - 0.46 * Math.max(0, 1 - (a / A0) ** 2) ** 0.6 - 0.02;   // wide-open grin
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
  const muzzle = ell(MR.x, MR.y, MR.z, vc, MC.x, MC.y, MC.z, 128); head.add(muzzle);   // dense: clean tan/purple border
  const bridge = ell(0.62, 0.38, 0.95, lam(C.purple), MC.x, MC.y + MR.y * 0.62, MC.z - 0.32, 40); head.add(bridge);   // snout ridge running up into the forehead
  skin(muzzle, v => { const a = Math.atan2(v.x - MC.x, v.z - MC.z); return Math.abs(a) < A0 + 0.3 ? v.y < upperY(Math.max(-A0, Math.min(A0, a))) + 0.16 : v.y < MC.y + 0.05; });   // thick tan upper lip + tan chin
  // mouth: a real opening. Cut the snout skin away inside the lip lines, then put a sunken cavity behind it.
  const inMouth = v => { const a = Math.atan2(v.x - MC.x, v.z - MC.z); return Math.abs(a) < A0 && v.y < upperY(a) - 0.005 && v.y > lowerY(a) + 0.005; };
  { muzzle.updateMatrix(); const g = muzzle.geometry, p = g.attributes.position, ix = g.index.array, keep = [], v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < ix.length; t += 3) { c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.add(v.fromBufferAttribute(p, ix[t + k]).applyMatrix4(muzzle.matrix)); c.multiplyScalar(1 / 3);
      if (!inMouth(c)) keep.push(ix[t], ix[t + 1], ix[t + 2]); }
    g.setIndex(keep); }
  { const N = 48, R = 12, pos = [], idx = [], cols = [], cIn = new THREE.Color(0x5a0f2a), cDeep = new THREE.Color(0x2a0614), cTongue = new THREE.Color(0xd8506e);
    for (let i = 0; i <= N; i++) { const a = -A0 + 2 * A0 * i / N, open = Math.max(0, 1 - (a / A0) ** 2);
      for (let j = 0; j <= R; j++) { const f = j / R, depth = 0.42 * Math.sin(Math.PI * f) * (0.35 + 0.65 * open);   // trough: deepest mid-mouth
        pos.push(...onM(a, upperY(a) + (lowerY(a) - upperY(a)) * f, 0.004 - depth).toArray());
        const c = f > 0.6 && Math.abs(a) < A0 * 0.45 ? cTongue : cIn.clone().lerp(cDeep, Math.sin(Math.PI * f)); cols.push(c.r, c.g, c.b); } }
    for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const k = i * (R + 1) + j, k2 = k + R + 1; idx.push(k, k + 1, k2, k + 1, k2 + 1, k2); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals();
    head.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))); }
  // teeth: 3D fangs rooted just inside each lip, pointing across the opening (they sit IN the mouth, lips frame them)
  const toothMat = lam(0xfff3e4);
  const fang = (a, yRoot, yTip, w) => {
    const root = onM(a, yRoot, -0.13), tip = onM(a, yTip, -0.2), d = tip.clone().sub(root), len = d.length();
    const t = new THREE.Mesh(new THREE.ConeGeometry(w, len, 4), toothMat); t.position.copy(root).addScaledVector(d, 0.5);
    t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); t.scale.z = 0.5; head.add(t);
  };
  for (let i = 0; i < 11; i++) { const a = -A0 * 0.68 + 2 * A0 * 0.68 * i / 10, open = upperY(a) - lowerY(a), k = 1 - 0.45 * Math.abs(a / A0);
    fang(a, upperY(a) + 0.02, upperY(a) - Math.min(0.28 * k, open * 0.45), 0.12 * k); }
  for (let i = 0; i < 8; i++) { const a = -A0 * 0.55 + 2 * A0 * 0.55 * i / 7, open = upperY(a) - lowerY(a), k = 1 - 0.45 * Math.abs(a / A0);
    fang(a, lowerY(a) - 0.02, lowerY(a) + Math.min(0.22 * k, open * 0.38), 0.1 * k); }

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
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.345, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), lam(C.purple));
    lid.scale.set(1, 1.1, 0.78); lid.rotation.z = s * 0.38; eye.add(lid);                                              // upper lid, slanted: angry look
    const lidLine = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 32, Math.PI), lam(0x241040)); lidLine.rotation.set(0, 0, s * 0.38); lidLine.scale.set(1, 0.45, 1); lidLine.position.z = 0.16; eye.add(lidLine);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 6, 12), lam(C.purpleDark)); brow.rotation.z = Math.PI / 2 + s * 0.42;   // slants down toward the nose: angry
    brow.position.set(ex - s * 0.04, ey + 0.34, crZ(ex, ey + 0.34) + 0.02); head.add(brow);
  }
  // teal cheek fins (side view: three leaves pointing back behind the cheek)
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4), lam(k % 2 ? C.teal : C.tealDark)), head);
    f.scale.set(1, 1, 0.5); f.position.set(s * HCr.x * 0.97, fy(205 + k * 20), sz(238));   // on the cheek, in front of the crystal crown
    const fd = new THREE.Vector3(s * 0.45, 0.25 - k * 0.3, -1).normalize();          // swept backwards (and a little out), fanning top->bottom
    f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fd); f.position.addScaledVector(fd, 0.32);
  }

  // ---------- crystals: glowing blue shards along the spine: 3 rows on the head, one row down the back and tail ----------
  // crystals: deep blue faceted leaves, bright cyan edge/core (the drawing's glow), vertex-gradient darker at the root
  const crystalMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x0b3cff, emissiveIntensity: 0.85, flatShading: true, vertexColors: true });
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xaef0ff).multiplyScalar(2.2) });
  const LEAF = new THREE.LatheGeometry([[0, 0], [0.5, 0.12], [0.56, 0.38], [0.36, 0.68], [0.12, 0.9], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 4);
  { const p = LEAF.attributes.position, cols = [];                                          // root dark -> tip bright
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), c = new THREE.Color(0x0a1f7a).lerp(new THREE.Color(0x1f6cff), Math.min(1, y * 1.6)).lerp(new THREE.Color(0x6fd4ff), Math.max(0, (y - 0.65) * 2.5)); cols.push(c.r, c.g, c.b); }
    LEAF.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); }
  // soft additive halo behind every leaf: bloom keys on brightness and blue barely counts, so the glow is painted in
  const haloTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(90,170,255,0.9)"); r.addColorStop(0.45, "rgba(40,110,255,0.35)"); r.addColorStop(1, "rgba(20,60,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const haloMat = new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 });
  const shard = (pos, dir, len, w) => {
    const g = new THREE.Group(); g.position.copy(pos); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const s = add(new THREE.Mesh(LEAF, crystalMat), g); s.scale.set(w, len, w * 0.8);   // chunky: facets catch the light
    const core = new THREE.Mesh(LEAF, coreMat); core.scale.set(w * 0.2, len * 0.7, w * 0.86); core.position.y = len * 0.1; g.add(core);   // pokes through both faces: glowing centre streak
    const halo = new THREE.Sprite(haloMat); halo.position.y = len * 0.5; halo.scale.set(len * 1.5, len * 1.7, 1); g.add(halo);
    root.add(g); return g;
  };
  // (1) crown: leaves all round the back half of the head, fanning out in the front view (ear -> top -> ear)
  for (let deg = -110; deg <= 110; deg += 20) {
    const r = deg * Math.PI / 180, d = new THREE.Vector3(Math.sin(r), Math.cos(r), -0.55).normalize();
    const p = HCc.clone().add(new THREE.Vector3(d.x * HCr.x * 0.7, d.y * HCr.y * 0.7, -HCr.z * 0.45));
    const len = 1.7 - Math.abs(deg) / 110 * 0.6; shard(p, d, len, len * 0.42);
  }
  // forehead leaf: the crest starts right above the brows (side view), so the top-front of the head isn't bare
  shard(HCc.clone().add(new THREE.Vector3(0, HCr.y * 0.78, HCr.z * 0.42)), new THREE.Vector3(0, 1, -0.3), 1.3, 0.56);
  // (2) spine ridge from the top of the head down the back (over the coat) to the tail tip, read off the side view
  const spine = new THREE.CatmullRomCurve3([[262, 105], [305, 135], [335, 190], [352, 255], [360, 320], [366, 380], [378, 410]]
    .map(([x, y]) => new THREE.Vector3(0, fy(y), sz(x))));
  { const ridge = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spine.getPoints(40).map(p => p.clone().add(new THREE.Vector3(0, 0, 0.12)))), 60, 0.32, 12), lam(C.purple)));   // spine ridge: no gap under the crystals
    const p = ridge.geometry.attributes.position; }
  const NC = 12;
  for (let i = 0; i < NC; i++) {
    const t = i / (NC - 1), p = spine.getPoint(t).add(new THREE.Vector3(0, 0, 0.18)), tg = spine.getTangent(t);   // root sunk into the body
    const out = new THREE.Vector3(0, -tg.z, tg.y); if (out.z > 0) out.negate(); out.normalize();                 // points up/back, away from the body
    const len = t < 0.45 ? 1.75 - t * 0.6 : 1.48 - (t - 0.45) * 2.1;
    shard(p, out.clone().add(new THREE.Vector3(0, 0.9, 0)).normalize(), Math.max(0.38, len), Math.max(0.38, len) * 0.44);
    // (3) flanking rows on the head and upper back: the dense bundle seen from behind
    if (t < 0.55) for (const sx of [-1, 1]) {
      const f = out.clone().add(new THREE.Vector3(sx * 0.85, 0.3, 0)).normalize();
      shard(p.clone().add(new THREE.Vector3(sx * 0.42, -0.1, 0.12)), f, len * 0.82, len * 0.38);
    }
  }

  // ---------- neck, body, belly ----------
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.9, 24), lam(C.purple))).position.set(fx(285), fy(288), sz(255));          // neck
  ell(0.7, 0.55, 0.6, lam(C.purple), fx(285), fy(282), sz(292));                                                                       // nape: back of head flows into the back
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.3, 24), lam(C.teal))).position.set(fx(285), fy(312), sz(270));             // turtleneck
  ell(92 * U, 100 * U, 84 * U, lam(C.purple), fx(288), fy(408), sz(262));                                                              // belly/torso
  // ---------- lab coat: open-front shell that flares, collar flaps, short sleeves, badges, glowing brooch ----------
  const coatMat = new THREE.MeshLambertMaterial({ color: C.coat, side: THREE.DoubleSide });
  const coat = add(new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.5, 1, 48, 8, true, Math.PI * 0.2, Math.PI * 1.6), coatMat));
  { const p = coat.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const t = 0.5 - p.getY(i); p.setZ(i, p.getZ(i) - t * t * 0.2); } coat.geometry.computeVertexNormals(); }   // hem sweeps back
  coat.scale.set(102 * U, (472 - 305) * U, 70 * U); coat.position.set(fx(288), fy(388), sz(272));                                            // gap (theta 0) faces the front
  for (const s of [-1, 1]) {
    const col = add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.7, 0.08), coatMat)); col.position.set(fx(288) + s * 0.66, fy(312), sz(268)); col.rotation.set(-0.25, s * 0.75, s * 0.45);   // collar flaps
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
    const sh = new THREE.Vector3(fx(285) + s * 112 * U, fy(330), sz(270)), el = new THREE.Vector3(fx(285) + s * 150 * U, fy(372), sz(250)), ha = new THREE.Vector3(fx(285) + s * 175 * U, fy(405), sz(195));
    const sleeve = limb(sh, el.clone().lerp(sh, 0.1), 0.34, coatMat);
    limb(el, ha, 0.25, lam(C.purple));
    const hand = ell(0.38, 0.34, 0.32, lam(C.purple), ha.x, ha.y - 0.1, ha.z);
    for (let k = -1; k <= 1; k++) { const cl = add(new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.32, 8), lam(C.claw))); cl.position.set(ha.x + k * 0.17, ha.y - 0.42, ha.z + 0.14); cl.rotation.x = Math.PI + 0.4; }
    if (s > 0) { const br = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.3, 18), lam(C.purpleDark))); br.position.copy(el.clone().lerp(ha, 0.5)); br.quaternion.copy(sleeve.quaternion);
      for (let k = 0; k < 4; k++) { const dot = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam(C.teal))); const a = k / 4 * Math.PI - Math.PI / 2; dot.position.copy(br.position).add(new THREE.Vector3(Math.sin(a) * 0.05, Math.cos(a) * 0.1, 0.26)); } }
  }
  // ---------- legs + clawed feet ----------
  for (const s of [-1, 1]) {
    const hip = new THREE.Vector3(fx(288) + s * 55 * U, fy(470), sz(275)), ft = new THREE.Vector3(fx(288) + s * 75 * U, fy(530), sz(265));
    limb(hip, ft, 0.37, lam(C.purple));
    const foot = ell(0.46, 0.22, 0.56, lam(C.purple), ft.x, 0.22, ft.z + 0.18);
    for (let k = -1; k <= 1; k++) { const cl = add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), lam(C.claw))); cl.position.set(ft.x + k * 0.22, 0.12, ft.z + 0.72); cl.rotation.x = Math.PI / 2; }
  }
  // ---------- tail along the lower spine ----------
  const tailCurve = new THREE.CatmullRomCurve3([[335, 400], [395, 448], [465, 462], [530, 446], [578, 405], [596, 370]].map(([x, y]) => new THREE.Vector3(0, fy(y), sz(x))));
  // smooth tail: dense tube tapering to a closed point (no open end), crystal row along its top
  const TS = 80, TR = 20;
  const tail = add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, TS, 0.55, TR), lam(C.purple)));
  { const p = tail.geometry.attributes.position, c0 = tailCurve.getSpacedPoints(TS);   // Tube samples by arc length
    for (let i = 0; i < p.count; i++) { const seg = Math.floor(i / (TR + 1)), t = seg / TS, k = Math.pow(1 - t, 0.75) * 0.97 + 0.03 * (1 - t), ctr = c0[Math.min(TS, seg)];
      p.setXYZ(i, ctr.x + (p.getX(i) - ctr.x) * k, ctr.y + (p.getY(i) - ctr.y) * k, ctr.z + (p.getZ(i) - ctr.z) * k); }
    p.needsUpdate = true; tail.geometry.computeVertexNormals(); }
  for (let i = 0; i < 9; i++) {
    const u = 0.12 + i * 0.095, pt = tailCurve.getPointAt(u), tg = tailCurve.getTangentAt(u);
    const out = new THREE.Vector3(0, -tg.z, tg.y); if (out.y < 0) out.negate(); out.normalize();
    const r = 0.55 * Math.pow(1 - u, 0.75), len = 1.0 - u * 0.65;
    shard(pt.clone().addScaledVector(out, r * 0.55), out.clone().add(tg.clone().multiplyScalar(0.35)).normalize(), len, len * 0.44);
  }
  root.userData.head = head; root.userData.mats = { crystalMat, coreMat, haloMat, coatMat }; root.userData.brooch = brooch;
  root.userData.eyes = []; head.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0x1f8ee8) root.userData.eyes.push(o); });
  return root;
}
