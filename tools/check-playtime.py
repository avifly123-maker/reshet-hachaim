#!/usr/bin/env python3
"""The parents' play time (1.3.3), end to end in a headless page:
  python3 tools/check-playtime.py dist/index-torah.html [shots/playtime]
Settings row (a wrong code changes nothing, 2358 sets the limit), the start screen chip, the five-minute note, the lock
screen over the start screen and over a forest (the forest stops, keys do nothing), more time with the code, the limit
kept after a reload, beginners' words. Prints OK or the first failure; takes screenshots at 800x460."""
import sys, asyncio, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
QUIET = """(() => { try { window.__guide && window.__guide.close(); } catch (e) { }
  document.querySelectorAll('#rguide button, .howto button, .coach button').forEach((b) => /דלג|הבנתי|סגירה/.test(b.textContent) && b.click()); return 1; })()"""

async def main(build, out):
    from apphost import mount
    from playwright.async_api import async_playwright
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    errs = []; fails = []
    def ok(cond, what):
        print(('ok   ' if cond else 'FAIL ') + what, flush=True)
        if not cond: fails.append(what)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 800, 'height': 460})
        pg = await ctx.new_page(); pg.set_default_timeout(180000)
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        url = await mount(pg, build)
        await pg.goto(url); await pg.wait_for_function('window.__app && window.__playtime', timeout=240000)
        await pg.wait_for_timeout(6000); await pg.evaluate(QUIET)
        ok(await pg.evaluate("window.__playtime.limitMin() === 0 && document.querySelector('.st-time').hidden"), 'no limit by default, no chip')
        # the settings row
        await pg.click('.st-gear'); await pg.wait_for_timeout(1200); await pg.evaluate(QUIET)
        ok(await pg.locator('.set-time').count() == 1, 'the play time row is in the settings')
        await pg.click('.set-time [data-v="30"]'); await pg.wait_for_timeout(300)
        ok(await pg.locator('#set-pcode').count() == 1, 'a choice asks for the parents\' code')
        await pg.fill('#set-pcode', '1111'); await pg.click('[data-set="tcode"]'); await pg.wait_for_timeout(300)
        ok(await pg.evaluate("window.__playtime.limitMin() === 0 && !document.querySelector('.set-perr').hidden"), 'a wrong code changes nothing and says so')
        await pg.fill('#set-pcode', '2358'); await pg.screenshot(path=str(out / 'settings-code.png'))
        await pg.press('#set-pcode', 'Enter'); await pg.wait_for_timeout(400)
        ok(await pg.evaluate("window.__playtime.limitMin() === 30 && !document.querySelector('#set-pcode')"), 'the right code sets half an hour')
        await pg.screenshot(path=str(out / 'settings-set.png'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1500)
        chip = await pg.evaluate("(() => { const c = document.querySelector('.st-time'); return c && !c.hidden ? c.textContent.trim() : '' })()")
        ok(chip.startswith('עוד'), 'the start screen chip shows what is left: ' + chip)
        await pg.screenshot(path=str(out / 'start-chip.png'))
        # five minutes left
        await pg.evaluate("window.__playtime.count(30 * 60 - 290)"); await pg.wait_for_timeout(1600)
        ok(await pg.evaluate("!!document.querySelector('.pt-note.on')"), 'the five-minute note shows')
        await pg.screenshot(path=str(out / 'note-5.png'))
        # time is up on the start screen
        await pg.evaluate("window.__playtime.count(400)"); await pg.wait_for_timeout(1600)
        ok(await pg.evaluate("!!document.querySelector('.pt-lock')"), 'the lock screen covers the start screen')
        await pg.screenshot(path=str(out / 'lock-start.png'))
        await pg.mouse.click(400, 40); await pg.wait_for_timeout(300)
        ok(await pg.evaluate("!document.querySelector('.set-layer') && !!document.querySelector('.pt-lock')"), 'clicks do not reach the start screen')
        # more time with the code
        await pg.click('.pt-par summary'); await pg.fill('#pt-code', '2358'); await pg.click('[data-pt="code"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(out / 'lock-parents.png'))
        await pg.click('[data-pt="add"][data-min="30"]'); await pg.wait_for_timeout(1500)
        ok(await pg.evaluate("!document.querySelector('.pt-lock') && window.__playtime.leftSec() > 25 * 60"), 'half an hour more opens the game again')
        # a forest: the time runs out inside it
        await pg.evaluate("window.__app.bus.emit('start:biome', { id: 'grove' })")
        await pg.wait_for_function('window.__game && window.__game.debug', timeout=240000); await pg.wait_for_timeout(15000); await pg.evaluate(QUIET)
        await pg.evaluate("window.__playtime.count(window.__playtime.leftSec() + 1)"); await pg.wait_for_timeout(1600)
        t0 = await pg.evaluate("window.__game.simT")
        ok(await pg.evaluate("!!document.querySelector('.pt-lock')"), 'the lock screen covers the forest')
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(3000)
        t1 = await pg.evaluate("window.__game.simT")
        ok(t0 is None or t0 == t1, f'the forest waits ({t0} → {t1})')
        await pg.screenshot(path=str(out / 'lock-forest.png'))
        # a reload keeps the limit and the used time
        await pg.reload(); await pg.wait_for_function('window.__app && window.__playtime', timeout=240000); await pg.wait_for_timeout(5000)
        ok(await pg.evaluate("window.__playtime.limitMin() === 30 && !!document.querySelector('.pt-lock')"), 'after a reload the day is still over')
        # beginners
        await pg.click('.pt-par summary'); await pg.fill('#pt-code', '2358'); await pg.click('[data-pt="code"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-pt="add"][data-min="30"]'); await pg.wait_for_timeout(1500); await pg.evaluate(QUIET)
        await pg.evaluate("document.querySelector(\"[data-mode='kids']\") && document.querySelector(\"[data-mode='kids']\").click(); 1"); await pg.wait_for_timeout(2500); await pg.evaluate(QUIET)
        await pg.evaluate("window.__playtime.count(window.__playtime.leftSec() + 1)"); await pg.wait_for_timeout(1600)
        h = await pg.evaluate("(document.querySelector('.pt-lock h2') || {}).textContent || ''")
        ok('ְ' <= max(h or ' ') or any('֑' <= c <= 'ׇ' for c in h), 'beginners read it with vowels: ' + h)
        await pg.screenshot(path=str(out / 'lock-kids.png'))
        await b.close()
    ok(not errs, 'no page errors ' + (str(errs[:2]) if errs else ''))
    print('OK' if not fails else f'FAILED: {len(fails)}')
    sys.exit(1 if fails else 0)

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'shots/playtime'))
