// Draws every icon (ui.js and icons-hub.js) on one page, to check the shapes by eye:
//   node tools/icon-sheet.mjs && python3 tools/play.py shots/icon-sheet.html tests/play/shot-icons.json 1240 1100
// (the picture lands in shots/icon-sheet.png: a dark tile and a white one per icon)
// Look for cross shapes (plus, x, crosshair, four-armed sparkle) and anything that reads as a figure.
import fs from 'node:fs';
import { HUB_ICONS } from '../src/ui/icons-hub.js';

const out = process.argv[2] || 'shots/icon-sheet.html';
// the ui.js table (src/ui/ui/icons.js since the 1.3.2 split) is a plain object literal: read it from the source
const src = fs.readFileSync(new URL('../src/ui/ui/icons.js', import.meta.url), 'utf8');
const m = src.match(/\nconst I = (\{[\s\S]*?\n\});/);
const UI = m ? Function('return ' + m[1])() : {};
const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const cell = (n, body, tag) => `<figure><div class="a">${svg(body)}</div><div class="b">${svg(body)}</div><figcaption>${tag ? '<i>' + tag + '</i> ' : ''}${n}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><title>icons</title><style>
body{margin:0;padding:14px;background:#f4efe0;font:12px sans-serif;color:#222}
h2{margin:6px 0;font-size:14px}.g{display:flex;flex-wrap:wrap;gap:8px}
figure{margin:0;width:150px;text-align:center}
figure .a,figure .b{display:inline-grid;place-items:center;width:70px;height:70px;border-radius:14px;margin:0 2px}
figure .a{background:#fff;color:#1f2c1a}figure .b{background:linear-gradient(160deg,#36505f,#263440);color:#ffd978}
svg{width:56px;height:56px}.b svg{width:30px;height:30px}.f{fill:currentColor;stroke:none;opacity:.26}
figcaption{margin-top:2px}i{color:#a33;font-style:normal}</style>
<h2>icons-hub.js</h2><div class="g">${Object.entries(HUB_ICONS).map(([n, b]) => cell(n, b, '')).join('')}</div>
<h2>ui.js</h2><div class="g">${Object.entries(UI).map(([n, b]) => cell(n, b, HUB_ICONS[n] ? 'dup' : '')).join('')}</div>`;
fs.writeFileSync(out, html);
console.log('wrote', out, Object.keys(HUB_ICONS).length, '+', Object.keys(UI).length, 'icons');
