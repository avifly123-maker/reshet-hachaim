# 1.4, the desert's animals. Most desert animals are built on a close relative that the kit already knows well (the
# fennec on the fox, the dorcas gazelle on the gazelle, the sand cat and caracal on the jaguar, ...). A desert spec
# runs its relative's spec file, then changes what differs (ears, horns, colours, proportions), and calls derive() so
# every per-species table of the HD kit (body plan, anatomy of the legs, eyes, mouth, tweaks, skin) treats the new
# animal like its relative. Everything is modelled at the relative's size; meta['scale'] tells tools/build-rigged.py
# to scale the exported model to the real animal (box, bones, root motion), so no hand-tuned coordinate is touched.
#   base(sid, g)        run animals/<sid>.py into the globals g (the desert spec's own namespace)
#   derive(base, new)   copy every per-species entry of the kit tables (UPPER-case dicts and sets) from base to new
import os

def base(sid, g):
    p = os.path.join(D, sid + '.py')
    exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), g)
    return g

def derive(old, new):
    G = globals()
    for name, obj in list(G.items()):
        if not name.isupper() or name.startswith('_'): continue
        if isinstance(obj, dict) and old in obj and new not in obj: obj[new] = obj[old]
        elif isinstance(obj, set) and old in obj: obj.add(new)
    return new

def own(sid):
    """a desert animal modelled on its own: remove it from every per-species table (an earlier build may have put it
    there with derive), so the kit's family tweaks never reshape it"""
    G = globals()
    for name, obj in list(G.items()):
        if not name.isupper() or name.startswith('_'): continue
        if isinstance(obj, dict): obj.pop(sid, None)
        elif isinstance(obj, set): obj.discard(sid)
    return sid

# ───────────────────────────── ears that belong to the head (1.4)
# The kit's ear_part is a thin plate glued onto the head; in the HD bake it turns dark and reads as a flat triangle.
# A designer would grow the ear out of the skull: here each ear is a row of flattened ellipsoids on its own bone, merged
# by the metaballs into the head, broad at the base and rounding off at the tip, and painted from its own shape (fur on
# the back and the rim, a pale inside with hairs from the inner edges, an optional dark tip or tuft).
#   E = blob_ears(blobs, bones, base=(x, y, z) of the right ear (mirrored), d=(dx, dy, dz) direction of the right ear,
#                 H=length, w=half-width at the base, t=half-thickness, parent='head', tip=0.55 roundness exponent,
#                 turn=degrees the opening turns outwards round the ear's axis)
#   ear_paint(P, N, E) → None when P is not on an ear, else (along 0..1, across -1..1, inside 0..1)
def blob_ears(blobs, bones, base, d, H, w, t, parent='head', tip=0.55, n=6, turn=0.0):
    E = {'H': H, 'w': w, 'tip': tip, 'sides': {}}
    bones[:] = [b for b in bones if b[0] not in ('earL', 'earR')]
    for sx, L in ((1, 'L'), (-1, 'R')):
        bp = Vector((sx * base[0], base[1], base[2])); dd = Vector((sx * d[0], d[1], d[2])).normalized()
        side = dd.cross(Vector((0, 0, 1)))
        side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
        if side.x * sx < 0: side = -side
        fwd = side.cross(dd).normalized()
        if fwd.z < 0: fwd = -fwd
        if turn:   # the opening turned outwards round the ear's own axis (a cat's ear seen from the side is a triangle, not a blade)
            q = Quaternion(dd, math.radians(turn * sx)); side = q @ side; fwd = q @ fwd
        E['sides'][L] = (bp, dd, side, fwd)
        bones.append(('ear' + L, parent, tuple(bp), tuple(bp + dd * H)))
        tilt = math.degrees(math.atan2(dd.x, dd.y)); lean = math.degrees(math.atan2(-dd.z, dd.y))
        for i in range(n):
            u = 0.08 + 0.76 * i / (n - 1)
            ww = w * (1 - u) ** tip + w * 0.2
            blobs.append(dict(t='ell', c=tuple(bp + dd * (H * u)), r=(ww, H * 0.13, t * (0.6 + 0.6 * (1 - u))), rot=(lean, turn * sx, -tilt), bone='ear' + L))
    return E

def ear_paint(P, N, E):
    H, w, tip = E['H'], E['w'], E['tip']
    for L, (bp, dd, side, fwd) in E['sides'].items():
        r = Vector(P) - bp; along = r.dot(dd) / H
        if along < 0.02 or along > 1.06: continue
        ww = w * (1 - min(along, 0.98)) ** tip + w * 0.2
        across = r.dot(side) / ww
        if abs(across) > 1.4 or abs(r.dot(fwd)) > w * 0.7: continue
        inside = smooth(0.1, 0.55, Vector(N).dot(fwd)) * smooth(0.95, 0.7, abs(across)) * smooth(0.06, 0.16, along) * smooth(0.98, 0.86, along)
        return along, across, inside
    return None

def worley2(p, scale, seed=1):
    """cell pattern with borders (kit v6): the distances to the nearest and the second nearest jittered point (in cell
    units) and the nearest point's id. d2 - d1 is small along the border between two cells: a giraffe's net of pale
    lines, a tortoise's plates, cracked mud."""
    x, y, z = p[0] * scale, p[1] * scale, p[2] * scale
    ix, iy, iz = math.floor(x), math.floor(y), math.floor(z); d1, d2, rid = 9.0, 9.0, 0.0
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            for c in (-1, 0, 1):
                i, j, k = ix + a, iy + b, iz + c
                fx = i + _h3(i, j, k, seed); fy = j + _h3(i, j, k, seed + 1); fz = k + _h3(i, j, k, seed + 2)
                d = math.sqrt((x - fx) ** 2 + (y - fy) ** 2 + (z - fz) ** 2)
                if d < d1: d2 = d1; d1 = d; rid = _h3(i, j, k, seed + 3)
                elif d < d2: d2 = d
    return d1, d2, rid

def trunk_from_profile(prof, width, n=26, chest_z=-0.05):
    """kit v6: a body traced from a side photo. prof = [(z, top, bottom), …] from front to back (metres, any spacing);
    width(z) = half width at z. The profile is resampled at n even stations with a smooth (Catmull-Rom) curve and each
    station becomes one ellipsoid; neighbours overlap deeply (rz = 1.7 × the spacing), so the back and the belly are
    one smooth line, never a row of rings."""
    P = sorted(prof, key=lambda p: -p[0]); z0, z1 = P[0][0], P[-1][0]
    def cr(a, b, c, d, t):
        return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
    def at(z, k):
        for i in range(len(P) - 1):
            if P[i][0] >= z >= P[i + 1][0]:
                t = (P[i][0] - z) / max(1e-9, P[i][0] - P[i + 1][0])
                a = P[max(0, i - 1)][k]; b = P[i][k]; c = P[i + 1][k]; d = P[min(len(P) - 1, i + 2)][k]
                return cr(a, b, c, d, t)
        return P[-1][k]
    step = (z0 - z1) / (n - 1); out = []
    for i in range(n):
        z = z0 - step * i; top, bot = at(z, 1), at(z, 2)
        end = i in (0, n - 1)
        out.append(dict(t='ell', c=(0, (top + bot) / 2, z), r=(width(z), (top - bot) / 2, step * (1.2 if end else 1.7)),
                        bone='chest' if z > chest_z else 'hips'))
    return out

def cat_muscles(blobs, bones, sh, th, sh_t=0.5, th_t=0.55, th_back=0.04):
    """kit v6, cats: the upper arm and the thigh as one muscle each, placed on the upper leg bone (fl / hl, …) at sh_t /
    th_t of its length, so it shows below the body line where the photo shows it. The kit's own haunch (ANAT th) is
    kept small: a big haunch on the hip joint swells above the back like a balloon."""
    bb = {b[0]: (Vector(b[2]), Vector(b[3])) for b in bones}
    for L in ('l', 'r'):
        S, E = bb['f' + L]; c = S + (E - S) * sh_t
        blobs.append(dict(t='ell', c=tuple(c), r=sh, bone='f' + L, foot=True))   # foot=True: anat_legs keeps it
        S, E = bb['h' + L]; c = S + (E - S) * th_t + Vector((0, 0, -th_back))
        blobs.append(dict(t='ell', c=tuple(c), r=th, bone='h' + L, foot=True))
