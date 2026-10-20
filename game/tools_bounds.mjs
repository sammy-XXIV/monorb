// node tools_bounds.mjs <glb...> : print bounding box size of each glb (from POSITION accessor min/max, node scales ignored)
import fs from "node:fs";
for (const f of process.argv.slice(2)) {
  const b = fs.readFileSync(f), len = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + len).toString());
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const m of j.meshes || []) for (const p of m.primitives) { const a = j.accessors[p.attributes.POSITION]; if (!a.min) continue; for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); } }
  console.log(f.split("/").pop().padEnd(34), "size", mx.map((v, i) => (v - mn[i]).toFixed(2)).join(" x "), " minY", mn[1].toFixed(2));
}
