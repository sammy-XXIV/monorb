# Run: blender --background --python build_hair.py -> hair.glb (voxel hull -> remesh -> smooth)
import bpy, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
d = np.load(os.path.join(HERE, "hair_vox.npz")); v, f = d["v"], d["f"]
bpy.ops.wm.read_factory_settings(use_empty=True)
verts = [(x, -z, y) for x, y, z in v]                      # viewer space -> Blender
me = bpy.data.meshes.new("hair"); me.from_pydata(verts, [], f.tolist()); me.update()
o = bpy.data.objects.new("hair", me); bpy.context.collection.objects.link(o)
bpy.context.view_layer.objects.active = o; o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.001)
bpy.ops.object.mode_set(mode='OBJECT')
rm = o.modifiers.new("remesh", 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.022
sm = o.modifiers.new("smooth", 'CORRECTIVE_SMOOTH'); sm.factor = 1.0; sm.iterations = 28; sm.smooth_type = 'SIMPLE'; sm.use_only_smooth = True
dc = o.modifiers.new("decimate", 'DECIMATE'); dc.ratio = 0.35
for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth()
mat = bpy.data.materials.new("hair"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = ((0x5a/255)**2.2, (0x38/255)**2.2, (0xb8/255)**2.2, 1)
mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0
o.data.materials.append(mat)
# ---- ink strokes projected onto the hair surface (front, back, both sides) ----
import json
from mathutils import Vector
ink2d = json.load(open(os.path.join(HERE, "ink2d.json")))
dg = bpy.context.evaluated_depsgraph_get(); sc_ = bpy.context.scene
def V(x, y, z): return Vector((x, -z, y))                    # viewer -> Blender
def hit(origin, direction):
    ok, loc, nrm, *_ = sc_.ray_cast(dg, origin, direction)
    return (loc + nrm * 0.012) if ok else None
curves = []
for s in ink2d:
    for side in ((1, -1) if s["view"] == "side" else (1, -1)):
        pts = []
        for a_, b_ in s["pts"]:
            if s["view"] == "front": p = hit(V(a_, b_, 6 * side), V(0, 0, -side))      # front (+z) and back (-z) of the hair
            else: p = hit(V(6 * side, b_, a_), V(-side, 0, 0))                         # right and left side
            if p is not None: pts.append(p)
        if len(pts) >= 4: curves.append(pts)
cu = bpy.data.curves.new("ink", 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.014; cu.bevel_resolution = 2
for pts in curves:
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for k, p in enumerate(pts): sp.points[k].co = (p.x, p.y, p.z, 1); sp.points[k].radius = 1.0 - 0.8 * k / (len(pts) - 1)   # tapers to the inner end
ink = bpy.data.objects.new("ink", cu); bpy.context.collection.objects.link(ink)
bpy.ops.object.select_all(action='DESELECT'); ink.select_set(True); bpy.context.view_layer.objects.active = ink; bpy.ops.object.convert(target='MESH')
im = bpy.data.materials.new("ink"); im.use_nodes = True; im.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.005, 0.005, 0.005, 1)
ink.data.materials.append(im); print("ink curves", len(curves))
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "hair.glb"), export_format='GLB')
print("EXPORTED hair.glb", len(o.data.vertices), "verts")
