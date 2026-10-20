// Outline renderer: every part gets an ID colour; a line is drawn wherever the ID changes on screen (constant ~2 px width).
import * as THREE from "three";

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const size = new THREE.Vector2();
  const rtColor = new THREE.WebGLRenderTarget(1, 1, { samples: 4 }), rtId = new THREE.WebGLRenderTarget(1, 1);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: rtColor.texture }, tId: { value: rtId.texture }, px: { value: new THREE.Vector2() }, W: { value: 1.1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform sampler2D tColor, tId; uniform vec2 px; uniform float W; varying vec2 vUv;
      void main(){
        vec4 col = texture2D(tColor, vUv); float id0 = texture2D(tId, vUv).r, hit = 0.0;
        for (int i = 0; i < 16; i++) { float a = float(i) * 0.3927; hit += step(0.002, abs(texture2D(tId, vUv + vec2(cos(a), sin(a)) * px * W).r - id0)); }
        gl_FragColor = vec4(mix(col.rgb, vec3(0.006), smoothstep(0.0, 0.35, hit / 16.0)), 1.0);
        #include <colorspace_fragment>
      }` });
  const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  function resize(camera) {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(size); rtColor.setSize(size.x, size.y); rtId.setSize(size.x, size.y);
    mat.uniforms.px.value.set(1 / size.x, 1 / size.y); mat.uniforms.W.value = 1.1 * renderer.getPixelRatio();
  }
  // parts: meshes with userData.idMat. Everything else in the scene is hidden during the ID pass (not outlined).
  function render(scene, camera, parts) {
    renderer.setRenderTarget(rtColor); renderer.render(scene, camera);
    const bg = scene.background, hidden = []; scene.background = null;
    scene.traverse(o => { if ((o.isMesh || o.isSprite || o.isPoints) && !o.userData.idMat && o.visible) { o.visible = false; hidden.push(o); } });
    parts.forEach(m => { m.userData.mat = m.material; m.material = m.userData.idMat; });
    renderer.setRenderTarget(rtId); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    parts.forEach(m => m.material = m.userData.mat); hidden.forEach(o => o.visible = true); scene.background = bg;
    renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  }
  return { renderer, resize, render };
}

let nextId = 1;
// give a mesh its own outline ID (or a shared one: same id -> no line between them)
export function outlineId(mesh, id = nextId++) {
  const c = new THREE.Color().setRGB((id * 37 % 251) / 255, 0.5, 0.5, THREE.LinearSRGBColorSpace);
  const m = mesh.material || {};
  mesh.userData.idMat = new THREE.MeshBasicMaterial({ color: c, side: m.side ?? THREE.FrontSide, polygonOffset: !!m.polygonOffset,
    polygonOffsetFactor: m.polygonOffsetFactor || 0, polygonOffsetUnits: m.polygonOffsetUnits || 0 });
  return mesh;
}
