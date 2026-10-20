# python -I compare.py <render.png> <out.png> : align render's face box to the avatar's face box, then side-by-side + overlay
import sys
import numpy as np
from PIL import Image
REF = "C:/Users/Dell/Downloads/AAyO53pg_400x400.jpg"
def face_box(img):
    a = np.asarray(img.convert("RGB")).astype(int)
    m = (a[..., 0] > 225) & (a[..., 1] > 215) & (a[..., 2] > 170) & (a[..., 2] < 235) & (a[..., 0] - a[..., 2] > 15)   # cream
    ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max(), ys.max()
def hair_mask(img):
    a = np.asarray(img.convert("RGB")).astype(int)
    return (a[..., 2] - a[..., 1] > 60) & (a[..., 0] < 140) & (a[..., 1] < 90)          # dark purple
ref = Image.open(REF).convert("RGB"); ren = Image.open(sys.argv[1]).convert("RGB")
rb, nb = face_box(ref), face_box(ren)
s = (rb[2] - rb[0]) / (nb[2] - nb[0])
ren2 = ren.resize((int(ren.width * s), int(ren.height * s)))
ox, oy = int(rb[0] - nb[0] * s), int(rb[1] - nb[1] * s)
canvas = Image.new("RGB", ref.size, (102, 102, 255)); canvas.paste(ren2, (ox, oy))
hr, hn = hair_mask(ref), hair_mask(canvas)
ov = np.zeros((*hr.shape, 3), np.uint8) + 255
ov[hr & hn] = (90, 60, 180); ov[hr & ~hn] = (230, 40, 40); ov[~hr & hn] = (40, 160, 230)   # red = missing, blue = extra
out = Image.new("RGB", (ref.width * 3, ref.height), "white")
out.paste(ref, (0, 0)); out.paste(canvas, (ref.width, 0)); out.paste(Image.fromarray(ov), (ref.width * 2, 0)); out.save(sys.argv[2])
iou = (hr & hn).sum() / max(1, (hr | hn).sum())
print("face ref", rb, "render", nb, "scale %.3f" % s, "hair IoU %.3f" % iou, "missing", int((hr & ~hn).sum()), "extra", int((~hr & hn).sum()))
