#!/usr/bin/env python3
# The lab's item paintings (1.3.1): clues for "מי השאיר את זה?", things for "ממיינים כמו חוקרים", finds for
# "ראינו או חשבנו?", the fair test's pots, and the patent certificate's frame.
#   art/lab-items/<id>.webp (or .png / .jpg)   square watercolour paintings made in Gemini (same style as the cards)
#   art/lab-items/patent-frame.png             the certificate frame (a Blender render, transparent centre)
# → src/data/lab-items-art.js   export const LAB_ITEMS = { id: data URI }   (an asset module: files in the desktop build)
# Missing paintings are fine: the game shows a soft tile with the item's name (src/lab/lab-pics.js).
#   python3 tools/build-lab-items.py [--size 384]
import base64, glob, io, json, os, sys
from PIL import Image

SRC = 'art/lab-items'
OUT = 'src/data/lab-items-art.js'
size = 384
if '--size' in sys.argv: size = int(sys.argv[sys.argv.index('--size') + 1])

m = {}
files = sorted(glob.glob(SRC + '/*.webp') + glob.glob(SRC + '/*.png') + glob.glob(SRC + '/*.jpg'))
for f in files:
    key = os.path.splitext(os.path.basename(f))[0]
    if key in m: continue   # one picture per id (webp first)
    im = Image.open(f)
    frame = key == 'patent-frame'
    im = im.convert('RGBA' if frame or im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    lim = 1024 if frame else size
    if max(im.size) > lim:
        k = lim / max(im.size)
        im = im.resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=86 if frame else 80, method=6)
    m[key] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as fh:
    fh.write('// The lab\'s item paintings (webp). Built by tools/build-lab-items.py from art/lab-items/. Missing ids fall back to a tile.\n')
    fh.write('export const LAB_ITEMS = ' + json.dumps(m, separators=(',', ':')) + ';\n')
print(len(m), 'pictures', os.path.getsize(OUT) // 1024, 'KB')
