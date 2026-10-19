# Album card frames (the badge frames, FRAMES in src/data/badges.js), rendered in Blender: art/frames/<id>.png,
# square 512x512 with a transparent centre, made for CSS border-image 9-slice (ornamented corners, continuous edges,
# slice about 22% from each side). Packs them into src/data/frame-art.js (an asset module: in the desktop build each
# picture becomes its own file). The hub (src/learn/hub.js) uses a frame's picture when it is here, and its box-shadow
# frame when it is not.
# Usage: python3 tools/build-frames.py            (webp with alpha, quality 92; --png keeps the PNGs as they are)
import base64, glob, io, json, os, sys
SRC, OUT = 'art/frames', 'src/data/frame-art.js'
keep_png = '--png' in sys.argv
try:
    from PIL import Image
except ImportError:
    Image = None; keep_png = True
m = {}
for f in sorted(glob.glob(SRC + '/*.png')):
    fid = os.path.basename(f)[:-4]
    if keep_png:
        m[fid] = 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
        continue
    im = Image.open(f).convert('RGBA')
    if im.size != (512, 512):
        print('note:', f, 'is', im.size, '(512x512 expected); resized'); im = im.resize((512, 512), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=92, method=6, exact=True)
    m[fid] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
with open(OUT, 'w') as fh:
    fh.write('// Album card frames (Blender renders, 512px, transparent centre, for border-image). Built by tools/build-frames.py\n')
    fh.write('export const FRAME_ART = ' + json.dumps(m, separators=(',', ':')) + ';\n')
print(len(m), 'frames', os.path.getsize(OUT) // 1024, 'KB')
