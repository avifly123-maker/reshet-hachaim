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
#                 H=length, w=half-width at the base, t=half-thickness, parent='head', tip=0.55 roundness exponent)
#   ear_paint(P, N, E) → None when P is not on an ear, else (along 0..1, across -1..1, inside 0..1)
def blob_ears(blobs, bones, base, d, H, w, t, parent='head', tip=0.55, n=6):
    E = {'H': H, 'w': w, 'tip': tip, 'sides': {}}
    bones[:] = [b for b in bones if b[0] not in ('earL', 'earR')]
    for sx, L in ((1, 'L'), (-1, 'R')):
        bp = Vector((sx * base[0], base[1], base[2])); dd = Vector((sx * d[0], d[1], d[2])).normalized()
        side = dd.cross(Vector((0, 0, 1)))
        side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
        if side.x * sx < 0: side = -side
        fwd = side.cross(dd).normalized()
        if fwd.z < 0: fwd = -fwd
        E['sides'][L] = (bp, dd, side, fwd)
        bones.append(('ear' + L, parent, tuple(bp), tuple(bp + dd * H)))
        tilt = math.degrees(math.atan2(dd.x, dd.y)); lean = math.degrees(math.atan2(-dd.z, dd.y))
        for i in range(n):
            u = 0.08 + 0.76 * i / (n - 1)
            ww = w * (1 - u) ** tip + w * 0.2
            blobs.append(dict(t='ell', c=tuple(bp + dd * (H * u)), r=(ww, H * 0.13, t * (0.6 + 0.6 * (1 - u))), rot=(lean, 0, -tilt), bone='ear' + L))
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
