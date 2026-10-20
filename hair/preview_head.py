# Run: blender --background --python preview_head.py -> _front/_left/_back/_q.png (face + hair)
import bpy, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
for g in ("../face/face.glb", "hair.glb"): bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, g))
for m in bpy.data.materials:
    b = m.node_tree.nodes.get("Principled BSDF") if m.node_tree else None
    if b: m.diffuse_color = b.inputs["Base Color"].default_value
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = sc.render.resolution_y = 520
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.33, 0.4, 0.97); sc.view_settings.view_transform = 'Standard'
sh = sc.display.shading; sh.light = 'FLAT'; sh.color_type = 'TEXTURE'; sh.show_object_outline = True; sh.object_outline_color = (0, 0, 0)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 4.8
C = 0.65
for name, loc, rot in (("front", (0, -8, C), (math.pi/2, 0, 0)), ("left", (-8, 0, C), (math.pi/2, 0, -math.pi/2)),
                       ("back", (0, 8, C), (math.pi/2, 0, math.pi)), ("q", (-5.6, -5.6, C), (math.pi/2, 0, -math.pi/4)), ("up", (0, -7.5, C + 3.2), (math.radians(67), 0, 0)), ("upq", (-5.3, -5.3, C + 3.2), (math.radians(67), 0, -math.pi/4))):
    cam.location = loc; cam.rotation_euler = rot
    sh.light = 'STUDIO' if name.startswith('up') else 'FLAT'
    sc.render.filepath = os.path.join(HERE, "_%s.png" % name); bpy.ops.render.render(write_still=True)
