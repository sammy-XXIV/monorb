# python -I iou.py : silhouette overlap of the head render vs the turnaround, front + side; writes iou_*.png (red = missing, blue = extra)
import numpy as np
from PIL import Image
S = np.asarray(Image.open("C:/Users/Dell/Downloads/1528255f-2430-4fe4-98ee-3537b3e41346.png").convert("RGB")).astype(int)
bgS = (S[..., 2] > 200) & (S[..., 0] < 120) & (S[..., 1] > 90)
U = 1.8 / 204; FCX, FCY = 222 + 102, 193 + 76.5; SXB, SCY = 941, 272.5
PPU, C = 520 / 4.8, 0.65
gx = np.arange(-2.3, 2.3, 0.01); gy = np.arange(-0.75, 2.3, 0.01); GX, GY = np.meshgrid(gx, gy)
def ref(px, py):
    px, py = np.round(px).astype(int), np.round(py).astype(int); ok = (px >= 0) & (px < S.shape[1]) & (py >= 0) & (py < 352)
    m = np.zeros(px.shape, bool); m[ok] = ~bgS[py[ok], px[ok]]; return m
def ren(name, h):
    a = np.asarray(Image.open(name).convert("RGB")).astype(int); bg = (np.abs(a - [154, 168, 250]).sum(-1) < 40)
    px, py = np.round(260 + h * PPU).astype(int), np.round(260 - (GY - C) * PPU).astype(int)
    ok = (px >= 0) & (px < 520) & (py >= 0) & (py < 520); m = np.zeros(px.shape, bool); m[ok] = ~bg[py[ok], px[ok]]; return m
for view, rm, mm in (("front", ref(FCX + GX / U, FCY - GY / U), ren("_front.png", GX)),
                     ("side", ref(SXB + GX / U, SCY - GY / U), ren("_left.png", GX))):
    iou = (rm & mm).sum() / (rm | mm).sum()
    ov = np.full((*rm.shape, 3), 255, np.uint8); ov[rm & mm] = (90, 60, 180); ov[rm & ~mm] = (230, 40, 40); ov[~rm & mm] = (40, 160, 230)
    Image.fromarray(ov[::-1]).save("iou_%s.png" % view)
    print(view, "IoU %.3f" % iou, "missing", int((rm & ~mm).sum()), "extra", int((~rm & mm).sum()))
