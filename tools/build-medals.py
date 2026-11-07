# The rare badges' metal medallions (1.4.4 set 9): art/medals/<metal>_<emblem>.png (Blender renders from
# tools/blender/medals.py, 320px, transparent) → src/data/medal-art.js (webp 192px, an asset module).
# Usage: python3 tools/build-medals.py [srcdir]   (copies the PNGs into art/medals first when srcdir is given)
import base64, glob, io, json, os, shutil, sys
from PIL import Image
SRC, OUT = 'art/medals', 'src/data/medal-art.js'
if len(sys.argv) > 1:
    os.makedirs(SRC, exist_ok=True)
    for f in glob.glob(os.path.join(sys.argv[1], '*.png')): shutil.copy(f, SRC)
m = {}
for f in sorted(glob.glob(SRC + '/*.png')):
    im = Image.open(f).convert('RGBA')
    box = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if box: im = im.crop(box)
    im = im.resize((192, round(192 * im.height / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=88, method=6)
    m[os.path.basename(f)[:-4]] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
with open(OUT, 'w') as fh:
    fh.write('// The rare badges\' metal medallions (Blender renders, tools/blender/medals.py). Built by tools/build-medals.py\n')
    fh.write('export const MEDAL_ART = ' + json.dumps(m, separators=(',', ':')) + ';\n')
print(len(m), 'medals', os.path.getsize(OUT) // 1024, 'KB')
