// Cyborg Mongrod: the future tyrant. Same body as the inventor, rebuilt: gunmetal armour where the lab coat was,
// crimson crystals, a red cyber eye + visor, metal jaw plate, a glowing reactor in the chest, mechanical right arm.
import * as THREE from "three";
import { buildMongrod } from "./mongrod.js";

export function buildCyborgMongrod() {
  const root = buildMongrod(), { crystalMat, coreMat, haloMat, coatMat } = root.userData.mats, head = root.userData.head;
  const metal = new THREE.MeshLambertMaterial({ color: 0x6b7283, side: THREE.DoubleSide });   // no env map: metalness renders black, so plain grey steel
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a3f4c });
  const glow = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.1) });   // brighter washes red out to orange under tone mapping
  // coat -> armour plating; crystals -> crimson; glows -> red
  coatMat.color.set(0x4a505e); coatMat.emissive = new THREE.Color(0x0a0c12);
  root.traverse(o => { if (o.isMesh && (o.material === coatMat || (o.material.color && o.material.color.getHex() === 0xcbb8ad))) o.material = metal; });   // coat + lapels
  crystalMat.emissive.set(0x8a0014); crystalMat.emissiveIntensity = 1.1;
  { const g = crystalMat.vertexColors; }
  root.traverse(o => { if (o.isMesh && o.material === crystalMat) {               // recolour the vertex gradient blue -> crimson
    const c = o.geometry.attributes.color; if (!c || o.geometry.userData.crimson) return;
    for (let i = 0; i < c.count; i++) { const r = c.getX(i), g = c.getY(i), b = c.getZ(i); c.setXYZ(i, b * 0.95, g * 0.15, r * 0.35 + 0.05); }
    c.needsUpdate = true; o.geometry.userData.crimson = true; } });
  coreMat.color.set(new THREE.Color(0xff6a6a).multiplyScalar(2.2));
  haloMat.color = new THREE.Color(0xff2a3a);
  root.userData.brooch.material = glow(0xff1020); root.userData.brooch.scale.setScalar(1.35);       // chest reactor
  // cyber eye: right eye replaced by a red lens in a metal socket, and a visor band across both
  const eyes = root.userData.eyes;
  if (eyes[1]) { const e = eyes[1]; e.material = glow(0xff1a1a); e.scale.multiplyScalar(1.15);
    const sock = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 10, 28), metal); e.parent.add(sock); sock.position.set(0, 0, 0.12); }
  if (eyes[0]) eyes[0].material = new THREE.MeshLambertMaterial({ color: 0xc81e2e });               // remaining eye goes red too
  // metal plate across the forehead (between the brows) with two red bolts
  const hb = new THREE.Box3().setFromObject(head), hc = hb.getCenter(new THREE.Vector3());
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.12), metal); plate.position.set(hc.x, hb.max.y - 0.55, hb.max.z - 0.95); plate.rotation.x = -0.35; head.parent.add(plate);
  for (const s of [-1, 1]) { const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow(0xff3030)); bolt.position.copy(plate.position).add(new THREE.Vector3(s * 0.25, 0, 0.08)); head.parent.add(bolt); }
  // mechanical right arm: plate the forearm + three glowing knuckle lights
  root.traverse(o => { if (o.isMesh && o.geometry.type === "CylinderGeometry" && o.position.x > 0.8 && o.position.y > 1.0 && o.position.y < 2.2) o.material = dark; });
  root.userData.cyborg = true;
  return root;
}
