import sys
from PIL import Image
ref, ren, out = sys.argv[1], sys.argv[2], sys.argv[3]
a = Image.open(ref).convert('RGB'); b = Image.open(ren).convert('RGB')
H = 500
a = a.resize((int(a.size[0] * H / a.size[1]), H)); b = b.resize((int(b.size[0] * H / b.size[1]), H))
c = Image.new('RGB', (a.size[0] + b.size[0], H), (255, 255, 255)); c.paste(a, (0, 0)); c.paste(b, (a.size[0], 0)); c.save(out, quality=88)
