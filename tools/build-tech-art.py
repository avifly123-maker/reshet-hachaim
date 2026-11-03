# Technology-card paintings (1.4.3 set 4, Gemini in Avi's Chrome): art/techcards/raw/<id>.png (the zoom capture,
# about 790 px) -> art/techcards/<id>.webp (384 px) -> src/data/tech-card-art.js. Run: python3 tools/build-tech-art.py
import base64, glob, json, os
from PIL import Image
os.makedirs('art/techcards', exist_ok=True)
for f in sorted(glob.glob('art/techcards/raw/*.png')):
    im = Image.open(f).convert('RGB'); w, h = im.size; t = 3
    im = im.crop((t, t, w - t, h - t)).resize((384, 384), Image.LANCZOS)
    im.save('art/techcards/' + os.path.basename(f)[:-4] + '.webp', 'WEBP', quality=80, method=6)
m = {}
for f in sorted(glob.glob('art/techcards/*.webp')):
    m[os.path.basename(f)[:-5]] = 'data:image/webp;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
with open('src/data/tech-card-art.js', 'w') as fh:
    fh.write('// Technology-card paintings (384px webp, Gemini). Built by tools/build-tech-art.py\n')
    fh.write('export const TECH_ART = ' + json.dumps(m, separators=(',', ':')) + ';\n')
print(len(m), 'images', os.path.getsize('src/data/tech-card-art.js') // 1024, 'KB')
