"""Copy only what the browser game loads into dist/ (for static hosting). Run from the repo root: python tools/build_dist.py"""
import shutil, pathlib, glob
ROOT, OUT = pathlib.Path("."), pathlib.Path("dist")
if OUT.exists(): shutil.rmtree(OUT)
def cp(pattern):
    for f in glob.glob(pattern, recursive=True):
        p = pathlib.Path(f)
        if p.is_file() and not p.name.startswith("_"):
            d = OUT / p; d.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(p, d)
for pat in ["game/index.html", "game/*.js", "game/chapters/*.js", "game/engine/*.js", "game/cards/*.jpg",
            "game/assets/kenney_*/License.txt", "game/assets/kenney_*/Models/GLB format/**/*", "game/assets/kenney_nature-kit/Models/GLTF format/**/*",
            "game/assets/kenney_*/Audio/**/*.ogg",
            "body/traits.json", "body/body_rig.glb", "face/face.glb", "hair/hair.glb",
            "molandak/molandak.js", "molandak/face.png", "moyaki/moyaki.js", "moyaki/face.png", "moyaki/lip.json",
            "salmonad/salmonad.js", "mouch/mouch.js", "mongrod/mongrod.js", "mongrod/cyborg.js"]:
    cp(pat)
(OUT / "game/main_v1_prototype.js").unlink(missing_ok=True)
(OUT / "index.html").write_text('<!doctype html><meta charset="utf-8"><title>Monorb</title><meta http-equiv="refresh" content="0; url=game/index.html"><a href="game/index.html">Play Monorb</a>\n')
n = sum(1 for _ in OUT.rglob("*") if _.is_file()); size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
print(f"dist/: {n} files, {size / 1e6:.1f} MB")
