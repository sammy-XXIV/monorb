# python -I body.py : carve the body from the turnaround FRONT + LEFT silhouettes (below the head) -> body_vox.npz
import numpy as np
from PIL import Image
from scipy import ndimage
S = np.asarray(Image.open("C:/Users/Dell/Downloads/1528255f-2430-4fe4-98ee-3537b3e41346.png").convert("RGB")).astype(int)
purple = (S[..., 1] < 75) & (S[..., 2] > 110) & (S[..., 0] < 130)
ink = S.sum(-1) < 200
U = 1.8 / 204; FCX, FCY = 324, 269.5; SXB, SCY = 941, 272.5          # same frame as face/hair
def silhouette(x0, x1):
    # purple only: the black outlines keep arms and legs separate from the torso; then grow 2px to take the line width back
    m = np.zeros(S.shape[:2], bool); m[356:560, x0:x1] = purple[356:560, x0:x1]
    lab, n = ndimage.label(m); sizes = ndimage.sum(m, lab, range(1, n + 1))
    m = np.isin(lab, 1 + np.nonzero(sizes > 300)[0])                    # torso, arms, legs; drop specks
    m = ndimage.binary_fill_holes(ndimage.binary_dilation(m, iterations=2) & (purple | ink))
    # neck: a narrow plug from the shoulders' top up under the head (keeps the shoulder curve; no gap)
    cols = np.nonzero(m[362])[0]; c = (cols[0] + cols[-1]) // 2
    top = np.nonzero(m.any(1))[0][0]
    m[300:top + 12, c - 34:c + 35] = True
    return m
FRONT, SIDE = silhouette(150, 500), silhouette(820, 1080)
def inner_ink(sil):                                  # outline strokes drawn INSIDE the silhouette = arm edges
    return ink & ndimage.binary_erosion(sil, iterations=4)
# front: torso = between the two inner arm lines, row by row; above where the lines start, torso = full width
fi = inner_ink(FRONT); cF = 324
TORSO_F = FRONT.copy(); ARMS_F = np.zeros_like(FRONT)
lastL = lastR = None
for y in range(356, 560):
    xs_ = np.nonzero(fi[y])[0]; L = xs_[xs_ < cF]; Rr = xs_[xs_ > cF]
    row = np.nonzero(FRONT[y])[0]
    if not len(row): continue
    if len(L): lastL = L
    elif lastL is not None and y < 470: L = lastL          # below the drawn line: hand tips keep the same split
    if len(Rr): lastR = Rr
    elif lastR is not None and y < 470: Rr = lastR
    if len(L): TORSO_F[y, :L.max() + 1] = False; ARMS_F[y, :L.max() + 1] = FRONT[y, :L.max() + 1]
    if len(Rr): TORSO_F[y, Rr.min():] = False; ARMS_F[y, Rr.min():] = FRONT[y, Rr.min():]
# lower arms sit apart from the torso already: whatever is outside the torso's widest legal span below the armpit is arm
lab, n = ndimage.label(FRONT & ~TORSO_F); ARMS_F |= FRONT & ~TORSO_F
# side: arm = region enclosed by the drawn U-shaped arm outline
si = inner_ink(SIDE); ARM_S = np.zeros_like(SIDE)
for y in range(356, 560):
    xs_ = np.nonzero(si[y])[0]
    if len(xs_) >= 2 and xs_[-1] - xs_[0] > 6: ARM_S[y, xs_[0]:xs_[-1] + 1] = True
ARM_S = ndimage.binary_closing(ARM_S, iterations=2)
lab_, n_ = ndimage.label(ARM_S); ARM_S = lab_ == (1 + int(np.argmax(ndimage.sum(ARM_S, lab_, range(1, n_ + 1)))))
yy = np.nonzero(ARM_S.any(1))[0]; print("side arm rows", yy.min(), yy.max())
# arm tops: the drawn line starts below the shoulder, so the arm piece had a flat top -> a lump on the shoulder.
# Grow each arm up into the shoulder with a tapering, rounded cap (hidden inside the torso's shoulder curve).
def cap_up(m, rows=22):
    m = m.copy(); ys_ = np.nonzero(m.any(1))[0]; y0 = ys_[0]
    lab_, n_ = ndimage.label(m[y0:y0 + 6])
    for c in range(1, n_ + 1):
        xs_ = np.nonzero((lab_ == c).any(0))[0]; cx_, hw_ = (xs_[0] + xs_[-1]) / 2, (xs_[-1] - xs_[0]) / 2
        for k in range(1, rows + 1):
            w_ = hw_ * np.sqrt(max(0.0, 1 - (k / rows) ** 2))
            m[y0 - k, int(round(cx_ - w_)):int(round(cx_ + w_)) + 1] = True
    return m
TORSO_F = ndimage.binary_opening(TORSO_F, iterations=3)      # hand-bottom outline slivers ended up in the torso -> thin plates ("chopsticks")
lab_, n_ = ndimage.label(TORSO_F); TORSO_F = lab_ == (1 + int(np.argmax(ndimage.sum(TORSO_F, lab_, range(1, n_ + 1)))))
ARMS_F = ndimage.binary_opening(ARMS_F, iterations=4)          # drop thin outline strips (they became "chopsticks" under the hands)
lab_, n_ = ndimage.label(ARMS_F); sz_ = ndimage.sum(ARMS_F, lab_, range(1, n_ + 1))
ARMS_F = np.isin(lab_, 1 + np.argsort(sz_)[-2:])               # exactly two arms
ARMS_F = cap_up(ARMS_F) & ndimage.binary_dilation(FRONT, iterations=2)
ARM_S = cap_up(ARM_S) & ndimage.binary_dilation(SIDE, iterations=2)
Image.fromarray((np.dstack([TORSO_F, ARMS_F, ARM_S]) * 255).astype(np.uint8)[330:570, 150:1080]).save("parts_masks.png")
R = 0.025
xs = np.arange(-1.6, 1.6, R); ys = np.arange(-3.4, 0.0, R); zs = np.arange(-1.3, 1.3, R)
X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
def samp(m, px, py):
    px, py = np.round(px).astype(int), np.round(py).astype(int); ok = (px >= 0) & (px < S.shape[1]) & (py >= 0) & (py < S.shape[0])
    r = np.zeros(px.shape, bool); r[ok] = m[py[ok], px[ok]]; return r
sideZ = samp(SIDE, SXB + Z / U, SCY - Y / U)
torso_all = samp(TORSO_F, FCX + X / U, FCY - Y / U) & sideZ
arms_all = samp(ARMS_F, FCX + X / U, FCY - Y / U) & samp(ARM_S, SXB + Z / U, SCY - Y / U)
# crotch: top of the gap between the legs in the front silhouette (sheet row) -> model y
gap_rows = [y for y in range(430, 540) if (lambda r: len(r) and (np.diff(r) > 3).any())(np.nonzero(TORSO_F[y, 280:370])[0])]
Y_CROTCH = -(gap_rows[0] - FCY) * U; print("crotch y", round(Y_CROTCH, 3))
OVER = 0.18                                              # legs reach up into the torso so the hip never opens up mid-swing
PARTS = {"torso": torso_all & (Y >= Y_CROTCH - 0.02),
         "leg_L": torso_all & (Y < Y_CROTCH + OVER) & (X < 0), "leg_R": torso_all & (Y < Y_CROTCH + OVER) & (X >= 0),
         "arm_L": arms_all & (X < 0), "arm_R": arms_all & (X >= 0)}
for name, vox in PARTS.items():
    # round every horizontal slice, per separate piece (torso, each arm, each leg): ellipse fitted to the piece's x/z extent
    for j in range(vox.shape[1]):
        lab, n = ndimage.label(vox[:, j, :])
        out = np.zeros_like(vox[:, j, :])
        for c in range(1, n + 1):
            ii, kk = np.nonzero(lab == c)
            cx, hx = (xs[ii].min() + xs[ii].max()) / 2, (xs[ii].max() - xs[ii].min()) / 2 + R
            cz, hz = (zs[kk].min() + zs[kk].max()) / 2, (zs[kk].max() - zs[kk].min()) / 2 + R
            out |= (lab == c) & ((((xs[:, None] - cx) / hx) ** 2 + ((zs[None, :] - cz) / hz) ** 2) <= 1.0)
        vox[:, j, :] = out
    V, F = [], []; P = np.pad(vox, 1); h = R / 2
    for (i, j, k) in np.argwhere(vox):
        x, y, z = xs[i], ys[j], zs[k]
        for di, dj, dk, q in ((-1,0,0,[(x-h,y-h,z-h),(x-h,y-h,z+h),(x-h,y+h,z+h),(x-h,y+h,z-h)]),(1,0,0,[(x+h,y-h,z-h),(x+h,y+h,z-h),(x+h,y+h,z+h),(x+h,y-h,z+h)]),
                              (0,-1,0,[(x-h,y-h,z-h),(x+h,y-h,z-h),(x+h,y-h,z+h),(x-h,y-h,z+h)]),(0,1,0,[(x-h,y+h,z-h),(x-h,y+h,z+h),(x+h,y+h,z+h),(x+h,y+h,z-h)]),
                              (0,0,-1,[(x-h,y-h,z-h),(x-h,y+h,z-h),(x+h,y+h,z-h),(x+h,y-h,z-h)]),(0,0,1,[(x-h,y-h,z+h),(x+h,y-h,z+h),(x+h,y+h,z+h),(x-h,y+h,z+h)])):
            if not P[i+1+di, j+1+dj, k+1+dk]: F.append([len(V), len(V)+1, len(V)+2, len(V)+3]); V.extend(q)
    np.savez("%s_vox.npz" % name, v=np.array(V, np.float32), f=np.array(F, np.int32)); print(name, "voxels", int(vox.sum()))
Image.fromarray((FRONT[330:570, 150:500] * 255).astype(np.uint8)).save("sil_front.png"); Image.fromarray((SIDE[330:570, 820:1080] * 255).astype(np.uint8)).save("sil_side.png")
print("front bbox y", np.nonzero(FRONT.any(1))[0][[0, -1]], "side bbox y", np.nonzero(SIDE.any(1))[0][[0, -1]])
