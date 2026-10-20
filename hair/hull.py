# python -I hull.py : carve the hair volume from the turnaround silhouettes (front, left, back) -> hair_vox.npz (boundary quads)
import json
from collections import deque
import numpy as np
from PIL import Image
SHEET = "C:/Users/Dell/Downloads/1528255f-2430-4fe4-98ee-3537b3e41346.png"
S = np.asarray(Image.open(SHEET).convert("RGB")).astype(int)
bg = (S[..., 2] > 200) & (S[..., 0] < 120) & (S[..., 1] > 90)     # blue background
fg = ~bg
hairpx = ~bg & (((S[..., 2] > 130) & (S[..., 0] < 150)) | (S.sum(-1) < 200))   # purple hair (+ black outline), not the cream face
FACE = json.load(open("../face/face_grid.json")); SIDE = json.load(open("../face/face_side.json"))
U = 1.8 / FACE["w"]
FCX, FCY = 222 + FACE["w"] / 2, 193 + FACE["h"] / 2                # face centre in the FRONT panel (sheet px) = model (0, 0)
# side panel: find the face again to align it (same flood as trace_side)
crop = S[165:375, 880:1110]; out = ((crop[..., 2] > 140) & (crop[..., 0] < 150)) | (crop.sum(-1) < 200)
seen = np.zeros(out.shape, bool); st = (330 - 165, 960 - 880); q = deque([st]); seen[st] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < out.shape[0] and 0 <= nx < out.shape[1] and not seen[ny, nx] and not out[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
rows = np.nonzero(seen.any(1))[0]; SXB = 880 + np.nonzero(seen.any(0))[0].min()    # face back-most column = model z 0
SCY = 165 + rows[0] + FACE["h"] / 2                                                  # side-view face centre row
FRONT_CUT, SIDE_CUT, BACK_CUT = 352, 352, 626 + 352                                  # below = body
R = 0.025
xs = np.arange(-2.3, 2.3, R); ys = np.arange(-0.9, 2.3, R); zs = np.arange(-1.9, 1.3, R)
X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
def sample(px, py, cut, m=fg):
    px, py = np.round(px).astype(int), np.round(py).astype(int)
    ok = (px >= 0) & (px < S.shape[1]) & (py >= 0) & (py < cut)
    r = np.zeros(px.shape, bool); r[ok] = m[py[ok], px[ok]]; return r
front = sample(FCX + X / U, FCY - Y / U, FRONT_CUT) & (FCY - Y / U >= 0)
back = sample(FCX - X / U, FCY - Y / U + 626, BACK_CUT) & (FCY - Y / U + 626 >= 626)
side = sample(SXB + Z / U, SCY - Y / U, SIDE_CUT, hairpx)   # side view: only where hair is drawn (the face is in front of it)
vox = front & side          # back view is not consistent with the front (AI sheet): intersecting it clips the spikes
hull0 = vox.copy()          # untrimmed hull, used for the collar behind the face
# carve out the face shell so the hair sits behind it
fm = np.array(FACE["mask"], bool); fpx = np.round(FACE["w"] / 2 + X / U).astype(int); fpy = np.round(FACE["h"] / 2 - Y / U).astype(int)
inf = (fpx >= 0) & (fpx < FACE["w"]) & (fpy >= 0) & (fpy < FACE["h"])
inface = np.zeros(X.shape, bool); inface[inf] = fm[fpy[inf], fpx[inf]]
zb = np.zeros(X.shape); ri = np.clip(np.round(fpy * (SIDE["rows"] - 1) / (FACE["h"] - 1)).astype(int), 0, SIDE["rows"] - 1)
zb[inf] = np.array(SIDE["back"])[ri[inf]] * U
vox &= ~(inface & (Z > zb + 0.05))
# beside the face (same height, outside the mask): hair stays behind the face's back edge, so the face shows from the side
rowok = (fpy >= 0) & (fpy < FACE["h"])
zrow = np.zeros(X.shape); zrow[rowok] = np.array(SIDE["back"])[np.clip(np.round(fpy[rowok] * (SIDE["rows"] - 1) / (FACE["h"] - 1)).astype(int), 0, SIDE["rows"] - 1)] * U
# the M-shaped dip at the top of the face (between the two bang points) is hair in the drawing, filled forward to
# the face's front -- cutting it back to the face's back edge left a see-through notch from the side
fm_cols = fm.any(0); topcol = np.where(fm_cols, fm.argmax(0), FACE["h"])
fpx_c = np.clip(fpx, 0, FACE["w"] - 1)
dip = inf & fm_cols[fpx_c] & (fpy < topcol[fpx_c]) & (fpx_c >= 74) & (fpx_c <= 157)   # only between the two bang points (front view px 296..379)
zfr = np.zeros(X.shape); tri = np.clip(np.round(topcol[fpx_c] * (SIDE["rows"] - 1) / (FACE["h"] - 1)).astype(int), 0, SIDE["rows"] - 1)
zfr[dip] = np.array(SIDE["front"])[tri[dip]] * U
vox &= ~(rowok & ~inface & ~dip & (Z > zrow + 0.05))
vox &= ~(dip & (Z > zfr - 0.02))
dipfill = dip & (Z <= zfr - 0.02) & (Z >= zrow - 0.3)
# round each horizontal slice (two silhouettes alone give a box): keep voxels inside the superellipse that fits
# the slice's own x/z extent -- the outline extremes (spike tips, silhouette) survive, the box corners go
for j in range(vox.shape[1]):
    sl = vox[:, j, :]
    if not sl.any(): continue
    ii, kk = np.nonzero(sl)
    cx_, hx_ = (xs[ii].min() + xs[ii].max()) / 2, (xs[ii].max() - xs[ii].min()) / 2 + R
    cz_, hz_ = (zs[kk].min() + zs[kk].max()) / 2, (zs[kk].max() - zs[kk].min()) / 2 + R
    vox[:, j, :] = sl & ((np.abs((xs[:, None] - cx_) / hx_) ** 1.6 + np.abs((zs[None, :] - cz_) / hz_) ** 1.6) <= 1.0)
# core + tapered spikes: the hair is a round core; anything sticking out of it is a spike that thins to its tip
# (front-view spikes thin in depth, side-view spikes thin in width) -- two silhouettes alone give thick slabs
RC, PT = 0.5, 1.0      # RC: spike half-thickness at its base
def outline(mask, cx, cy, toview):     # outline radius (model units) per degree around a centre, from a silhouette
    r = np.zeros(360)
    for d in range(360):
        c, s_ = np.cos(np.radians(d)), np.sin(np.radians(d)); last = 0
        for t in np.arange(0, 3.2, R / 2):
            px, py = toview(cx + c * t, cy + s_ * t)
            if not (0 <= px < S.shape[1] and 0 <= py < S.shape[0]) or not mask[py, px]: continue
            last = t
        r[d] = last
    return r
fpx_ = lambda x, y: (int(round(FCX + x / U)), int(round(FCY - y / U)) if FCY - y / U < FRONT_CUT else -1)
spx_ = lambda z, y: (int(round(SXB + z / U)), int(round(SCY - y / U)) if SCY - y / U < SIDE_CUT else -1)
cxf, cyf = X[vox].mean(), Y[vox].mean(); czs = Z[vox].mean()
RF, RS = outline(fg, cxf, cyf, fpx_), outline(fg, czs, cyf, spx_)
def polar(a_, b_, ca, cb, RO, RCA):
    da, db = a_ - ca, b_ - cb; r = np.hypot(da, db); deg = (np.degrees(np.arctan2(db, da)) % 360).astype(int) % 360
    ro = RO[deg]; rc = RCA[deg]; t = np.clip((r - rc) / np.maximum(ro - rc, 1e-6), 0, 1)
    return r > rc, t
# core = the solid mass up to the valleys between spikes: rolling minimum of the outline radius (+-30 deg)
valley = lambda RO: np.array([np.take(RO, range(d - 30, d + 31), mode="wrap").min() for d in range(360)])
RCF, RCS = valley(RF), valley(RS)
fo, tf = polar(X, Y, cxf, cyf, RF, RCF)
so, ts = polar(Z, Y, czs, cyf, RS, RCS)
zok = np.abs(Z - czs) <= RC * (1 - tf) ** PT          # front spike: depth shrinks toward its tip
xok = np.abs(X - cxf) <= RC * (1 - ts) ** PT          # side spike: width shrinks toward its tip
vox &= (~fo & ~so) | (fo & ~so & zok) | (so & ~fo & xok) | (fo & so & zok & xok)
# collar: solid hair right behind the face's back edge (fills the slivers where face and hair meet)
near = inface.copy()
for _ in range(3):                                    # grow the face outline ~3 voxels sideways/up/down
    g = near.copy(); g[1:] |= near[:-1]; g[:-1] |= near[1:]; g[:, 1:] |= near[:, :-1]; g[:, :-1] |= near[:, 1:]; near = g
zc_ = np.where(inface, zb, zrow)
collar = near & rowok & (Z <= zc_ + 0.05) & (Z >= zc_ - 0.35)
vox |= hull0 & collar
vox |= dipfill & (hull0 | (Z > zrow - 0.3))   # bangs fill the dip even where the side silhouette shows face
# boundary quads
V, F = [], []
def addq(c):
    F.append([len(V), len(V) + 1, len(V) + 2, len(V) + 3]); V.extend(c)
idx = np.argwhere(vox)
P = np.pad(vox, 1)
for (i, j, k) in idx:
    x, y, z = xs[i], ys[j], zs[k]; h = R / 2
    if not P[i, j + 1, k + 1]: addq([(x-h, y-h, z-h), (x-h, y-h, z+h), (x-h, y+h, z+h), (x-h, y+h, z-h)])
    if not P[i + 2, j + 1, k + 1]: addq([(x+h, y-h, z-h), (x+h, y+h, z-h), (x+h, y+h, z+h), (x+h, y-h, z+h)])
    if not P[i + 1, j, k + 1]: addq([(x-h, y-h, z-h), (x+h, y-h, z-h), (x+h, y-h, z+h), (x-h, y-h, z+h)])
    if not P[i + 1, j + 2, k + 1]: addq([(x-h, y+h, z-h), (x-h, y+h, z+h), (x+h, y+h, z+h), (x+h, y+h, z-h)])
    if not P[i + 1, j + 1, k]: addq([(x-h, y-h, z-h), (x-h, y+h, z-h), (x+h, y+h, z-h), (x+h, y-h, z-h)])
    if not P[i + 1, j + 1, k + 2]: addq([(x-h, y-h, z+h), (x+h, y-h, z+h), (x+h, y+h, z+h), (x-h, y+h, z+h)])
np.savez("hair_vox.npz", v=np.array(V, np.float32), f=np.array(F, np.int32))
print("voxels", int(vox.sum()), "quads", len(F), "side face back col", SXB, "side centre row", SCY)

# ---- ink strokes: from every valley between spikes in the traced outlines, a short curved line inward ----
def valleys(RO, skip):
    rs = np.array([np.mean(np.take(RO, range(d - 3, d + 4), mode="wrap")) for d in range(360)])
    out = []
    for d in range(360):
        if any(a <= d <= b for a, b in skip): continue
        win = np.take(rs, range(d - 10, d + 11), mode="wrap")
        if rs[d] > win.min() + 1e-9: continue
        if np.take(rs, range(d - 28, d + 29), mode="wrap").max() - rs[d] < 0.12: continue
        if out and d - out[-1] < 12: continue
        out.append(d)
    return [(d, rs[d]) for d in out]
def stroke(ca, cb, d, r, L=0.42, curl=0.12, n=12):
    c, s_ = np.cos(np.radians(d)), np.sin(np.radians(d)); tx, ty = -s_, c
    return [[ca + c * (r - L * t) + tx * curl * t * t, cb + s_ * (r - L * t) + ty * curl * t * t] for t in np.linspace(0.04, 1, n)]
ink = []
for d, r in valleys(RF, [(235, 305)]):                    # skip the bottom (neck / face)
    ink.append({"view": "front", "pts": stroke(cxf, cyf, d, r)})
for d, r in valleys(RS, [(250, 360), (0, 15)]):            # skip front-lower (the face)
    ink.append({"view": "side", "pts": stroke(czs, cyf, d, r)})
json.dump(ink, open("ink2d.json", "w"))
print("ink strokes", len(ink), [(i["view"], len(i["pts"])) for i in ink])
