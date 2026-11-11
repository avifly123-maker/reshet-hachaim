#!/usr/bin/env python3
# Species portraits for the desert and the savanna (the tray / journal / cards), rendered headless from the real models.
# Rigged animals are built once and given 6 s to decode their baked textures, else they come out black.
#   python3 tools/make-thumbs-new.py     → merges desert + savanna into src/data/thumbs.js
import asyncio, json, subprocess, pathlib, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    from playwright.async_api import async_playwright
    tmp = pathlib.Path(tempfile.mkdtemp())
    subprocess.run(['npx', 'esbuild', str(ROOT / 'tools/thumbs/entry.js'), '--bundle', '--format=iife', '--outfile=' + str(tmp / 'b.js'),
                    '--log-level=error', '--loader:.png=dataurl', '--loader:.webp=dataurl', '--loader:.jpg=dataurl'], check=True, cwd=ROOT)
    (tmp / 'i.html').write_text('<html><body><script src="b.js"></script></body></html>')
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'])
        pg = await b.new_page(); await pg.goto((tmp / 'i.html').as_uri())
        await pg.wait_for_function('window.__thumbs', timeout=900000)
        new = await pg.evaluate('window.__thumbs'); await b.close()
    p = ROOT / 'src/data/thumbs.js'; s = p.read_text()
    head, body = s.split('export const THUMBS = ', 1)
    T = json.loads(body.strip().rstrip(';')); T.update(new)
    p.write_text(head + 'export const THUMBS = ' + json.dumps(T, separators=(',', ':')) + ';\n')
    print({k: len(v) for k, v in T.items()})
asyncio.run(main())
