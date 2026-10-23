// Shared toolkit for story chapters 3-10: scene helpers, the cast, and a standard level object.
import * as THREE from "three";
import { KIT, preload, spawn, animate } from "../../engine/assets.js";
import { outline } from "../../engine/gfx.js";
import { glowSprite, drift } from "../../engine/fx.js";
import { outlineCharacter, mergeDecor } from "../common.js";
import { buildMolandak } from "../../../molandak/molandak.js";
import { buildMoyaki } from "../../../moyaki/moyaki.js";
import { buildSalmonad } from "../../../salmonad/salmonad.js";
import { buildMouch } from "../../../mouch/mouch.js";
import { buildMongrod } from "../../../mongrod/mongrod.js";
import { buildCyborgMongrod } from "../../../mongrod/cyborg.js";
import { buildRilla } from "../../../rilla/rilla.js";
import { createGuard, stepGuard, canSee, seesCones } from "../../engine/stealth.js";
import { fightPlatform } from "../../engine/fight.js";

export { THREE, KIT, preload, spawn, animate, outline, glowSprite, drift, fightPlatform };
export const N = KIT.nature, G = KIT.grave, P = KIT.plat;

// height (world units) each character is fitted to, and whether its fur needs one outline id (see outlineCharacter)
const CAST = {
  molandak: { h: 4.6, single: true }, moyaki: { h: 3.5 }, salmonad: { h: 5.0 }, mouch: { h: 3.0 },
  mongrod: { h: 8.0 }, cyborg: { h: 10.5 }, rilla: { h: 9.0 }, rillaGuard: { h: 6.2 }, guardian: { h: 11 },
};

export async function createKit(scene, phys) {
  const root = new THREE.Group(); scene.add(root);
  const parts = [], updaters = [], decor = [];
  const add = (o, { collide = null, outlined = false, shrink = 1, merge = false } = {}) => {
    root.add(o); if (merge) decor.push(o);
    if (outlined) o.traverse(m => m.isMesh && (outline(m), parts.push(m)));
    if (collide) phys.fromObject(o, { kind: collide, shrink });
    return o;
  };
  // scale to height h, but never wider than maxW: a flat, wide rock sized only by height would become a giant wall (and a giant invisible collider)
  const fit = (o, h, maxW = h * 2.2) => { const b = new THREE.Box3().setFromObject(o); o.scale.multiplyScalar(h / (b.max.y - b.min.y));
    const c = new THREE.Box3().setFromObject(o), w = Math.max(c.max.x - c.min.x, c.max.z - c.min.z); if (w > maxW) o.scale.multiplyScalar(maxW / w); return o; };
  const face = (o, x, z) => { o.rotation.y = Math.atan2(x - o.position.x, z - o.position.z); return o; };
  let seed = 41; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // an outlined box with an optional collider (walls, floors, furniture). Position = centre; size = full width/height/depth.
  const box = (x, y, z, w, h, d, color, { collide = true, outlined = false, tex = null, side = THREE.FrontSide } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, map: tex, side })); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; root.add(m);
    if (outlined) { outline(m); parts.push(m); } if (collide) phys.box(x, y, z, w / 2, h / 2, d / 2); return m;
  };
  const cyl = (x, y, z, r, h, color, { collide = true, outlined = false, seg = 24 } = {}) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; root.add(m);
    if (outlined) { outline(m); parts.push(m); } if (collide) phys.cylinder(x, y, z, r, h / 2); return m;
  };
  const sky = (bg, fog, density = 0.006) => { scene.background = new THREE.Color(bg); scene.fog = new THREE.FogExp2(fog, density); };
  const lights = ({ hemi = [0xffffff, 0x444444, 1.5], sun = null } = {}) => {
    root.add(new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]));
    if (sun) { const d = new THREE.DirectionalLight(sun.color, sun.i); d.position.set(...(sun.pos || [30, 60, 25])); d.castShadow = true; d.shadow.mapSize.set(1024, 1024);
      const r = sun.range || 40; Object.assign(d.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 200 }); d.shadow.bias = -0.0006; root.add(d, d.target); return d; }
  };
  const glow = (color, size, x, y, z, op = 0.9) => { const g = glowSprite(color, size); g.position.set(x, y, z); g.material.opacity = op; root.add(g); return g; };
  const ground = (r, color, y = 0, { collide = true, segs = 64 } = {}) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, segs), new THREE.MeshLambertMaterial({ color })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; root.add(m);
    if (collide) phys.box(0, y - 1, 0, r, 1, r); return m;
  };
  const text = (str, color = "#ffffff", w = 4, h = 1) => {   // a flat label plane (signs, runes)
    const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext("2d");
    g.fillStyle = color; g.font = `bold ${Math.round(c.height * 0.6)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(str, c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); };

  // characters: built, fitted, outlined; placed by the chapter
  const cast = async id => {
    let o; const c = CAST[id] || { h: 4 };
    if (id === "molandak") o = buildMolandak({ faceUrl: "../molandak/face.png", strands: 9000 });
    else if (id === "moyaki") o = buildMoyaki({ faceUrl: "../moyaki/face.png", lipPts: await (await fetch("../moyaki/lip.json")).json().catch(() => null) });
    else if (id === "salmonad") o = buildSalmonad();
    else if (id === "mouch") o = buildMouch();
    else if (id === "mongrod") o = buildMongrod();
    else if (id === "cyborg") o = buildCyborgMongrod();
    else if (id === "rilla" || id === "rillaGuard") o = buildRilla();
    else if (id === "guardian") o = buildGuardian();
    else if (id === "doctor") { o = await spawn(`${G}character-keeper.glb`); fit(o, 4.4); add(o, { outlined: true }); o.userData.anim = animate(o); o.userData.anim.play("idle"); return o; }
    fit(o, c.h); root.add(o); outlineCharacter(o, parts, !!c.single); return o;
  };

  // patrolling guards with vision cones. defs: [{ path, speed?, range?, angle?, model? }]. visible cones need visor / glass / laser eyes.
  const stealth = (defs, traits, makeModel) => {
    const showCones = seesCones(traits), guards = defs.map(d => createGuard(d));
    const view = guards.map(g => {
      const model = makeModel(g); root.add(model); outlineCharacterSafe(model);
      const cone = new THREE.Mesh(new THREE.CircleGeometry(g.range, 24, -g.angle + Math.PI / 2, g.angle * 2), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      cone.rotation.x = -Math.PI / 2; cone.visible = showCones; root.add(cone);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 24), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: showCones ? 0 : 0.35, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.visible = !showCones; root.add(ring);   // others only see a small warning ring around each guard
      return { g, model, cone, ring };
    });
    function outlineCharacterSafe(m) { outlineCharacter(m, parts, false); }
    return { guards, showCones, view,
      // returns true when the player was spotted this frame
      update(dt, px, pz, feetY, opts, groundY = 0) {
        let spotted = false;
        for (const v of view) { const g = v.g; stepGuard(g, dt);
          v.model.position.set(g.x, groundY, g.z); v.model.rotation.y = g.heading; v.cone.position.set(g.x, groundY + 0.06, g.z); v.cone.rotation.z = g.heading; v.ring.position.set(g.x, groundY + 0.06, g.z); v.ring.scale.setScalar(1 + Math.max(0, 1 - Math.hypot(px - g.x, pz - g.z) / (g.range * 1.2)) * 2);
          v.ring.material.opacity = showCones ? 0 : 0.15 + Math.max(0, 1 - Math.hypot(px - g.x, pz - g.z) / (g.range * 1.2)) * 0.55;
          if (Math.abs(feetY - groundY) < 3 && canSee(g, px, pz, opts)) { spotted = true; v.cone.material.opacity = 0.5; } else v.cone.material.opacity = 0.22; }
        return spotted; } };
  };

  // a fight stage + the actor list entry for a model: platform raised above the scenery so a fall really falls
  const stage = (o = {}) => fightPlatform(root, parts, o);
  const actor = (id, model, o = {}) => ({ id, model, name: o.name || id, team: o.team || "foe", perks: o.perks, ai: o.ai, baseY: o.baseY || 0 });
  const dummy = () => {   // a training dummy: straw body on a post, painted target on the chest
    const g = new THREE.Group(), lam = c => new THREE.MeshLambertMaterial({ color: c });
    const mk = (geo, c, p, sc = [1, 1, 1]) => { const m = new THREE.Mesh(geo, lam(c)); m.position.set(...p); m.scale.set(...sc); m.castShadow = true; g.add(m); outline(m); parts.push(m); return m; };
    mk(new THREE.CylinderGeometry(0.25, 0.3, 4, 10), 0x6b4a2f, [0, 2, 0]); mk(new THREE.SphereGeometry(1, 20, 14), 0xd8c070, [0, 3.7, 0], [1.1, 1.3, 0.9]); mk(new THREE.SphereGeometry(0.75, 18, 12), 0xe4d490, [0, 5.2, 0]);
    mk(new THREE.BoxGeometry(3.2, 0.5, 0.5), 0x6b4a2f, [0, 4.2, 0]);
    const t = mk(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 20), 0xb23a3a, [0, 3.7, 0.85], [1, 1, 1]); t.rotation.x = Math.PI / 2;
    const t2 = mk(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 20), 0xffffff, [0, 3.7, 0.86]); t2.rotation.x = Math.PI / 2;
    return g;
  };
  // restore a model after a fight so cutscenes can place it again
  const put = (o, x, y, z, lx, lz) => { o.position.set(x, y, z); o.rotation.set(0, lx !== undefined ? Math.atan2(lx - x, lz - z) : o.rotation.y, 0); o.visible = true; };

  return {
    root, parts, updaters, decor, add, fit, face, rnd, box, cyl, sky, lights, glow, ground, text, cast, stealth, stage, actor, dummy, put,
    finish() { mergeDecor(root, decor); },
    tick(t, dt) { for (const u of updaters) u(t, dt); },
    // the standard level object main.js drives; chapters pass what is specific to them
    level(extra) {
      return { root, parts, wisps: [], wispTotal: () => 0, chasing: () => false, checkpoint: { x: 0, z: 0 }, spawnPoint: { x: 0, y: 0, z: 0 }, active: false, ...extra,
        update(dt, player, feetY, spinning) { const t = (this._t = (this._t || 0) + dt); this.tick?.(t, dt); for (const u of updaters) u(t, dt); return this.active && extra.onUpdate ? extra.onUpdate(dt, player, feetY, spinning) || [] : []; } };
    },
  };
}

// a hulking stone guardian: block body, chunky arms, a carved head with glowing eyes. Faces +z. Built in code, ~11 units tall at scale 1 after fit().
export function buildGuardian() {
  const g = new THREE.Group(), lam = c => new THREE.MeshLambertMaterial({ color: c });
  const mk = (geo, c, p, s = [1, 1, 1], r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, lam(c)); m.position.set(...p); m.scale.set(...s); m.rotation.set(...r); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const B = new THREE.BoxGeometry(1, 1, 1);
  mk(B, 0x77708a, [-1.1, 1.6, 0], [1.5, 3.2, 1.6]); mk(B, 0x77708a, [1.1, 1.6, 0], [1.5, 3.2, 1.6]);          // legs
  mk(B, 0x8a83a0, [0, 5.2, 0], [4.2, 4.4, 2.6]);                                                              // torso
  mk(B, 0x6a6480, [0, 4.4, 1.35], [3.0, 2.0, 0.3]);                                                           // carved chest plate
  for (const x of [-1, 1]) { mk(B, 0x8a83a0, [x * 3.0, 5.6, 0], [1.7, 3.8, 1.7]); mk(B, 0x6f6985, [x * 3.0, 3.0, 0.2], [2.0, 1.6, 2.0]); mk(B, 0x77708a, [x * 2.6, 7.4, 0], [2.0, 1.1, 2.2]); }   // arms, fists, shoulders
  mk(B, 0x8a83a0, [0, 8.2, 0.2], [2.4, 2.2, 2.3]);                                                            // head
  mk(B, 0x6a6480, [0, 9.45, 0.25], [2.8, 0.4, 2.6]);                                                          // brow slab
  const eyes = []; for (const x of [-0.6, 0.6]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.2), new THREE.MeshBasicMaterial({ color: 0xc58bff })); e.position.set(x, 8.35, 1.42); g.add(e); eyes.push(e); }
  g.userData.eyes = eyes;
  for (const [x, y] of [[-1.2, 5.6], [1.1, 4.9], [0.1, 6.2]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0xa070ff })); r.position.set(x, y, 1.52); g.add(r); }   // glowing runes
  return g;
}
