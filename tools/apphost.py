# Serves a desktop app folder (node build.mjs --desktop → desktop/app/) to headless Chromium the way desktop/main.js
# serves it over app://game/: one secure, same-origin host, files read straight from the folder, real MIME types, so
# import() of the packs, fetch() and WebGL textures behave as in the desktop app. Playwright cannot route a custom
# scheme, so the folder is mounted on https://game.local/ through page.route() (no server process, no port).
#   url = await mount(context_or_page, target)   target: an .html file (→ file:// URL, unchanged) or an app folder
import pathlib, mimetypes
ORIGIN = 'https://game.local'
MIME = {'.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css',
        '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary',
        '.woff2': 'font/woff2', '.svg': 'image/svg+xml'}

def is_app_folder(target):
    p = pathlib.Path(target)
    return p.is_dir() and (p / 'index.html').exists()

async def mount(ctx, target, log=None):
    p = pathlib.Path(target).resolve()
    if not p.is_dir(): return p.as_uri()
    async def handle(route):
        url = route.request.url
        rel = url[len(ORIGIN):].split('?')[0].split('#')[0].lstrip('/') or 'index.html'
        f = (p / rel).resolve()
        if p not in f.parents or not f.is_file():
            if log is not None: log.append(f'[404] {rel}')
            return await route.fulfill(status=404, body='not found')
        if log is not None: log.append(f'[get] {rel}')
        await route.fulfill(status=200, body=f.read_bytes(), headers={'content-type': MIME.get(f.suffix, mimetypes.guess_type(f.name)[0] or 'application/octet-stream'), 'cache-control': 'no-cache'})
    await ctx.route(ORIGIN + '/**', handle)
    return ORIGIN + '/index.html'
