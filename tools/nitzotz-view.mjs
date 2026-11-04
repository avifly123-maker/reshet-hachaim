// builds shots/nitzotz-view.html: ניצוץ alone on a page (tests/nitzotz/view.js), for looking at him (1.4.4 set 2)
import * as esbuild from 'esbuild';
import fs from 'fs';
const r = await esbuild.build({ entryPoints: ['tests/nitzotz/view.js'], bundle: true, write: false, format: 'iife', minify: true, logLevel: 'error' });
fs.mkdirSync('shots', { recursive: true });
fs.writeFileSync('shots/nitzotz-view.html', `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${r.outputFiles[0].text}</script></body></html>`);
console.log('shots/nitzotz-view.html', Math.round(r.outputFiles[0].contents.length / 1024) + ' KB');
