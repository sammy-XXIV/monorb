# Run: blender --background --python build_rig.py -> body_rig.glb (body parts skinned to a walk skeleton: hips, spine, thighs, shins, upper arms, forearms)
import bpy, os
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "body.glb"))
P = {o.name.split(".")[0]: o for o in bpy.data.objects if o.type == 'MESH'}
for o in P.values(): o.select_set(True)
bpy.context.view_layer.objects.active = P["torso"]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)   # vertices in world space (Blender: x, y=-depth, z=up)
def bounds(o):
    vs = [v.co for v in o.data.vertices]
    return Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))), Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
def top_bottom(o):  # centre of the top-most and bottom-most 8% of vertices
    lo, hi = bounds(o); h = hi.z - lo.z
    top = [v.co for v in o.data.vertices if v.co.z > hi.z - 0.08 * h]; bot = [v.co for v in o.data.vertices if v.co.z < lo.z + 0.08 * h]
    return sum(top, Vector()) / len(top), sum(bot, Vector()) / len(bot)

arm = bpy.data.armatures.new("rig"); rig = bpy.data.objects.new("rig", arm); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
def bone(name, head, tail, parent=None):
    b = arm.edit_bones.new(name); b.head, b.tail = head, tail; b.roll = 0
    if parent: b.parent = arm.edit_bones[parent]
    return b
tlo, thi = bounds(P["torso"]); cx, cy = (tlo.x + thi.x) / 2, (tlo.y + thi.y) / 2
hip_z = max(bounds(P["leg_L"])[1].z, bounds(P["leg_R"])[1].z) - 0.15
bone("hips", Vector((cx, cy, hip_z - 0.05)), Vector((cx, cy, hip_z + 0.35)))
bone("spine", Vector((cx, cy, hip_z + 0.35)), Vector((cx, cy, thi.z)), "hips")
for s in ("L", "R"):
    lt, lb = top_bottom(P["leg_" + s]); hip = Vector((lt.x, lt.y, hip_z)); ankle = Vector((lb.x, lb.y, lb.z + 0.12))
    knee = (hip + ankle) / 2 + Vector((0, -0.04, 0))                 # knee slightly forward so it bends the right way
    bone("thigh_" + s, hip, knee, "hips"); bone("shin_" + s, knee, ankle, "thigh_" + s)
    at, ab = top_bottom(P["arm_" + s]); sh = at + Vector((0, 0, -0.12)); hand = ab + Vector((0, 0, 0.08))
    elbow = (sh + hand) / 2 + Vector((0, 0.03, 0))                   # elbow slightly back so it bends forward
    bone("upperarm_" + s, sh, elbow, "spine"); bone("forearm_" + s, elbow, hand, "upperarm_" + s)
bpy.ops.object.mode_set(mode='OBJECT')

def bind(meshes):                                    # automatic (heat) weights
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
def bind_only(o, bones):                             # weights restricted to the given bones (keeps limbs from grabbing the wrong bone)
    bind([o])
    for vg in list(o.vertex_groups):
        if vg.name not in bones: o.vertex_groups.remove(vg)
    for v in o.data.vertices:                        # renormalise; verts left with nothing go to the first bone
        tot = sum(g.weight for g in v.groups)
        if tot < 1e-6: o.vertex_groups[bones[0]].add([v.index], 1.0, 'REPLACE')
bind_only(P["torso"], ["hips", "spine"])
for s in ("L", "R"):
    bind_only(P["leg_" + s], ["thigh_" + s, "shin_" + s])
    bind_only(P["arm_" + s], ["upperarm_" + s, "forearm_" + s])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "body_rig.glb"), export_format='GLB', export_skins=True, export_animations=False)
print("EXPORTED body_rig.glb", [b.name for b in arm.bones])
