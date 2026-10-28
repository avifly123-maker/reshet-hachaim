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
