# Run: blender --background --python preview.py -- <out_prefix>
# Renders base.glb from several angles (Workbench, fast) for visual comparison with the references.
import bpy, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
PREFIX = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "base.glb"))
for m in bpy.data.materials:
    b = m.node_tree.nodes.get("Principled BSDF") if m.node_tree else None
    if b: m.diffuse_color = b.inputs["Base Color"].default_value
TR = os.environ.get('TRAITS')
REPLACED = ("smile", "eye_", "pupil", "glint", "bang_", "tuft_top", "pocket", "nose", "cheek_")
for o in bpy.data.objects:
    if TR and o.name.startswith(REPLACED): o.hide_render = True
    if not TR and o.name.startswith("trait_"): o.hide_render = True
SKIN = {"purple": 0xec6aac, "spikeD": 0xd2498f, "spikeL": 0xf283bd}   # Skin: Pink
if TR:
    for m in bpy.data.materials:
        k = m.name.split(".")[0]
        if k in SKIN:
            h = SKIN[k]; c = [((h >> sh_ & 255)/255) ** 2.2 for sh_ in (16, 8, 0)]
            m.diffuse_color = (*c, 1)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = sc.render.resolution_y = 520
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.16, 0.77, 0.84)
sh = sc.display.shading; sh.light = 'FLAT'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True
sh.object_outline_color = (0.03, 0.03, 0.03); sh.show_specular_highlight = False
sc.render.film_transparent = False; sc.view_settings.view_transform = 'Standard'
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
tgt = bpy.data.objects.new("t", None); tgt.location = (0, 0, 1.25); sc.collection.objects.link(tgt)
c = cam.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
CLOSE = os.environ.get('CLOSE'); HEADV = os.environ.get('HEADV')
if HEADV: tgt.location = (0, 0, 2.05); sc.render.resolution_x = sc.render.resolution_y = 800; sc.world.color = (0.4, 0.42, 1.0)
if CLOSE: tgt.location = (0, 0, 1.75); sc.render.resolution_x = sc.render.resolution_y = 700
for az in ((0,) if HEADV else (0, 25) if CLOSE else (0, 40, 90, 180)):
    a = math.radians(az); D = 7.0 if HEADV else 4.2 if CLOSE else 7.6; cam.location = (D * math.sin(a), -D * math.cos(a), 2.05 if HEADV else 1.9 if CLOSE else 1.7)
    sc.render.filepath = os.path.join(HERE, "..", "_prev", "%s_%d.png" % (PREFIX, az)); bpy.ops.render.render(write_still=True)
