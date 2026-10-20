// Molandak: round purple fur ball, Pepe-style face, four little clawed paws. Built from the turnaround (refs/4bc7f159-...png).
// Units match the Chog (~4.4 tall). Origin at the ground, facing +z.
import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";

const U = 4.4 / 446;                                   // model units per turnaround pixel
const A = 229 * U, B = 203 * U, C = 237 * U;           // body semi-axes (front width, height, side depth)
const CY = (530 - 287) * U;                            // body centre height above the ground
const FUR = [0x8a52a4, 0x7d4796, 0x9a62b4, 0x6c3c84, 0xa874c0];

export function buildMolandak({ strands = 16000, faceUrl = "face.png" } = {}) {
  const root = new THREE.Group(), lib = {};
  // ---- body shell (smooth skin under the fur; shows around the eyes like the drawing's eyelids)
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshLambertMaterial({ color: 0x7d4796 }));
  shell.scale.set(A * 0.97, B * 0.97, C * 0.97); shell.position.y = CY; shell.castShadow = true; root.add(shell);
  const SN = { c: new THREE.Vector3(0, CY - 0.32, C * 0.67), r: new THREE.Vector3(1.38, 0.98, 0.8) };   // spans brow (CY+0.6) to lips (CY-1.1)   // front at ~C+0.3: sticks out past the fur like the side view
  const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshLambertMaterial({ color: 0x8a52a4 }));
  snout.scale.copy(SN.r); snout.position.copy(SN.c); snout.castShadow = true; root.add(snout);
  const DX = px => (170 + px - 309) * U, DY = py => CY + (287 - (235 + py)) * U;           // face.png pixel -> body coords
  const snoutZ = (x, y) => SN.c.z + SN.r.z * Math.sqrt(Math.max(0, 1 - ((x - SN.c.x) / SN.r.x) ** 2 - ((y - SN.c.y) / SN.r.y) ** 2));
  const inSnout = (p, pad) => ((p.x - SN.c.x) / (SN.r.x + pad)) ** 2 + ((p.y - SN.c.y) / (SN.r.y + pad)) ** 2 + ((p.z - SN.c.z) / (SN.r.z + pad)) ** 2 < 1;
  // ---- fur: thin tapered strands over the ellipsoid, pointing out with a little droop and random tilt
  const FACE = { x0: (170 - 309) * U, x1: (455 - 309) * U, y0: CY + (287 - 400) * U, y1: CY + (287 - 235) * U };
  const geo = new THREE.ConeGeometry(0.038, 1, 4, 1); geo.translate(0, 0.5, 0);
  const fur = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), strands);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  let seed = 3, n = 0; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bare = (p, nz) => nz > 0.2 && Math.abs(p.x) < (FACE.x1 - FACE.x0) / 2 * 0.93 && p.y > FACE.y0 + 0.08 && p.y < FACE.y1 - 0.12;
  for (let i = 0; n < strands && i < strands * 3; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const d = new THREE.Vector3(r * Math.cos(th), u, r * Math.sin(th));                  // direction on the unit sphere
    const onSnout = i % 5 === 0;                                                         // 1 in 5 samples go on the snout surface
    const E = onSnout ? SN.r : new THREE.Vector3(A, B, C), O = onSnout ? SN.c : new THREE.Vector3(0, CY, 0);
    const p = new THREE.Vector3(O.x + d.x * E.x * 0.96, O.y + d.y * E.y * 0.96, O.z + d.z * E.z * 0.96);
    const nrm = new THREE.Vector3(d.x / E.x, d.y / E.y, d.z / E.z).normalize();
    if (!onSnout && inSnout(p, 0.02)) continue;                                          // hidden inside the snout
    if (onSnout && (d.z < 0.1 || bare(p, nrm.z))) continue;                              // keep the face drawing clear
    const nearFace = onSnout || inSnout(p, 0.35);
    const len = (nearFace ? 0.1 : 0.16) + rnd() * (nearFace ? 0.08 : 0.16);           // short spiky fur like the drawing
    const dir = nrm.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5 - 0.25, rnd() - 0.5).multiplyScalar(0.4)).normalize();
    q.setFromUnitVectors(up, dir);
    m.compose(p, q, new THREE.Vector3(1 + rnd() * 0.6, len, 1 + rnd() * 0.6)); fur.setMatrixAt(n, m);
    col.setHex(FUR[Math.floor(rnd() * FUR.length)]).multiplyScalar(0.85 + rnd() * 0.3); fur.setColorAt(n, col); n++;
  }
  fur.count = n; fur.castShadow = true; root.add(fur); lib.fur = fur;
  // ---- face: decal from the front view, projected onto the shell
  new THREE.TextureLoader().load(faceUrl, tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    root.updateMatrixWorld(true);
    const w = FACE.x1 - FACE.x0, h = FACE.y1 - FACE.y0;
    const par = root.parent, keep = [root.position.clone(), root.quaternion.clone(), root.scale.clone()];   // the decal projects in world space: build it with the character at the origin
    par?.remove(root); root.position.set(0, 0, 0); root.quaternion.identity(); root.scale.setScalar(1); root.updateMatrixWorld(true);
    const g = new DecalGeometry(snout, new THREE.Vector3((FACE.x0 + FACE.x1) / 2, (FACE.y0 + FACE.y1) / 2, SN.c.z + SN.r.z), new THREE.Euler(), new THREE.Vector3(w, h, SN.r.z * 2));
    root.position.copy(keep[0]); root.quaternion.copy(keep[1]); root.scale.copy(keep[2]); par?.add(root);
    const decal = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    root.add(decal); lib.face = decal;
  });
  // ---- 3D lips: thick brown tube along the drawn lip line, sticking out (side view)
  const LIP = [[58, 137], [84, 136.8], [108, 133.2], [132, 125.1], [156, 123.9], [180, 128.5], [204, 133.8], [228, 136], [244, 137]];
  const lipPts = LIP.map(([x, y]) => { const X = DX(x), Y = DY(y); return new THREE.Vector3(X, Y, snoutZ(X, Y) + 0.05); });
  const lips = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts), 48, 0.11, 10), new THREE.MeshLambertMaterial({ color: 0x7a4a36 }));
  lips.scale.set(1, 1, 1); lips.castShadow = true; root.add(lips);
  for (const end of [lipPts[0], lipPts[lipPts.length - 1]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lips.material); c.position.copy(end); root.add(c); }
  // ---- heavy upper eyelids: purple caps over the top of each eye (the tired Pepe look)
  for (const [ex, ew] of [[82, 1.13], [208, 1.13]]) {
    const X = DX(ex), Y = DY(60);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x7c4694 }));
    lid.scale.set(ew / 2, 0.16, 0.22); lid.rotation.x = -Math.PI / 2 + 0.25; lid.position.set(X, Y, snoutZ(X, Y) + 0.02); lid.castShadow = true; root.add(lid);
  }
  // ---- paws: four flat purple feet with toes and dark claws (front view: x ±0.9; side view: front / back)
  const pawMat = new THREE.MeshLambertMaterial({ color: 0x6a3a86 }), clawMat = new THREE.MeshLambertMaterial({ color: 0x2a1436 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const paw = new THREE.Group(); paw.position.set(sx * 0.9, 0, sz * 0.95); paw.rotation.y = sx * 0.15;
    const sole = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), pawMat); sole.scale.set(1.15, 0.45, 1); sole.position.y = 0.17; paw.add(sole);
    for (let t = -1.5; t <= 1.5; t++) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), pawMat); toe.position.set(t * 0.17, 0.12, 0.36); paw.add(toe);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), clawMat); claw.rotation.x = Math.PI / 2; claw.position.set(t * 0.17, 0.1, 0.5); paw.add(claw);
    }
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.0, 14), new THREE.MeshLambertMaterial({ color: 0x7d4796 }));
    leg.position.y = 0.62; paw.add(leg);                                                 // reaches up inside the body
    for (let k = 0; k < 90; k++) {                                                       // fur on the leg
      const a = rnd() * Math.PI * 2, h = 0.2 + rnd() * 0.9, sp = new THREE.Vector3(Math.cos(a) * 0.38, h, Math.sin(a) * 0.38);
      const dir = new THREE.Vector3(Math.cos(a), -0.35, Math.sin(a)).normalize();
      const st = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: FUR[k % FUR.length] })); st.position.copy(sp);
      st.quaternion.setFromUnitVectors(up, dir); st.scale.set(1.2, 0.18 + rnd() * 0.12, 1.2); paw.add(st);
    }
    paw.traverse(o => o.isMesh && (o.castShadow = true)); root.add(paw); (lib.paws ||= []).push(paw);
  }
  lib.shell = shell; root.userData.lib = lib;
  return root;
}
