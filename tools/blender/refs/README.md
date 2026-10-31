# Reference photos for animal proportions (kit v6)

Side photos from Wikimedia Commons, used only to measure proportions (shoulder height, body depth along the body,
neck, head, legs, tail). They are not shipped in the game and not kept in the repository (licences of other people's photos): fetch them again from the search named below. A spec that was traced from one says so in its header.

- cheetah.png – a walking cheetah, side view (Commons media search "cheetah walking side view", 29.10.2026)
- caracal.png – a walking caracal, side view (Commons "Caracal caracal", 29.10.2026)
- sandcat.png – two sand cats (Commons "Felis margarita", 29.10.2026)

- zebra (z22) – Commons "Zebra 02.jpg" (31.10.2026)
- elephant (e1, mirrored) – Commons "Elephant side-view Kruger.jpg" (31.10.2026)
- lion (l1) – Commons "Panthera leo (male) (181091659).jpg" (31.10.2026)

On the owner's PC the photos are fetched by Blender's Python (the container cannot reach Commons): the Commons API
search, then the 500 px thumbnail from upload.wikimedia.org, into `animals\refs\cand`.

Before a Blender run, check a spec's side outline over its photo here (no Blender, `pip install mathutils`):
`python3 tools/blender/refs/overlay.py <spec.py> <photo> <x0> <y0> <m_per_px> <out.jpg>` – the blobs as red outlines,
the leg bones as blue lines, parts (ears, tusks) as green dots. The zebra: `200 310 0.00553`; the elephant (mirrored
photo): `220 318 0.01203`; the lion: `180 318 0.00577`.

Compare a render with its photo: `python3 tools/blender/refs/compare.py <photo> <render> <out.jpg>` (both scaled to
the same height, side by side).
