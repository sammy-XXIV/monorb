# python -I trace_hair.py : trace the official avatar's hair outline -> hair_outline.json (radius per frontal angle, model units)
import json, math
import numpy as np
from PIL import Image
a = np.asarray(Image.open("C:/Users/Dell/Downloads/AAyO53pg_400x400.jpg").convert("RGB")).astype(int)
hair = (a[..., 2] - a[..., 1] > 60) & (a[..., 0] < 140) & (a[..., 1] < 90)
H_, W_ = hair.shape
FACE = (151, 176, 309, 298)                       # avatar face box (px)
U = 1.8 / (FACE[2] - FACE[0])                    # model units per px (model face is 1.8 wide)
FX, FY = (FACE[0] + FACE[2]) / 2, (FACE[1] + FACE[3]) / 2     # face centre px  <-> model (0, -0.2)
CX, CY = 215, 165                                # ray origin inside the hair mass (px)
def body(x, y): return y > 300 and 140 < x < 345 # hoodie, same colour as hair
out = []
for deg in range(360):
    t_last = 0; c, s = math.cos(math.radians(deg)), -math.sin(math.radians(deg))
    for t in range(1, 320):
        x, y = int(CX + c * t), int(CY + s * t)
        if not (0 <= x < W_ and 0 <= y < H_) or body(x, y): break
        if hair[y, x]: t_last = t
    out.append(round(t_last * U, 4))
centre = [round((CX - FX) * U, 4), round(-(CY - FY) * U - 0.2, 4)]
json.dump({"centre": centre, "r": out}, open("hair_outline.json", "w"))
print("centre (model)", centre); print("r every 15 deg:", [out[d] for d in range(0, 360, 15)])
