# Run: blender --background --python build_body.py -> body.glb (torso + arms as separate meshes, so each gets its own outline)
import bpy, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
mat = bpy.data.materials.new("body"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = ((0x5a/255)**2.2, (0x38/255)**2.2, (0xb8/255)**2.2, 1)
mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0
for name in ("torso", "leg_L", "leg_R", "arm_L", "arm_R"):
    d = np.load(os.path.join(HERE, name + "_vox.npz")); v, f = d["v"], d["f"]
    me = bpy.data.meshes.new(name); me.from_pydata([(x, -z, y) for x, y, z in v], [], f.tolist()); me.update()   # viewer -> Blender
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.001)
    bpy.ops.object.mode_set(mode='OBJECT')
    rm = o.modifiers.new("remesh", 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.022
    sm = o.modifiers.new("smooth", 'CORRECTIVE_SMOOTH'); sm.factor = 1.0; sm.iterations = 20; sm.smooth_type = 'SIMPLE'; sm.use_only_smooth = True
    dc = o.modifiers.new("decimate", 'DECIMATE'); dc.ratio = 0.35
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.shade_smooth(); o.data.materials.append(mat)
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    print(name, len(o.data.vertices), "verts")
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "body.glb"), export_format='GLB')
print("EXPORTED body.glb")
