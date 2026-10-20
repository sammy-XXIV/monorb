# Run: blender --background --python build_base.py
# Builds the base Chog (no traits) and exports base.glb next to this file.
# Blender is Z-up, front = -Y; the glTF exporter converts to Y-up, front = +Z.
import bpy, math, os
from mathutils import Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "base.glb")
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, hex_):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    lin = lambda v: (v/255) ** 2.2
    b.inputs["Base Color"].default_value = (lin(hex_ >> 16 & 255), lin(hex_ >> 8 & 255), lin(hex_ & 255), 1)
    b.inputs["Roughness"].default_value = 1.0
    return m
M = {k: mat(k, v) for k, v in dict(purple=0x5a38b8, spikeD=0x432897, spikeL=0x6644c4, cream=0xf6efd2,
                                   pink=0xe0509a, cheek=0xd8408f, ink=0x0d0d0d, white=0xffffff,
                                   cap=0x8a4dff, capD=0x5a2bb0, orange=0xf39a1e, yellow=0xf6d98a, green=0x2fa83a, drool=0x3fb5f0).items()}

def finish(o, name, m):
    o.name = name; o.data.materials.append(M[m]); bpy.ops.object.shade_smooth(); return o
def sphere(name, m, loc, scale=(1, 1, 1), r=1.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=32, ring_count=20, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = scale; return finish(o, name, m)
def cyl(name, m, loc, r, depth, rot=(0, 0, 0), r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=32, location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, vertices=32, location=loc, rotation=rot)
    return finish(bpy.context.object, name, m)
def limb(name, m, a, b, r):
    a, b = Vector(a), Vector(b); mid = (a + b) / 2; d = b - a
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, vertices=24, location=mid)
    o = bpy.context.object; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    finish(o, name, m); sphere(name + "_a", m, a, r=r); sphere(name + "_b", m, b, r=r)

# coordinates are written in "viewer" space (x right, y up, z toward camera), then mapped to Blender
def P(x, y, z): return (x, -z, y)
HEAD = (0, 1.55, 0)
def H(x, y, z): return P(HEAD[0] + x, HEAD[1] + y, HEAD[2] + z)
def V(x, y, z): return Vector((x, -z, y))   # direction in Blender axes

import bmesh
# curved, tapered blade: quadratic bezier base->tip, flattened diamond cross-section (wide at base, point at tip)
def tuft(name, base, tip, sweep, width, thick, mat_name, n=10):
    base, tip, sweep = Vector(base), Vector(tip), Vector(sweep)
    ctrl = (base + tip) / 2 + sweep
    bm = bmesh.new(); rings = []
    for i in range(n + 1):
        t = i / n; p = (1-t)**2*base + 2*(1-t)*t*ctrl + t*t*tip
        tan = (2*(1-t)*(ctrl-base) + 2*t*(tip-ctrl)).normalized()
        ref = Vector((0, 0, 1))                                  # blade is flat toward the camera
        if abs(tan.dot(ref)) > 0.85: ref = Vector((0, 1, 0))
        side = tan.cross(ref).normalized(); nrm = side.cross(tan).normalized()
        w = width * (1 - t) ** 0.85 + 0.002; th = thick * (1 - t) ** 0.85 + 0.002
        rings.append([bm.verts.new(H(*(p + d))) for d in (side*w, nrm*th, -side*w, -nrm*th)])
    for a, b in zip(rings, rings[1:]):
        for k in range(4): bm.faces.new((a[k], a[(k+1) % 4], b[(k+1) % 4], b[k]))
    bm.faces.new(rings[0][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    c = sum((v.co for v in bm.verts), Vector()) / len(bm.verts)   # origin at the centre so the viewer outline scales in place
    bmesh.ops.translate(bm, vec=-c, verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p_ in me.polygons: p_.use_smooth = True
    o = bpy.data.objects.new(name, me); o.location = c; bpy.context.collection.objects.link(o); o.data.materials.append(M[mat_name]); return o

# ---- body: sloped-shoulder hoodie, hood, bent arms, legs ----
cyl("torso", "purple", P(0, 0.3, 0), 0.68, 0.9, r2=0.46)
sphere("shoulder_L", "purple", P(-0.5, 0.62, 0), r=0.21); sphere("shoulder_R", "purple", P(0.5, 0.62, 0), r=0.21)
bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.18, location=P(0, 0.76, 0.02), major_segments=32, minor_segments=14)
finish(bpy.context.object, "collar", "purple")
sphere("hood_back", "purple", P(0, 0.8, -0.3), (0.7, 0.34, 0.36))
sphere("pocket", "spikeD", P(0, 0.08, 0.6), (0.34, 0.06, 0.16))
for s, n in ((-1, "L"), (1, "R")):
    limb("leg_" + n, "purple", P(s*0.25, 0.0, 0), P(s*0.28, -0.4, 0.15), 0.16)
    sphere("foot_" + n, "pink", P(s*0.28, -0.5, 0.3), (0.2, 0.26, 0.09))
# hand on hip: shoulder -> elbow out -> hand at the waist
limb("arm_hip_up", "purple", P(0.5, 0.62, 0), P(0.9, 0.4, -0.05), 0.16); limb("arm_hip_lo", "purple", P(0.9, 0.4, -0.05), P(0.66, 0.14, 0.2), 0.15)
sphere("hand_hip", "pink", P(0.64, 0.1, 0.24), r=0.2)
# raised hand: shoulder -> elbow out -> forearm up in front
limb("arm_up_up", "purple", P(-0.5, 0.62, 0), P(-0.95, 0.5, 0.2), 0.16); limb("arm_up_lo", "purple", P(-0.95, 0.5, 0.2), P(-1.0, 1.0, 0.55), 0.15)
sphere("hand_raised", "pink", P(-1.0, 1.08, 0.58), r=0.22)

BEFORE_HEAD = set(bpy.data.objects)
# ---- head: one solid hair mass, a few broad swept-back spikes, bangs ----
# hair: ONE mass whose outline makes the 7 conjoined spikes of the official art
import json
# outline traced from the official avatar's pixels (trace_hair.py): radius per frontal angle, model units
_HO = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "hair_outline.json")))
_R = [1.06 * max(r, 0.9) for r in _HO["r"]]                         # +6% to match; blocked rays: hair stays hidden behind the face
for _ in range(2): _R = [(_R[i-2] + 2*_R[i-1] + 3*_R[i] + 2*_R[(i+1) % 360] + _R[(i+2) % 360]) / 9 for i in range(360)]   # smooth pixel noise
HC, RZ = Vector((_HO["centre"][0], _HO["centre"][1], -0.15)), 0.95
def hair_r(al):
    al %= 360; i = int(al); f = al - i
    return _R[i] * (1 - f) + _R[(i + 1) % 360] * f
def hair_base(al): return min(hair_r(al), 0.95)                   # rounded core; spikes grow out of it
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=256, ring_count=128, location=(0, 0, 0)); o = bpy.context.object
pts = []
for v in o.data.vertices:
    dx, dy, dz = v.co.x, v.co.z, -v.co.y                          # Blender local -> viewer direction
    rim = math.sqrt(max(0.0, 1 - dz*dz)); al = math.degrees(math.atan2(dy, dx))
    base = hair_base(al)
    r = base + (hair_r(al) - base) * rim ** 3                      # spikes strongest on the silhouette, thin toward front/back
    pts.append(Vector(H(HC.x + dx * r, HC.y + dy * r, HC.z + dz * RZ)))
c = sum(pts, Vector()) / len(pts)
for v, p_ in zip(o.data.vertices, pts): v.co = p_ - c
o.location = c; finish(o, "hair", "purple")
for i, x in enumerate((-0.15, 0.11)):   # the two small bang points on the forehead
    tuft("bang_%d" % i, (x, 0.62, 0.86), (x + 0.03, 0.36, 0.98), (0.02, 0.0, 0.03), 0.13, 0.05, "purple")

# ---- face: wide cream mask, big tilted eyes, cheeks, nose, smile ----
FC, FR = (0.0, -0.2, 0.7), (0.9, 0.68, 0.3)        # mask centre and radii (x, y, z)
def face_z(x, y):                       # surface of a rounded box: inner half-size (0.62, 0.22), corner radius 0.3
    dx = max(abs(x) - 0.6, 0.0); dy = max(abs(y - FC[1]) - 0.38, 0.0)
    return FC[2] + math.sqrt(max(0.3**2 - dx*dx - dy*dy, 0.0))
bpy.ops.mesh.primitive_cube_add(size=2, location=H(*FC)); fo = bpy.context.object; fo.scale = (FR[0], FR[2], FR[1])
bv = fo.modifiers.new("bevel", 'BEVEL'); bv.width = 0.3 / min(FR) ; bv.segments = 10; bv.limit_method = 'NONE'
finish(fo, "face", "cream")
for s, n in ((-1, "L"), (1, "R")):
    ex, ey = s*0.31, -0.1
    sphere("eye_" + n, "white", H(ex, ey, face_z(ex, ey) - 0.02), (0.19, 0.08, 0.235), rot=(0, s*0.15, 0))
    sphere("pupil_" + n, "ink", H(ex + 0.05, ey - 0.02, face_z(ex, ey) + 0.05), (0.15, 0.06, 0.19), rot=(0, s*0.15, 0))
    sphere("glint_" + n, "white", H(ex + 0.05 + 0.05, ey + 0.07, face_z(ex, ey) + 0.1), (0.07, 0.03, 0.08))
    sphere("glint2_" + n, "white", H(ex + 0.05 - 0.05, ey - 0.08, face_z(ex, ey) + 0.1), (0.03, 0.02, 0.03))
    cx, cy = s*0.64, -0.42
    bpy.ops.mesh.primitive_cylinder_add(radius=0.095, depth=0.02, vertices=24, location=H(cx, cy, face_z(cx, cy) - 0.005), rotation=(math.pi/2, 0, s*0.55))
    o = bpy.context.object; o.scale = (1.2, 1, 0.85); finish(o, "cheek_" + n, "cheek")
bpy.ops.mesh.primitive_cone_add(radius1=0.058, radius2=0.0, depth=0.05, vertices=3, location=H(0.02, -0.36, face_z(0.02, -0.36) + 0.02), rotation=(-math.pi/2, math.pi, 0))
finish(bpy.context.object, "nose", "pink")
# smile = bevelled arc following the mask surface
cu = bpy.data.curves.new("smile", 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.02
sp = cu.splines.new('POLY'); sp.points.add(10)
for k in range(11):
    x = 0.1 - 0.11 + 0.22 * k / 10
    y = -0.6 + 0.07 * ((x - 0.1) / 0.11) ** 2          # small smile, ends higher than the middle
    sp.points[k].co = (*H(x, y, face_z(x, y) + 0.03), 1)
ob = bpy.data.objects.new("smile", cu); bpy.context.collection.objects.link(ob)
bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.convert(target='MESH')
ob.data.materials.append(M["ink"]); ob.name = "smile"


# ================= TRAIT PARTS (token #1462) =================
# every trait mesh is named trait_*; the viewer toggles them and hides what they replace
def text_mesh(name, body, loc, size, m, rot=(math.pi/2, 0, 0)):
    bpy.ops.object.text_add(location=loc, rotation=rot); o = bpy.context.object
    o.data.body = body; o.data.size = size; o.data.extrude = 0.012; o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'
    bpy.ops.object.convert(target='MESH'); o.name = name; o.data.materials.append(M[m]); return o
def half_sphere(name, m, loc, scale):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=40, ring_count=24, location=loc); o = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.02], context='VERTS'); bm.to_mesh(o.data); bm.free()
    o.scale = scale; return finish(o, name, m)

CAP_C, CAP_R = Vector(H(0, 0.32, -0.12)), Vector((1.3, 1.05, 1.1))   # cap dome centre / radii in Blender axes
def wrap_on_cap(o):   # project the flat text onto the curved cap; keep the letter thickness
    depth = [v.co.z for v in o.data.vertices]                  # 0 = back face, extrude = front face
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for v, d in zip(o.data.vertices, depth):
        q = Vector(((v.co - CAP_C)[i] / CAP_R[i] for i in range(3))).normalized() * (1.004 + d / 1.1)
        v.co = Vector((CAP_C[i] + q[i] * CAP_R[i] for i in range(3)))
    return o
# Head: MCGA baseball cap, pulled down to the glasses, curved bill, big text
CAP_C, CAP_R = Vector(H(0, 0.3, -0.06)), Vector((1.32, 1.14, 1.2))
half_sphere("trait_cap", "cap", H(0, 0.3, -0.06), (1.32, 1.14, 1.2))
bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=0.1, vertices=48, end_fill_type='TRIFAN', location=H(0, 0.3, 0.8), rotation=(0.5, 0, 0))
o = bpy.context.object; bm = bmesh.new(); bm.from_mesh(o.data)          # keep only the front half = the bill
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.001], context='VERTS'); bm.to_mesh(o.data); bm.free()
o.scale = (1.15, 0.6, 1.0); finish(o, "trait_cap_bill", "capD")
for k_, (txt, a_) in enumerate((("MAKE CHOG", 0.78), ("GREAT AGAIN", 0.46))):
    y_, z_ = 0.3 + 1.2*math.sin(a_), -0.06 + 1.14*math.cos(a_)
    wrap_on_cap(text_mesh("trait_txt_cap%d" % k_, txt, H(0, y_, z_), 0.24, "white", rot=(math.pi/2 - a_, 0, 0)))
# Eyes: BTC glasses = two big Bitcoin coins over the eyes
for s_, n_ in ((-1, "L"), (1, "R")):
    ex, ey = s_*0.36, -0.16; z = face_z(ex, ey) + 0.09
    cyl("trait_coin_rim_" + n_, "ink", H(ex, ey, z - 0.02), 0.335, 0.08, rot=(math.pi/2, 0, 0))
    cyl("trait_coin_" + n_, "orange", H(ex, ey, z), 0.31, 0.1, rot=(math.pi/2, 0, 0))
    text_mesh("trait_txt_btc_" + n_, "B", H(ex, ey - 0.02, z + 0.055), 0.42, "white")
    for dy in (0.19, -0.19):                                 # two thin strokes at the stem turn B into the Bitcoin sign
        for dx in (-0.06, 0.0):
            bpy.ops.mesh.primitive_cube_add(size=1, location=H(ex + dx, ey - 0.02 + dy, z + 0.06)); c_ = bpy.context.object
            c_.scale = (0.03, 0.02, 0.07); finish(c_, "trait_txt_btcbar", "white")
    cyl("trait_glass_arm_" + n_, "orange", H(s_*0.7, -0.12, z - 0.45), 0.025, 0.8, rot=(math.pi/2, 0, 0))
cyl("trait_glass_bridge", "orange", H(0, -0.14, face_z(0, -0.14) + 0.1), 0.025, 0.14, rot=(0, math.pi/2, 0))
# NFT face: big blush blobs (left big, right small), no nose, small tilted flat mouth lower right
for (bx, by, br) in ((-0.5, -0.45, 0.17), (0.66, -0.34, 0.11)):
    bpy.ops.mesh.primitive_cylinder_add(radius=br, depth=0.02, vertices=24, location=H(bx, by, face_z(bx, by) + 0.005), rotation=(math.pi/2, 0, 0.5 if bx > 0 else -0.5))
    o = bpy.context.object; o.scale = (1.25, 1, 0.9); finish(o, "trait_blush", "cheek")
bpy.ops.mesh.primitive_cube_add(size=1, location=H(0.22, -0.5, face_z(0.22, -0.5) + 0.02), rotation=(0, 0.22, 0)); o = bpy.context.object
o.scale = (0.17, 0.03, 0.03); finish(o, "trait_mouth_flat", "ink")

# head rig: all head parts hang off one node (bigger head now, and the mount point for hats later)
rig = bpy.data.objects.new("head_rig", None); rig.location = H(0, 0, 0); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.update()
for o in [o for o in bpy.data.objects if o not in BEFORE_HEAD and o is not rig]:
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
rig.scale = (1.15, 1.15, 1.15)

# Body: Yellow 143 Jersey = tank top with white trim; skin shows at neck and arms
cyl("trait_jersey", "yellow", P(0, 0.3, 0), 0.7, 0.84, r2=0.47)
bpy.ops.mesh.primitive_torus_add(major_radius=0.43, minor_radius=0.05, location=P(0, 0.72, 0.02)); finish(bpy.context.object, "trait_jersey_trim", "white")
for s_ in (-1, 1):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.04, location=P(s_*0.5, 0.58, 0), rotation=(0, math.pi/2, 0)); finish(bpy.context.object, "trait_jersey_trim", "white")
text_mesh("trait_txt_143b", "143", P(0, 0.27, 0.6), 0.37, "ink")
text_mesh("trait_txt_143", "143", P(0, 0.28, 0.625), 0.34, "white")
# Accessory: Fwog held up at the chin, drooling
FW = (-0.92, 1.3, 0.8)
sphere("trait_fwog", "green", P(*FW), (0.34, 0.3, 0.3))
for s_ in (-1, 1):
    sphere("trait_fwog_eye", "white", P(FW[0] + s_*0.14, FW[1] + 0.19, FW[2] + 0.2), r=0.1)
    sphere("trait_fwog_pupil", "ink", P(FW[0] + s_*0.14, FW[1] + 0.19, FW[2] + 0.29), r=0.045)
sphere("trait_fwog_mouth", "cheek", P(FW[0], FW[1] - 0.06, FW[2] + 0.28), (0.09, 0.03, 0.07))
sphere("trait_fwog_drool", "drool", P(FW[0] + 0.01, FW[1] - 0.2, FW[2] + 0.29), (0.025, 0.025, 0.1))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True)
print("EXPORTED", OUT, len(bpy.data.objects), "objects")
