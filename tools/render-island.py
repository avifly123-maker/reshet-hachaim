#!/usr/bin/env python3
# usage: node build.mjs && python3 tools/render-island.py <amazon|grove|reef|desert> art/islands/carousel/<zone>.png
# Transparent island stills for the start-screen carousel: render the island over black and over white, matte from the difference.
import sys, asyncio, base64, io, json
import pathlib; sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from apphost import mount
from playwright.async_api import async_playwright
from PIL import Image
import numpy as np
zone = sys.argv[1]; out = sys.argv[2]
EXPOSURE = {'amazon': 1.3, 'grove': 1.12, 'reef': 1.1, 'desert': 1.0}.get(zone, 1.1)   # the dense Amazon canopy needs the most light
W_, H_ = 1600, 1100
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': W_, 'height': H_})
        await pg.goto(await mount(pg, 'dist/index.html')); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.querySelector('[data-mode=full]')?.click()")
        await pg.evaluate(f"window.__app.bus.emit('start:biome',{{id:'{zone}'}})")
        for i in range(90):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("!!window.__game"): break
        await pg.wait_for_timeout(1500)
        await pg.evaluate("[...document.querySelectorAll('button')].find(b=>/דלג/.test(b.textContent)&&b.offsetParent)?.click()")
        await pg.evaluate("window.__app.bus.emit('quality',{q:'high'})")
        r = await pg.evaluate("""(()=>{const W=window.__game, d=W.debug; d.unlockAll(); W.points=1e6; let n=0;
          const R=W.env.radius*0.85, sp=W.biome.species; const rnd=(s=>()=> (s=(s*16807)%2147483647)/2147483647)(7);
          for (let pass=0; pass<4; pass++) for (const s of sp) { if (s.kind==='tool') continue; for (let k=0;k<(s.isPlant?3:1);k++){ const a=rnd()*6.283, r=Math.sqrt(rnd())*R; const res=d.place(s.id, Math.cos(a)*r, Math.sin(a)*r); if (res && typeof res!=='string') n++; } }
          return 'placed '+n+' plants '+W.plants.length+' animals '+W.animals.length})()""")
        print(r)
        for k in range(12):
            r = await pg.evaluate("(()=>{const d=window.__game.debug; d.auto(); return d.ff(25)})()"); 
        await pg.evaluate("window.__game.debug.auto()")
        print(await pg.evaluate("'plants '+window.__game.plants.length+' animals '+window.__game.animals.length+' t '+window.__game.simT.toFixed(0)"))
        res = await pg.evaluate("""(()=>{
          window.__noRender = true; for (const a of window.__game.animals) { a.injured = null; } 
          const P=window.__app.pipe, sc=P.scene, cam=P.camera, rd=P.renderer, W=window.__game;
          document.querySelector('#ui').style.visibility='hidden';
          const env=sc.children.find(o=>/^environment/.test(o.name));
          const hidden=[], HIDE=/^(sky|far-land|mist-sea2?|light-shafts|motes|pollen|mist|rain|birds|web-links|markers|tools|clouds?)$/;
          sc.traverse(o=>{ if(o.userData&&o.userData.entity) return; if(HIDE.test(o.name)||o.type==='Points'){ o.visible=false; hidden.push(o.name||o.type); return; }
            if(o.geometry){ if(!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); if(o.geometry.boundingSphere.radius>150){ o.visible=false; hidden.push(o.name||o.geometry.type); } } });
          sc.background=null; sc.fog=null;
          W.rain=0; W.rainTarget=0; W.rainT=0; W.storm=0; W.dayFrac=0.42;
          P.resScale=1; P.resize();
          return JSON.stringify({hidden});
        })()""")
        J = json.loads(res); print('hidden', J['hidden'])
        await pg.evaluate("(()=>{const W=window.__game, d=W.debug; for(let i=0;i<10;i++){ W.rain=0; W.rainTarget=0; W.rainT=0; W.storm=0; W.dayFrac=0.42; d.auto(); d.ff(1); } })()")  # noon light settles
        res = await pg.evaluate("""(()=>{const P=window.__app.pipe, rd=P.renderer, cam=P.camera, sc=P.scene, W=window.__game, shots={}, EXPOSURE=""" + str(EXPOSURE) + """;
          W.rain=0; W.dayFrac=0.42; sc.fog=null; sc.background=null;
          const HIDE=/^(sky|far-land|mist-sea2?|light-shafts|motes|pollen|mist|rain|birds|web-links|markers|tools|clouds?)$/;
          sc.traverse(o=>{ if(o.userData&&o.userData.entity) return; if(HIDE.test(o.name)||o.type==='Points') o.visible=false; if(o.geometry&&o.geometry.boundingSphere&&o.geometry.boundingSphere.radius>150) o.visible=false; });
          // fit the island and everything on it in the frame (world boxes of the meshes)
          const V=cam.position.constructor, mn=new V(1e9,1e9,1e9), mx=new V(-1e9,-1e9,-1e9), q=new V();
          const add=(root)=>root.traverse(o=>{ if(!o.geometry||!o.visible) return; const g=o.geometry; if(!g.boundingBox) g.computeBoundingBox(); const b=g.boundingBox; if(!b||!isFinite(b.min.x)) return; o.updateWorldMatrix(true,false);
            for (let i=0;i<8;i++){ q.set(i&1?b.max.x:b.min.x, i&2?b.max.y:b.min.y, i&4?b.max.z:b.min.z).applyMatrix4(o.matrixWorld); mn.min(q); mx.max(q); } });
          const env=sc.children.find(o=>/^environment/.test(o.name));
          for (const n of ['ground','island-edge','reef-floor','reef-base','reef-water-wall']) { const o=env.getObjectByName(n); if(o) add(o); }
          for (const p of W.plants) add(p.obj);
          const c=mn.clone().add(mx).multiplyScalar(0.5), sz=mx.clone().sub(mn);
          const fov=24, el=0.42, rr=Math.max(sz.x, sz.z)*0.5, hh=sz.y;
          const dd=Math.max(rr*1.15, hh*0.8)/Math.sin(fov*Math.PI/360);
          cam.fov=fov; cam.position.set(c.x, c.y+dd*Math.sin(el), c.z+dd*Math.cos(el)); cam.lookAt(c.x, c.y, c.z); cam.updateProjectionMatrix();
          // straight to the canvas, without the post-processing: the bloom spread the white background over the island and
          // left it half transparent (a ghost on a light start screen); a touch more exposure for bright, vivid stills
          rd.toneMappingExposure = EXPOSURE;
          for (const [k,c] of [['b',0x000000],['w',0xffffff]]) { rd.setClearColor(c,1); rd.shadowMap.needsUpdate=true; rd.render(sc, cam); shots[k]=rd.domElement.toDataURL('image/png'); }
          rd.toneMappingExposure = 1;
          return JSON.stringify({shots});})()""")
        J = json.loads(res)
        ims = {k: np.asarray(Image.open(io.BytesIO(base64.b64decode(v.split(',')[1]))).convert('RGB')).astype(np.float32) / 255 for k, v in J['shots'].items()}
        bk, wh = ims['b'], ims['w']
        bgw = (wh - bk)[:6, :6].reshape(-1, 3).mean(0)   # the white background after tone mapping (it is not quite 1)
        print('bg white', bgw)
        a = 1 - ((wh - bk) / np.maximum(bgw, 0.05)).mean(axis=2); a = np.clip(a, 0, 1)
        col = np.where(a[..., None] > 1e-3, bk / np.maximum(a[..., None], 1e-3), 0); col = np.clip(col, 0, 1)
        rgba = np.dstack([col, a]); img = Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA')
        bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); print('bbox', bb)
        if bb: img = img.crop((max(0, bb[0]-12), max(0, bb[1]-12), min(W_, bb[2]+12), min(H_, bb[3]+12)))
        img.save(out); print('saved', out, img.size)
        await b.close()
asyncio.run(main())
