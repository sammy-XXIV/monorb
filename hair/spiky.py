# python -I spiky.py : hair = oval core + tapered spikes aimed at tips read off the turnaround -> hair_vox.npz
import json
import numpy as np
FACE = json.load(open("../face/face_grid.json")); SIDE = json.load(open("../face/face_side.json"))
U = 1.8 / FACE["w"]
FCX, FCY = 222 + FACE["w"] / 2, 193 + FACE["h"] / 2      # front view: face centre px = model (0, 0)
SXB, SCY = 941, 272.5                                    # side view: face back column = z 0, face centre row
fx = lambda px: (px - FCX) * U; fy = lambda py: -(py - FCY) * U
sz = lambda px: (px - SXB) * U;  sy = lambda py: -(py - SCY) * U
# core: oval whose surface runs through the valleys between the spikes (front + side views)
CORE_C, CORE_R = np.array([0.0, 0.38, -0.25]), np.array([1.25, 0.95, 1.05])
# spikes: (name, tip xyz from the sheet, base half-width). x from the front view, z from the side view (or core centre)
TIPS = [
    ("top",        (fx(266), fy(36),  sz(840)), 0.85),     # front top tip == side top-back tip (same height)
    ("upper_right",(fx(446), fy(91),  sz(1047) - 0.15), 0.5),  # seen side-on as the forward tuft above the forehead
    ("right",      (fx(515), fy(201), -0.3), 0.62),
    ("lower_right",(fx(462), fy(312), -0.4), 0.38),
    ("lower_left", (fx(187), fy(325), -0.7), 0.38),
    ("mid_left",   (fx(115), fy(252), -0.4), 0.6),
    ("upper_left", (fx(121), fy(139), -0.4), 0.6),
    ("back_upper", (-0.12, sy(167), sz(757)), 0.65),
    ("back_lower", (-0.12, sy(280), sz(760)), 0.65),
    ("back_bottom",(-0.12, sy(340), sz(827)), 0.6),
]
R = 0.02
xs = np.arange(-2.2, 2.2, R); ys = np.arange(-1.1, 2.3, R); zs = np.arange(-2.0, 1.3, R)
X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
vox = (((X - CORE_C[0]) / CORE_R[0]) ** 2 + ((Y - CORE_C[1]) / CORE_R[1]) ** 2 + ((Z - CORE_C[2]) / CORE_R[2]) ** 2) <= 1
for name, tip, w in TIPS:
    tip = np.array(tip); d = tip - CORE_C; d_core = d / np.linalg.norm(d / CORE_R)       # where the spike leaves the core
    base = CORE_C + d_core * 0.8                                                        # root sunk into the core
    view = np.array([1.0, 0, 0]) if name.startswith("back") else np.array([0, 0, 1.0])  # the view it was drawn in
    side = np.cross(d, view); side /= np.linalg.norm(side) + 1e-9
    ctrl = (base + tip) / 2 + side * 0.08 * np.linalg.norm(tip - base)                  # gentle curl, like the drawn spikes
    for t in np.linspace(0, 1, 90):
        p = (1 - t) ** 2 * base + 2 * (1 - t) * t * ctrl + t * t * tip
        tan = 2 * (1 - t) * (ctrl - base) + 2 * t * (tip - ctrl); tan /= np.linalg.norm(tan)
        sd = side - tan * side.dot(tan); sd /= np.linalg.norm(sd); th = np.cross(tan, sd)   # flat blade frame
        rw = w * (1 - t) + 0.015; rt = 0.45 * rw + 0.01; rl = 0.06                    # wide side-to-side, thin in depth
        r = max(rw, rt, rl)
        i0, i1 = np.searchsorted(xs, p[0] - r), np.searchsorted(xs, p[0] + r) + 1
        j0, j1 = np.searchsorted(ys, p[1] - r), np.searchsorted(ys, p[1] + r) + 1
        k0, k1 = np.searchsorted(zs, p[2] - r), np.searchsorted(zs, p[2] + r) + 1
        DX, DY, DZ = X[i0:i1, j0:j1, k0:k1] - p[0], Y[i0:i1, j0:j1, k0:k1] - p[1], Z[i0:i1, j0:j1, k0:k1] - p[2]
        e = ((DX*sd[0] + DY*sd[1] + DZ*sd[2]) / rw) ** 2 + ((DX*th[0] + DY*th[1] + DZ*th[2]) / rt) ** 2 + ((DX*tan[0] + DY*tan[1] + DZ*tan[2]) / rl) ** 2
        vox[i0:i1, j0:j1, k0:k1] |= e <= 1
# keep the hair behind the face: inside the face's outline, and beside it at face height, nothing in front of its back edge
fpx = np.round(FACE["w"] / 2 + X / U).astype(int); fpy = np.round(FACE["h"] / 2 - Y / U).astype(int)
rowok = (fpy >= 0) & (fpy < FACE["h"])
zrow = np.full(X.shape, 9.0)
ri = np.clip(np.round(fpy * (SIDE["rows"] - 1) / (FACE["h"] - 1)).astype(int), 0, SIDE["rows"] - 1)
zrow[rowok] = np.array(SIDE["back"])[ri[rowok]] * U
vox &= ~(rowok & (np.abs(X) < 1.05) & (Z > zrow + 0.04))
# boundary quads (same as hull.py)
V, F = [], []
P = np.pad(vox, 1); h = R / 2
for (i, j, k) in np.argwhere(vox):
    x, y, z = xs[i], ys[j], zs[k]
    for di, dj, dk, quad in ((-1, 0, 0, [(x-h,y-h,z-h),(x-h,y-h,z+h),(x-h,y+h,z+h),(x-h,y+h,z-h)]), (1, 0, 0, [(x+h,y-h,z-h),(x+h,y+h,z-h),(x+h,y+h,z+h),(x+h,y-h,z+h)]),
                             (0, -1, 0, [(x-h,y-h,z-h),(x+h,y-h,z-h),(x+h,y-h,z+h),(x-h,y-h,z+h)]), (0, 1, 0, [(x-h,y+h,z-h),(x-h,y+h,z+h),(x+h,y+h,z+h),(x+h,y+h,z-h)]),
                             (0, 0, -1, [(x-h,y-h,z-h),(x-h,y+h,z-h),(x+h,y+h,z-h),(x+h,y-h,z-h)]), (0, 0, 1, [(x-h,y-h,z+h),(x+h,y-h,z+h),(x+h,y+h,z+h),(x-h,y+h,z+h)])):
        if not P[i + 1 + di, j + 1 + dj, k + 1 + dk]: F.append([len(V), len(V) + 1, len(V) + 2, len(V) + 3]); V.extend(quad)
np.savez("hair_vox.npz", v=np.array(V, np.float32), f=np.array(F, np.int32))
print("voxels", int(vox.sum()), "quads", len(F))
