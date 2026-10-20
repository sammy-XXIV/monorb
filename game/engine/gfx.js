// Rendering: shadows, outline pass (ID-based, only on registered parts), bloom, tone mapping.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let nextId = 1;
// mark a mesh as outlined; meshes sharing an id get no line between them
export function outline(mesh, id = nextId++) {
  const c = new THREE.Color().setRGB((id * 37 % 251) / 255, ((id * 53) % 241) / 255, 0.5, THREE.LinearSRGBColorSpace);
  const m = mesh.material || {};
  mesh.userData.idMat = new THREE.MeshBasicMaterial({ color: c, side: m.side ?? THREE.FrontSide, polygonOffset: !!m.polygonOffset,
    polygonOffsetFactor: m.polygonOffsetFactor || 0, polygonOffsetUnits: m.polygonOffsetUnits || 0 });
  return mesh;
}

// id-pass material for un-outlined meshes: same colour as the cleared background, so no edge is drawn against it
const occluders = {};
const occluder = side => occluders[side] ??= new THREE.MeshBasicMaterial({ color: 0x000000, side });

class OutlinePass extends Pass {
  constructor(scene, camera) {
    super(); this.scene = scene; this.camera = camera; this.parts = [];
    this.rtColor = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
    this.rtId = new THREE.WebGLRenderTarget(1, 1);
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tColor: { value: this.rtColor.texture }, tId: { value: this.rtId.texture }, px: { value: new THREE.Vector2() }, W: { value: 1.1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: `uniform sampler2D tColor, tId; uniform vec2 px; uniform float W; varying vec2 vUv;
        void main(){
          vec4 col = texture2D(tColor, vUv); vec3 id0 = texture2D(tId, vUv).rgb; float hit = 0.0;
          for (int i = 0; i < 16; i++) { float a = float(i) * 0.3927; vec3 o = texture2D(tId, vUv + vec2(cos(a), sin(a)) * px * W).rgb;
            hit += step(0.004, abs(o.r - id0.r) + abs(o.g - id0.g)); }
          gl_FragColor = vec4(mix(col.rgb, vec3(0.004), smoothstep(0.0, 0.35, hit / 16.0)), 1.0);
        }` }));
  }
  setSize(w, h) { this.rtColor.setSize(w, h); this.rtId.setSize(w, h); this.quad.material.uniforms.px.value.set(1 / w, 1 / h); }
  render(renderer, writeBuffer) {
    const { scene, camera } = this;
    renderer.setRenderTarget(this.rtColor); renderer.render(scene, camera);
    const bg = scene.background, fog = scene.fog, hidden = []; scene.background = null; scene.fog = null;
    const sm = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false;
    // un-outlined solid meshes still block the view (drawn with the background id, so they get no lines themselves);
    // only particles, sprites, lines and see-through effects are left out
    const blockers = [];
    scene.traverse(o => {
      if (!o.visible || o.userData.idMat) return;
      const mats = [].concat(o.material || []);
      if (o.userData.noOutline || o.isPoints || o.isSprite || o.isLine || (o.isMesh && mats.some(m => m.transparent || m.blending === THREE.AdditiveBlending))) { o.visible = false; hidden.push(o); }
      else if (o.isMesh) { blockers.push([o, o.material]); o.material = Array.isArray(o.material) ? o.material.map(m => occluder(m.side)) : occluder(o.material.side); }
    });
    const live = this.parts.filter(m => m.visible);
    live.forEach(m => { m.userData.mat = m.material; m.material = m.userData.idMat; });
    renderer.setRenderTarget(this.rtId); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    live.forEach(m => m.material = m.userData.mat); hidden.forEach(o => o.visible = true); blockers.forEach(([o, m]) => o.material = m);
    scene.background = bg; scene.fog = fog; renderer.shadowMap.enabled = sm;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
}

export function createGfx(container, scene, camera, { lineWidth = 1.1 } = {}) {   // lineWidth: outline radius in CSS px
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  const outlinePass = new OutlinePass(scene, camera); composer.addPass(outlinePass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.45, 1.0);   // threshold 1.0: only truly glowing things bloom (not the cream face)
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  function resize() {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    outlinePass.quad.material.uniforms.W.value = lineWidth * renderer.getPixelRatio();
  }
  addEventListener("resize", resize); resize();
  return { renderer, bloom, composer, outlinePass, render: parts => { outlinePass.parts = parts; composer.render(); } };
}
