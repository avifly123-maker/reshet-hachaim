# Blender scripts (run inside Blender 5.x via the MCP bridge or the Text Editor)

Each script is self-contained and idempotent: it (re)builds its own scene and never touches other scenes.
Render outputs go to the OS temp folder; tools/build-panorama.py packs them from art/pano/.

- pano_common.py   – helpers: fbm noise, polar terrain builder, pano camera, compositor haze, async quarter renders
- amazon_pano.py   – Amazon horizon: canopy crowns (particles), wide river, mist patches, hazy uplands
- grove_pano.py    – Grove horizon: rolling limestone hills with terraces, oaks/carobs/olives, rocks, clear air

Panorama camera: equirectangular, latitude -20..+7°, 450 m above the canopy, rendered as four 90° quarters
(2048×614 each, Cycles 40 spp + denoise) plus a 2048-wide mist pass for in-game re-hazing.
Lesson learned: never run heavy Python in Blender while an async render is running (it can deadlock).
