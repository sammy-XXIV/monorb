# python -I sheet.py <prefix> : stitch reference | front | 3/4 | side | back into one image
import sys, os
from PIL import Image
P = sys.argv[1]; D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_prev")
ref = Image.open("C:/Users/Dell/Downloads/AAyO53pg_400x400.jpg").convert("RGB").resize((420, 420))
close = os.path.join(D, "%s_0.png" % ("c" + P[1:]))
ref3 = Image.open(close).convert("RGB").resize((420, 420)) if os.path.exists(close) else ref
tiles = [ref, ref3] + [Image.open(os.path.join(D, "%s_%d.png" % (P, a))).convert("RGB").resize((420, 420)) for a in (0, 40, 90, 180)]
W = Image.new("RGB", (420 * 3, 420 * 2), "white")
for i, t in enumerate(tiles): W.paste(t, ((i % 3) * 420, (i // 3) * 420))
W.save(os.path.join(D, "%s_sheet.png" % P)); print("ok")
