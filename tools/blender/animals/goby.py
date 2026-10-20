# גובי (Amblyeleotris steinitzi, Steinitz' prawn goby, named after the Israeli marine biologist Heinz Steinitz who
# worked in Eilat): a small long fish with a big head and high-set eyes, pale with brownish-orange bands; it guards the
# burrow it shares with a pistol shrimp and rests on the sand at the entrance.
L = 0.3
PALE, BAND, DOT, FIN = srgb('#efe6d4'), srgb('#c47a3a'), srgb('#f0b060'), srgb('#e8d8b8')
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t))); up = (P.y - yc) / max(1e-6, h)
    if tag.startswith('fin'):
        c = FIN
        if tag in ('fin_d', 'fin_e'): c = mix(FIN, DOT, 0.5 * (0.5 + 0.5 * math.sin(P.z * 500)))
        return c
    c = PALE
    c = mix(c, BAND, 0.85 * bands(t, (0.12, 0.3, 0.48, 0.66), 0.045, 0.02) * smooth(-0.9, -0.3, up))
    c = mix(c, DOT, 0.5 * smooth(0.25, 0.15, worley(P, 1 / 0.012, 3)[0]) * smooth(0.75, 1.0, t))
    return c
SPEC = fish_spec('goby', dict(
    L=L, paint=paint, speed=1.0, tris=1200, wave=1.0,
    prof=[(0.0, .05, .035, 0), (0.2, .065, .05, 0), (0.5, .08, .062, 0), (0.75, .095, .075, .005), (0.88, .095, .075, .005),
          (0.95, .07, .06, -.005), (1.0, .03, .03, -.012)],
    fins=dict(caudal=dict(shape='round', len=0.22, h=0.08),
              dorsal=dict(pts=[(0.66, .01), (0.62, .06), (0.52, .065), (0.47, .02)]),
              dorsal2=dict(pts=[(0.42, .01), (0.38, .055), (0.15, .055), (0.1, .01)]),
              anal=dict(pts=[(0.4, .01), (0.36, .045), (0.14, .045), (0.1, .01)]),
              pect=dict(t=0.7, len=0.14, w=0.08, out=0.6, y=-0.1), pelvic=dict(t=0.68, len=0.08, w=0.05)),
    eye=(0.87, 0.62, 0.05, '#c89048'),
    meta=dict(speeds={'walk': 0.5, 'run': 1.2, 'fly': 1.0}, map={'idle': 'perch', 'walk': 'glide', 'run': 'fly', 'sit': 'perch'})))
