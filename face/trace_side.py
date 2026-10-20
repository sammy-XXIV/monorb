# python -I trace_side.py : side profile of the face from the turnaround LEFT VIEW -> face_side.json
# per face row (top->bottom, normalised): front edge and back edge, in px relative to the deepest back point
import json
from collections import deque
import numpy as np
from PIL import Image
SHEET = "C:/Users/Dell/Downloads/1528255f-2430-4fe4-98ee-3537b3e41346.png"
CROP = (880, 165, 1110, 375)
a = np.asarray(Image.open(SHEET).convert("RGB").crop(CROP)).astype(int); h, w = a.shape[:2]
outside = ((a[..., 2] > 140) & (a[..., 0] < 150)) | (a.sum(-1) < 200)
seen = np.zeros((h, w), bool); st = (330 - 165, 960 - 880); assert not outside[st], a[st]
q = deque([st]); seen[st] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and not outside[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
rows = [r for r in range(h) if seen[r].any()]
front = np.array([np.nonzero(seen[r])[0].max() for r in rows], float)
back = np.array([np.nonzero(seen[r])[0].min() for r in rows], float)
k = 9   # strip the nose bump off the front profile with a running median
front_s = np.array([np.median(front[max(0, i - k):i + k + 1]) for i in range(len(front))])
base = back.min()
json.dump({"rows": len(rows), "front": (front_s - base).round(1).tolist(), "back": (back - base).round(1).tolist(),
           "nose_row": int(np.argmax(front - front_s)) / len(rows)}, open("face_side.json", "w"))
Image.fromarray((seen * 255).astype(np.uint8)).save("side_mask.png")
print("side face rows", len(rows), "max depth px", front_s.max() - base, "nose at", round(int(np.argmax(front - front_s)) / len(rows), 2))
