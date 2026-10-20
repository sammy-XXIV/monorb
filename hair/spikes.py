# python -I spikes.py : find the hair spikes in the turnaround front + side outlines -> spikes.json
import json
from collections import deque
import numpy as np
from PIL import Image
SHEET = "C:/Users/Dell/Downloads/1528255f-2430-4fe4-98ee-3537b3e41346.png"
S = np.asarray(Image.open(SHEET).convert("RGB")).astype(int)
bg = (S[..., 2] > 200) & (S[..., 0] < 120) & (S[..., 1] > 90)
hairpx = ~bg & (((S[..., 2] > 130) & (S[..., 0] < 150)) | (S.sum(-1) < 200))
FACE = json.load(open("../face/face_grid.json")); U = 1.8 / FACE["w"]
FCX, FCY = 222 + FACE["w"] / 2, 193 + FACE["h"] / 2
SXB, SCY = 941, 272.5                     # side view: face back column = z 0, face centre row (from hull.py)
CUT = 352
def outline(cpx, cpy, sign):              # outermost head pixel per degree from a centre (px); sign flips x for side view
    r, tip_hair = np.zeros(360), np.zeros(360, bool)
    for d in range(360):
        c, s = np.cos(np.radians(d)), -np.sin(np.radians(d)); last = 0
        for t in range(1, 300):
            x, y = int(round(cpx + sign * c * t)), int(round(cpy + s * t))
            if not (0 <= x < S.shape[1] and 0 <= y < CUT): break
            if not bg[y, x]: last = t
        r[d] = last * U
        x, y = int(round(cpx + sign * c * (last - 3))), int(round(cpy + s * (last - 3))); tip_hair[d] = hairpx[y, x]
    return r, tip_hair
def peaks(r, ok, prom=0.12):
    rs = np.array([np.mean(np.take(r, range(d - 2, d + 3), mode="wrap")) for d in range(360)])
    out = []
    for d in range(360):
        if not ok[d] or rs[d] < max(np.take(rs, range(d - 12, d + 13), mode="wrap")): continue
        left = min(np.take(rs, range(d - 35, d), mode="wrap")); right = min(np.take(rs, range(d + 1, d + 36), mode="wrap"))
        if rs[d] - max(left, right) < prom: continue
        hw = 1                                   # half-width: degrees until the outline drops halfway to the valley
        while hw < 35 and np.take(rs, d - hw, mode="wrap") > rs[d] - (rs[d] - max(left, right)) / 2 and np.take(rs, d + hw, mode="wrap") > rs[d] - (rs[d] - max(left, right)) / 2: hw += 1
        out.append({"deg": d, "r": round(float(rs[d]), 3), "valley": round(float(max(left, right)), 3), "hw": hw})
    return out
# centre of the hair mass in each view (px)
fy, fx = np.nonzero(hairpx[:CUT, :626]); cfx, cfy = fx.mean(), fy.mean()
sy, sx = np.nonzero(hairpx[:CUT, 626:]); csx, csy = sx.mean() + 626, sy.mean()
RF, okF = outline(cfx, cfy, 1); RS, okS = outline(csx, csy, 1)
C = {"x": (cfx - FCX) * U, "y": -(cfy - FCY) * U, "z": (csx - SXB) * U, "y_side": -(csy - SCY) * U}
F, Sd = peaks(RF, okF), peaks(RS, okS)
json.dump({"centre": C, "front": F, "side": Sd, "RF": RF.round(3).tolist(), "RS": RS.round(3).tolist()}, open("spikes.json", "w"), indent=1)
print("centre", {k: round(v, 3) for k, v in C.items()})
print("front spikes", [(p["deg"], p["r"], p["hw"]) for p in F])
print("side spikes ", [(p["deg"], p["r"], p["hw"]) for p in Sd])
