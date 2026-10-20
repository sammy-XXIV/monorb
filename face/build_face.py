# Run: blender --background --python build_face.py   -> face.glb (the Chog face alone)
# Face = traced front outline, inflated into a rounded shell, with the front-view art projected on it.
import bpy, json, math, os
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(HERE, "face_grid.json"))); W, Hh = G["w"], G["h"]
MASK, DIST = G["mask"], G["dist"]
U = 1.8 / W                      # model units per px: face is 1.8 wide
DEPTH = 0.55                     # how far the face bulges forward (tuned against the side view)
DMAX = max(max(r) for r in DIST)
bpy.ops.wm.read_factory_settings(use_empty=True)

def P(x, y, z): return (x, -z, y)                     # viewer space -> Blender
# side profile traced from the turnaround LEFT VIEW: per row, front edge and back edge (px, same scale as front)
SIDE = json.load(open(os.path.join(HERE, "face_side.json")))
ROWX = [[x for x in range(W) if MASK[y][x]] or [W // 2] for y in range(Hh)]   # front-view extent of each row
def smooth(v, k):
    return [sum(v[max(0, i - k):i + k + 1]) / len(v[max(0, i - k):i + k + 1]) for i in range(len(v))]
XC = smooth([(r[0] + r[-1]) / 2 for r in ROWX], 3); HW = smooth([max(1.0, (r[-1] - r[0]) / 2) for r in ROWX], 3)
SF, SB = smooth(SIDE["front"], 4), smooth(SIDE["back"], 4)                 # de-noise the traced profile
def surf(px, py, back=False):
    x, y = (px - W / 2) * U, -(py - Hh / 2) * U
    i = round(py * (SIDE["rows"] - 1) / (Hh - 1)); zf, zb = SF[i] * U, SB[i] * U
    r_ = ROWX[py]; sx = min(1.0, abs(px - (r_[0] + r_[-1]) / 2) / max(0.5, (r_[-1] - r_[0]) / 2))   # each row's own edge -> exactly on the back curve
    z = zb if back else zb + (zf - zb) * math.sqrt(max(0.0, 1 - sx * sx))   # round across the row, profile from the side view
    return P(x, y, z)

# smooth-edged face: columns across the face, each running from its top contour to its bottom contour
# (a pixel grid gives a stair-stepped edge that the outline inks as a comb)
cols_x = [x for x in range(W) if any(MASK[y][x] for y in range(Hh))]
X0, X1 = cols_x[0], cols_x[-1]
topc = [next(y for y in range(Hh) if MASK[y][x]) if x in set(cols_x) else Hh // 2 for x in range(W)]
botc = [max(y for y in range(Hh) if MASK[y][x]) if x in set(cols_x) else Hh // 2 for x in range(W)]
topc, botc = smooth(topc, 2), smooth(botc, 2)
XC6, HW6 = smooth(XC, 6), smooth(HW, 6)          # well-smoothed row widths for the inside of the face
NU, NV = 140, 110
def ctr(arr, fx):  # contour value at fractional column
    i = int(fx); f = fx - i; j = min(i + 1, W - 1); return arr[i] * (1 - f) + arr[j] * f
def surf_f(fx, fy, back=False):                      # surf() for fractional pixel coords
    x, y = (fx - W / 2) * U, -(fy - Hh / 2) * U
    py = min(Hh - 1, max(0, int(round(fy))))
    i = round(py * (SIDE["rows"] - 1) / (Hh - 1)); zf, zb = SF[i] * U, SB[i] * U
    sx = min(1.0, abs(fx - XC6[py]) / HW6[py])
    z = zb if back else zb + (zf - zb) * math.sqrt(max(0.0, 1 - sx * sx))
    return P(x, y, z)
verts, faces, uvs = [], [], []
for back in (False, True):
    off = len(verts)
    for iu in range(NU + 1):
        fx = X0 + (X1 - X0) * (0.5 - 0.5 * math.cos(math.pi * iu / NU))       # denser near the sides
        t0, t1 = ctr(topc, fx), ctr(botc, fx)
        for iv in range(NV + 1):
            fy = t0 + (t1 - t0) * iv / NV
            edge = iu in (0, NU) or iv in (0, NV)                                    # outline vertex -> pinned on the back curve
            verts.append(surf_f(fx, fy, back or edge)); uvs.append((fx / (W - 1), 1 - fy / (Hh - 1)))
    for iu in range(NU):
        for iv in range(NV):
            a_ = off + iu * (NV + 1) + iv; q = [a_, a_ + NV + 1, a_ + NV + 2, a_ + 1]
            faces.append(q[::-1] if back else q)
me = bpy.data.meshes.new("face"); me.from_pydata(verts, [], faces); me.update()
uvl = me.uv_layers.new(name="UV")
for poly in me.polygons:
    for li in poly.loop_indices: uvl.data[li].uv = uvs[me.loops[li].vertex_index]
for p_ in me.polygons: p_.use_smooth = True
face = bpy.data.objects.new("face", me); bpy.context.collection.objects.link(face)

m = bpy.data.materials.new("face_art"); m.use_nodes = True
nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = 1.0
tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(os.path.join(HERE, "face_tex.png"))
nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"]); me.materials.append(m)

# 3D nose exactly where the drawn one was: small rounded triangle, point down, sticking out in profile
import bmesh
NX0, NY0, NX1, NY1 = G["nose"]
NX, NY = (NX0 + NX1) // 2, (NY0 + NY1) // 2
nw, nh = (NX1 - NX0 + 3) * U / 2, (NY1 - NY0 + 3) * U / 2
pn = Vector(surf(NX, NY))
nm = bpy.data.materials.new("nose"); nm.use_nodes = True
nm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = ((0xe8/255)**2.2, (0x5a/255)**2.2, (0x8c/255)**2.2, 1)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=16, location=(0, 0, 0)); n = bpy.context.object
bm = bmesh.new(); bm.from_mesh(n.data)
for v in bm.verts:                                   # taper the lower half to a soft point: rounded triangle
    if v.co.z < 0: v.co.x *= 1 + 0.75 * v.co.z
bm.to_mesh(n.data); bm.free()
n.scale = (nw, 0.07, nh); n.location = pn + Vector((0, -0.02, 0))
n.name = "nose"; n.data.materials.append(nm); bpy.ops.object.shade_smooth()

bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "face.glb"), export_format='GLB')
print("EXPORTED face.glb", len(verts), "verts")
