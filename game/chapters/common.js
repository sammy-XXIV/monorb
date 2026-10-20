// Shared level helpers: outlines for code-built characters, and merging static decor into a few meshes.
import * as THREE from "three";
import { outline } from "../engine/gfx.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// outline every mesh of a code-built character: one id per colour (no lines inside a colour), crystals each their own
export function outlineCharacter(obj, parts, single = false) {   // single: whole character one id (fur: lines between strands would turn it black)
  const ids = new Map(); let nid = 7000 + Math.floor(Math.random() * 1000) * 50;
  obj.traverse(m => {
    if (!m.isMesh || m.material.transparent) return;
    if (m.isInstancedMesh) { m.userData.noOutline = true; m.castShadow = true; return; }   // fur / bristles: every strand would get its own outline
    const own = m.material.flatShading && m.material.vertexColors;
    const key = single ? "all" : own ? "c" + nid : "#" + (m.material.color ? m.material.color.getHexString() : m.uuid) + (m.material.vertexColors ? m.uuid : "");
    if (!ids.has(key)) ids.set(key, nid++);
    outline(m, ids.get(key)); m.castShadow = true; parts.push(m);
  });
}

// static, un-outlined props: hundreds of separate meshes -> one mesh per material
export function mergeDecor(root, decor) {
  { root.updateMatrixWorld(true); const groups = new Map(), done = [];
    for (const o of decor) o.traverse(m => { if (!m.isMesh || m.isSkinnedMesh || Array.isArray(m.material)) return;
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
      const key = m.material.uuid + "|" + Object.keys(g.attributes).sort().join(","); if (!groups.has(key)) groups.set(key, { mat: m.material, geos: [], shadow: m.castShadow });
      groups.get(key).geos.push(g); done.push(m); });
    for (const m of done) m.parent.remove(m);
    let n = 0; for (const { mat, geos, shadow } of groups.values()) { const merged = mergeGeometries(geos, false); if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = shadow; mesh.receiveShadow = true; root.add(mesh); n++; }
    console.log("decor merged:", done.length, "meshes ->", n); }
}
