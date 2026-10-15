#!/usr/bin/env python3
"""The printed artwork of the card pack (front of the foil bag), used as a texture in Blender.
Writes <out>/print.png (colour) and <out>/gold.png (white = gold foil: frame, emblem, title, card frames).
usage: python3 tools/pack-print.py <out-dir> <fonts-dir>   (fonts: the game's woff2 fonts converted to ttf)"""
import sys, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
OUT, FONTS = sys.argv[1], sys.argv[2]
W, H = 1024, 1536
rnd = random.Random(4)
GOLD = (244, 210, 118, 255)

yy, xx = np.mgrid[0:H, 0:W]
r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 0.42) / H * 1.2) ** 2)
t = np.clip(r / 0.75, 0, 1)[..., None]
img = Image.fromarray((np.array([26, 92, 58]) * (1 - t) + np.array([6, 34, 22]) * t).astype('uint8')).convert('RGBA')
gold = Image.new('L', (W, H), 0); g = ImageDraw.Draw(gold)

# soft leaf silhouettes
leaves = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ld = ImageDraw.Draw(leaves)
for k in range(46):
    x = rnd.uniform(0, W); y = rnd.uniform(160, H - 160); L = rnd.uniform(70, 190); a = rnd.uniform(0, math.tau); w = L * 0.36
    pts = [((i / 20 - 0.5) * L, math.sin(i / 20 * math.pi) * w * 0.5) for i in range(21)]
    pts += [(px, -py) for px, py in reversed(pts)]
    pts = [(x + px * math.cos(a) - py * math.sin(a), y + px * math.sin(a) + py * math.cos(a)) for px, py in pts]
    ld.polygon(pts, fill=rnd.choice([(60, 140, 80, 60), (40, 120, 70, 55), (90, 160, 90, 45), (30, 100, 60, 70)]))
img = Image.alpha_composite(img, leaves.filter(ImageFilter.GaussianBlur(1.2)))
d = ImageDraw.Draw(img)

# crimped seals: metallic ribbed bands
for (y0, y1) in ((0, 150), (H - 150, H)):
    for y in range(y0, y1):
        k = 0.5 + 0.5 * math.sin(y * 0.9)
        d.line([(0, y), (W, y)], fill=(int(150 + 60 * k), int(130 + 50 * k), int(70 + 30 * k), 255))
    g.rectangle([0, y0, W, y1], fill=255)

# gold frame
for box, rad, wd in (([44, 176, W - 44, H - 176], 46, 10), ([64, 196, W - 64, H - 196], 36, 3)):
    d.rounded_rectangle(box, rad, outline=(232, 196, 104, 255), width=wd); g.rounded_rectangle(box, rad, outline=255, width=wd)

# emblem: the game's web icon (24px svg geometry, scaled)
S = 8.5; OX, OY = W / 2 - 12 * S, 225
P = lambda x, y: (OX + x * S, OY + y * S)
for a, b in [((12, 5), (5, 17.5)), ((12, 5), (19, 17.5)), ((5, 17.5), (19, 17.5)), ((12, 5), (12, 12)), ((5, 17.5), (12, 12)), ((12, 12), (19, 17.5))]:
    d.line([P(*a), P(*b)], fill=(240, 206, 110, 255), width=13); g.line([P(*a), P(*b)], fill=255, width=13)
for (x, y, rr) in [(12, 5, 2.7), (5, 17.5, 2.7), (19, 17.5, 2.7), (12, 12, 2.1)]:
    X, Y = P(x, y); R = rr * S
    d.ellipse([X - R, Y - R, X + R, Y + R], fill=(240, 206, 110, 255)); g.ellipse([X - R, Y - R, X + R, Y + R], fill=255)

# a fan of three cards (the game's own card paintings)
arts = ['dartfrog', 'toucan', 'gazelle']
CW, CH = 300, 410
centers = [(W / 2 - 215, 720, 12), (W / 2, 690, 0), (W / 2 + 215, 720, -12)]
for i in (0, 2, 1):
    name = arts[i]; x, y, ang = centers[i]
    card = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); ImageDraw.Draw(card).rounded_rectangle([0, 0, CW - 1, CH - 1], 22, fill=(240, 206, 110, 255))
    art = Image.open('art/' + name + '.webp').convert('RGBA')
    win = (CW - 28, CH - 28); s = max(win[0] / 256, win[1] / 256); art = art.resize((int(256 * s), int(256 * s)), Image.LANCZOS)
    ox = (art.width - win[0]) // 2; art = art.crop((ox, 0, ox + win[0], win[1]))
    m = Image.new('L', win, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, win[0] - 1, win[1] - 1], 14, fill=255)
    card.paste(art, (14, 14), m)
    gm = Image.new('L', (CW, CH), 0); gd = ImageDraw.Draw(gm); gd.rounded_rectangle([0, 0, CW - 1, CH - 1], 22, fill=255); gd.rounded_rectangle([14, 14, CW - 15, CH - 15], 14, fill=0)
    card = card.rotate(ang, resample=Image.BICUBIC, expand=True); gm = gm.rotate(ang, resample=Image.BICUBIC, expand=True)
    sh = Image.new('RGBA', card.size, (0, 0, 0, 0)); sh.putalpha(card.split()[3].point(lambda a: int(a * 0.55))); sh = sh.filter(ImageFilter.GaussianBlur(14))
    px, py = int(x - card.width / 2), int(y - card.height / 2)
    img.alpha_composite(sh, (px + 10, py + 16)); img.alpha_composite(card, (px, py))
    gold.paste(0, (px, py), card.split()[3]); gold.paste(255, (px, py), gm)
d = ImageDraw.Draw(img)

# title (PIL lays out Hebrew right-to-left itself – libraqm)
fH = ImageFont.truetype(FONTS + '/wol-display-400-0.ttf', 170)
title = 'רשת החיים'
bb = d.textbbox((0, 0), title, font=fH, direction='rtl'); tw = bb[2] - bb[0]
tx = (W - tw) / 2 - bb[0]; ty = 1030
for o in range(10, 0, -2): d.text((tx + o * 0.4, ty + o * 0.6), title, font=fH, fill=(10, 30, 18, 255), direction='rtl')
d.text((tx, ty), title, font=fH, fill=GOLD, stroke_width=4, stroke_fill=(120, 80, 20, 255), direction='rtl')
g.text((tx, ty), title, font=fH, fill=255, stroke_width=4, stroke_fill=255, direction='rtl')
# "3 קלפים": in right-to-left reading the number comes first, i.e. on the right
fS = ImageFont.truetype(FONTS + '/wol-text-700-4.ttf', 64); fN = ImageFont.truetype(FONTS + '/wol-display-400-1.ttf', 74)
word = 'קלפים'; num = '3'
wb = d.textbbox((0, 0), word, font=fS, direction='rtl'); nb = d.textbbox((0, 0), num, font=fN)
total = (wb[2] - wb[0]) + 22 + (nb[2] - nb[0]); x0 = (W - total) / 2; y0 = 1268
d.text((x0 - wb[0], y0), word, font=fS, fill=(236, 232, 210, 255), direction='rtl')
d.text((x0 + (wb[2] - wb[0]) + 22 - nb[0], y0 - 6), num, font=fN, fill=GOLD); g.text((x0 + (wb[2] - wb[0]) + 22 - nb[0], y0 - 6), num, font=fN, fill=255)

img.convert('RGB').save(OUT + '/print.png'); gold.save(OUT + '/gold.png')
img.convert('RGB').resize((512, 768)).save(OUT + '/print_small.jpg', quality=85)
print('ok')
