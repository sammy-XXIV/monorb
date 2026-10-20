// Mouch: angel fly. Round head with a big-eyed smiling face, round fuzzy abdomen behind/below it, white feathered wings,
// six thin jointed legs, glowing halo. Built from refs/fly.png. Front px -> x = (px - 321) U, y = (515 - py) U ; side px -> z = (860 - sx) U.
import * as THREE from "three";

const U = 4.2 / 458;
const fx = px => (px - 321) * U, fy = py => (515 - py) * U, sz = sx => (860 - sx) * U;
const COL = { body: 0x9d5eb9, leg: 0x5a3488, hair: 0x3a1f52, wing: 0xffffff, halo: 0xffb84a };
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });

// feathered wing texture: white with two rows of soft grey scallops along the lower edge (v low = trailing edge)
const wingTex = (() => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#b9b6c8"; g.lineWidth = 4;
  for (const [y, n] of [[150, 5], [95, 4]]) for (let i = 0; i < n; i++) { const x = 70 + i * (400 / n) + (y < 120 ? 40 : 0); g.beginPath(); g.arc(x, y, 34, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

export function buildMouch() {
  const root = new THREE.Group(), add = (m, parent = root) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const HC = new THREE.Vector3(0, fy(232), sz(820)), HR = 112 * U;   // head sits in front of the abdomen (side view)
  const BC = new THREE.Vector3(0, fy(400), sz(950)), BR = new THREE.Vector3(135 * U, 92 * U, 125 * U);   // big round abdomen tucked under the head
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(HR, 64, 48), lam(COL.body))); head.position.copy(HC);
  const body = add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), lam(COL.body))); body.scale.copy(BR); body.position.copy(BC);
  // ---- face, all 3D (painted faces only work head-on): bulging oval eyes, pupils, pink lids, forehead crease, smile ----
  const onHead = (x, y, out = 0) => new THREE.Vector3(x, y, HC.z + Math.sqrt(Math.max(0, HR * HR - x * x - (y - HC.y) ** 2)) + out);
  const nrmAt = v => v.clone().sub(HC).normalize();
  // eyes, pink lids and forehead crease DRAWN on the head (flush, like the reference). Painted in longitude/latitude
  // space and wrapped onto the sphere, so the eyes keep their shape round the curve instead of smearing like a flat sticker.
  { const PX = 10.24, LON = 100, LAT = 60, W = Math.round(2 * LON * PX), H = Math.round(2 * LAT * PX);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
    const X = lon => (lon + LON) * PX, Y = lat => (LAT - lat) * PX;
    for (const s of [-1, 1]) {
      const cx = X(s * 43), cy = Y(1), rx = 42 * PX, ry = 18 * PX;
      g.fillStyle = "#e9a6e4"; g.beginPath(); g.ellipse(cx, Y(23), rx * 0.92, 4.5 * PX, 0, 0, Math.PI * 2); g.fill();              // pink lid band
      g.fillStyle = "#ffffff"; g.strokeStyle = "#140c1c"; g.lineWidth = 1.6 * PX;
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();                                          // eye white + outline
      g.fillStyle = "#0c0a10"; g.beginPath(); g.ellipse(X(s * 29), Y(-1), 14 * PX, 15.5 * PX, 0, 0, Math.PI * 2); g.fill();       // pupil, looking inward
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(X(s * 29) + 4.5 * PX, Y(5), 3 * PX, 0, Math.PI * 2); g.fill();            // glint
      g.strokeStyle = "#140c1c"; g.lineWidth = 1.2 * PX; g.beginPath(); g.ellipse(cx, Y(27), rx * 0.95, 6 * PX, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();   // brow line
    }
    g.strokeStyle = "#2a1638"; g.lineWidth = 1.1 * PX; g.beginPath(); g.moveTo(X(0), Y(70)); for (let k = 1; k <= 8; k++) g.lineTo(X(Math.sin(k * 1.3) * 1.5), Y(70 - k * 6)); g.stroke();   // forehead crease
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const cap = new THREE.SphereGeometry(HR * 1.004, 128, 96), p = cap.attributes.position, uv = cap.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, y, z);
      const lon = Math.atan2(x, z) * 180 / Math.PI, lat = Math.asin(y / r) * 180 / Math.PI;
      uv.setXY(i, Math.min(1, Math.max(0, (lon + LON) / (2 * LON))), Math.min(1, Math.max(0, (lat + LAT) / (2 * LAT)))); }
    const face = new THREE.Mesh(cap, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.3, 1.3, 1.3), transparent: true, alphaTest: 0.5 }));
    face.position.copy(HC); root.add(face); }
  { const pts = []; for (let i = 0; i <= 24; i++) { const px = 242 + 158 * i / 24, py = 271 + 30 * (1 - ((px - 321) / 79) ** 2); pts.push(onHead(fx(px), fy(py), -0.058)); }   // sunk: sticks out ~0.037 (was 0.125)
    const smile = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.095, 10), lam(0xd49482)));
    for (const e of [pts[0], pts[24]]) { const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), smile.material)); c.position.copy(e); } }
  const NECK = new THREE.Vector3(0, fy(335), sz(885)), headG = new THREE.Group(); headG.position.copy(NECK); root.add(headG);
  for (const o of root.children.slice()) if (o !== body && o !== headG) headG.attach(o);     // head, face, smile so far
  // ---- bristles: short dark hairs scattered over head top and abdomen ----
  const hairGeo = new THREE.ConeGeometry(0.012, 1, 3); hairGeo.translate(0, 0.5, 0);
  const hairs = new THREE.InstancedMesh(hairGeo, lam(COL.hair), 110), headHairs = new THREE.InstancedMesh(hairGeo, lam(COL.hair), 60), nH = { v: 0 }, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  let seed = 9, n = 0; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 600 && n < 110; i++) {
    const onTop = i % 3 === 0, d = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    if (onTop && (d.y < 0.35 || d.z > 0.55)) continue;                 // head: only the top, not over the face
    if (!onTop && d.y < -0.5) continue;
    const p = onTop ? HC.clone().addScaledVector(d, HR) : BC.clone().add(new THREE.Vector3(d.x * BR.x, d.y * BR.y, d.z * BR.z));
    const nrm = onTop ? d : new THREE.Vector3(d.x / BR.x, d.y / BR.y, d.z / BR.z).normalize();
    q.setFromUnitVectors(up, nrm); m4.compose(onTop ? p.clone().sub(NECK) : p, q, new THREE.Vector3(1, 0.05 + rnd() * 0.05, 1));
    if (onTop) { if (nH.v < 60) headHairs.setMatrixAt(nH.v++, m4); } else hairs.setMatrixAt(n++, m4);
  }
  hairs.count = n; root.add(hairs); headHairs.count = nH.v; headG.add(headHairs);
  // ---- halo: glowing ring above the head ----
  const halo = new THREE.Mesh(new THREE.TorusGeometry(107 * U, 0.055, 12, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.halo).multiplyScalar(1.25) }));
  halo.rotation.x = Math.PI / 2; halo.position.set(0, fy(75), HC.z - 0.05); root.add(halo); root.userData.halo = halo;
  // ---- wings: scalloped angel wings from the upper back, out to the sides and back ----
  const wing = new THREE.Shape(), Lw = 2.5, Hw = 1.8;
  wing.moveTo(0, 0); wing.lineTo(0, Hw * 0.35);
  wing.quadraticCurveTo(Lw * 0.35, Hw * 1.05, Lw * 0.8, Hw * 0.92); wing.quadraticCurveTo(Lw * 1.08, Hw * 0.8, Lw, Hw * 0.42);   // round leading edge
  for (let i = 0; i < 4; i++) { const x0 = Lw * (1 - i * 0.24), x1 = Lw * (1 - (i + 1) * 0.24); wing.quadraticCurveTo((x0 + x1) / 2, Hw * (0.08 - i * 0.01), x1, Hw * 0.22); }   // scalloped trailing edge
  wing.lineTo(0, 0);
  const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 20 });
  wg.translate(0, 0, -0.03); { const p = wg.attributes.position, uv = wg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / Lw, p.getY(i) / Hw); }
  const wingMat = new THREE.MeshBasicMaterial({ map: wingTex, color: new THREE.Color(1.55, 1.55, 1.55) });   // pushed above 1: tone mapping brings it back to white   // flat bright white like the drawing (outline gives the edge)
  for (const s of [-1, 1]) {
    const x = new THREE.Vector3(s * 0.72, 0.32, -0.62).normalize();   // out, up and back: full wing in both front and side views
    const yv = new THREE.Vector3(0, 1, 0).addScaledVector(x, -x.y).normalize(), zv = new THREE.Vector3().crossVectors(x, yv);
    const pivot = new THREE.Group(); pivot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, yv, zv)); pivot.position.set(s * 0.45, fy(395), sz(905)); root.add(pivot);
    const flap = new THREE.Group(); pivot.add(flap); add(new THREE.Mesh(wg, wingMat), flap);   // flap: rotate about local y (root line)
    (root.userData.wings ||= []).push({ flap, s });
  }
  // ---- six thin jointed legs from the abdomen's underside ----
  const legMat = lam(COL.leg), tube = (a, b, r) => { const d = b.clone().sub(a), m = add(new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 4, 8), legMat)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up, d.normalize()); };
  for (const s of [-1, 1]) for (const [k, zo] of [[0, 0.75], [1, 0], [2, -0.75]]) {
    const hip = new THREE.Vector3(s * 0.45, BC.y - BR.y * 0.75, BC.z + zo * 0.9);
    const knee = hip.clone().add(new THREE.Vector3(s * 0.55, 0.12, zo * 0.25)), foot = new THREE.Vector3(s * (1.15 + 0.1 * k), 0.06, BC.z + zo * 1.35);
    const before = root.children.length;
    tube(hip, knee, 0.05); tube(knee, foot, 0.045);
    const f = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), legMat)); f.scale.set(1, 0.6, 1.3); f.position.copy(foot);
    const legG = new THREE.Group(); legG.position.copy(hip); root.add(legG);
    for (const o of root.children.slice(before, before + 3)) legG.attach(o);
    (root.userData.legs ||= []).push({ g: legG, s, k });
  }
  // ---- animation: fast fly flap + hover; call every frame. Legs dangle a bit while airborne. ----
  root.userData.headG = headG; root.userData.body = body;
  root.userData.animate = (t, airborne = 1) => {
    for (const { flap, s } of root.userData.wings) flap.rotation.y = s * (-0.15 + Math.sin(t * 2 * Math.PI * 13) * 0.75) * airborne;   // ~13 beats/s
    // head: curious tilts and nods, lagging the body a little
    headG.rotation.set(Math.sin(t * 1.9) * 0.12 + Math.sin(t * 13 * 2 * Math.PI) * 0.01 * airborne, Math.sin(t * 0.8) * 0.25, Math.sin(t * 1.3 + 1) * 0.14);
    // abdomen: breathing squash / stretch, wobbles with the wing beat
    const br = 1 + Math.sin(t * 3) * 0.035, wb = Math.sin(t * 13 * 2 * Math.PI) * 0.012 * airborne;
    body.scale.set(BR.x * (br + wb), BR.y / br, BR.z * (br - wb));
    // legs: dangle and paddle while flying, each out of phase
    for (const { g, s, k } of root.userData.legs) { const ph = t * 4.5 + k * 1.3 + (s > 0 ? Math.PI : 0);
      g.rotation.set(Math.sin(ph) * 0.35 * airborne, 0, s * (0.15 + Math.cos(ph) * 0.12) * airborne); }
  };
  return root;
}
