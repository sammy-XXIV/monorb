# python -I trace_face.py : cut the face out of the turnaround front view -> face_tex.png, face_mask.png, face_grid.json
import json
from collections import deque
import numpy as np
from PIL import Image
SHEET = "C:/Users/Dell/Downloads/1528255f-2430-4fe4-98ee-3537b3e41346.png"
CROP = (195, 165, 455, 365)                         # around the face in the FRONT VIEW panel (px)
img = Image.open(SHEET).convert("RGB").crop(CROP); a = np.asarray(img).astype(int)
h, w = a.shape[:2]
outside = ((a[..., 2] > 140) & (a[..., 0] < 150)) | (a.sum(-1) < 200)   # purple hair, blue background, black outline
seen = np.zeros((h, w), bool); q = deque([(h // 2 - 15, w // 2)]); seen[q[0]] = True
while q:                                             # flood the face from its centre
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and not outside[ny, nx]:
            seen[ny, nx] = True; q.append((ny, nx))
# fill holes (pupils, lines inside the face): anything not reachable from the crop border through non-face
out = np.zeros((h, w), bool); q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
for p in q: out[p] = not seen[p]
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not out[ny, nx] and not seen[ny, nx]: out[ny, nx] = True; q.append((ny, nx))
seen = ~out
for _ in range(2):                                   # grow 2px to take in the black outline
    g = seen.copy(); g[1:] |= seen[:-1]; g[:-1] |= seen[1:]; g[:, 1:] |= seen[:, :-1]; g[:, :-1] |= seen[:, 1:]; seen = g
ys, xs = np.nonzero(seen); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
m = seen[y0:y1 + 1, x0:x1 + 1]; tex = img.crop((x0, y0, x1 + 1, y1 + 1))
# distance to the face edge (chamfer, 2 passes) -> rounded "pillow" height
d = np.where(m, 1e9, 0.0)
for _ in range(2):
    for y in range(d.shape[0]):
        for x in range(d.shape[1]):
            if d[y, x]:
                v = d[y, x]
                if y: v = min(v, d[y-1, x] + 1)
                if x: v = min(v, d[y, x-1] + 1)
                if y and x: v = min(v, d[y-1, x-1] + 1.414)
                if y and x + 1 < d.shape[1]: v = min(v, d[y-1, x+1] + 1.414)
                d[y, x] = v
    d = d[::-1, ::-1]
# clean the black edge line out of the art (it would smear round the sides); the viewer outline draws the edge
ta = np.asarray(tex).copy(); inner = m.copy(); inner[0] = inner[-1] = False; inner[:, 0] = inner[:, -1] = False   # image border counts as outside
for _ in range(14):
    e = inner.copy(); e[1:] &= inner[:-1]; e[:-1] &= inner[1:]; e[:, 1:] &= inner[:, :-1]; e[:, :-1] &= inner[:, 1:]; inner = e
edge = m & ~inner
pinkish = (ta[..., 0] > 190) & (ta[..., 1] < 160)
ta[edge & ~pinkish] = (253, 246, 212); ta[~m] = (253, 246, 212)   # outer ring -> clean cream (blush kept)
# paint out the drawn nose (pink + its dark outline); the 3D nose replaces it
pk = (ta[..., 0] > 190) & (ta[..., 1] < 160); pk[:60] = pk[130:] = False; pk[:, :60] = pk[:, 145:] = False
ny_, nx_ = np.nonzero(pk); NOSE = [int(nx_.min()), int(ny_.min()), int(nx_.max()), int(ny_.max())]
x0n, y0n, x1n, y1n = NOSE[0] - 3, NOSE[1] - 3, NOSE[2] + 3, NOSE[3] + 3
box = ta[y0n:y1n + 1, x0n:x1n + 1]; box[:] = (253, 246, 212)
tex = Image.fromarray(ta)
tex.save("face_tex.png"); Image.fromarray((m * 255).astype(np.uint8)).save("face_mask.png")
json.dump({"nose": NOSE, "w": int(m.shape[1]), "h": int(m.shape[0]), "mask": m.astype(int).tolist(), "dist": np.round(d, 2).tolist()}, open("face_grid.json", "w"))
print("face px", m.shape[1], "x", m.shape[0], "max edge dist", round(float(d.max()), 1), "bbox in crop", (int(x0), int(y0), int(x1), int(y1)))
