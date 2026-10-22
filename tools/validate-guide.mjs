// רובו־דע the guide (1.3.2): checks every line he says (src/data/guide-lines.js) and the journey registry.
// Usage: node tools/validate-guide.mjs   (exit code 1 on errors)
// - every line: a unique id (the voice file name), words (f) and beginners' words (k) with full nikud
// - short bubbles: up to 18 words (one idea each); no forbidden words (the same list as validate-content)
// - every `at` is a CSS selector string; every GUIDE key that names a journey part exists in PARTS
import { GUIDE, allGuideLines } from '../src/data/guide-lines.js';
import { PARTS, STAGES } from '../src/core/journey.js';

const errors = []; const err = (m) => errors.push(m);
const HEB = /[א-ת]/g, NIK = /[ְ-ׇּׁׂ]/g;
function vocalised(s) {
  const letters = (String(s).match(HEB) || []).length; if (!letters) return true;
  const marks = (String(s).match(NIK) || []).length;
  for (const w of String(s).split(/[\s,.?!:;"'()–-]+/)) { const l = (w.match(HEB) || []).length; if (l >= 2 && !(w.match(NIK) || []).length) return false; }
  return marks * 2 >= letters * 0.8;
}
const FORBIDDEN = ['מיליוני שנים', 'מיליון שנה', 'דינוזאור', 'אבולוציה', 'חזיר', 'אנשים', 'בני אדם', 'אישה', 'ילדים', 'זיווג', 'הזדווג', 'גופה', 'פגר', 'צלב'];
const strip = (s) => String(s).replace(NIK, '');
const ids = new Set();
for (const ln of allGuideLines()) {
  const where = ln.id || JSON.stringify(ln).slice(0, 60);
  if (!ln.id || !/^[a-z0-9][a-z0-9._-]*$/i.test(ln.id)) err(`bad or missing id: ${where}`);
  if (ids.has(ln.id)) err(`duplicate id: ${ln.id}`); ids.add(ln.id);
  if (!ln.f || !String(ln.f).trim()) err(`${where}: no words (f)`);
  if (!ln.k || !String(ln.k).trim()) err(`${where}: no beginners' words (k)`);
  else if (!vocalised(ln.k)) err(`${where}: beginners' words without full nikud: "${ln.k}"`);
  for (const s of [ln.f, ln.k]) {
    if (!s) continue;
    const n = strip(s).split(/\s+/).filter(Boolean).length; if (n > 18) err(`${where}: ${n} words, keep a bubble to one short idea: "${s}"`);
    for (const w of FORBIDDEN) if (strip(s).includes(w)) err(`${where}: forbidden word "${w}"`);
    if (/[—]/.test(s)) err(`${where}: no em dash in on-screen words`);
  }
  if (ln.at != null && typeof ln.at !== 'string') err(`${where}: at must be a CSS selector string`);
  if (ln.expr && !['normal', 'happy', 'curious', 'wow', 'oops'].includes(ln.expr)) err(`${where}: unknown expr ${ln.expr}`);
}
for (const k of Object.keys(GUIDE)) if (!k.includes(':') && !PARTS[k]) err(`GUIDE key "${k}" is neither a journey part nor an 'area:place' key`);
for (const k of Object.keys(GUIDE)) if (k.includes(':') && /^(zone|lab):/.test(k) && !PARTS[k] && !/^(zone|lab):[a-z]+(:|$)/.test(k)) err(`GUIDE key "${k}" looks like a part but is not in PARTS`);
if (STAGES.length !== 6) err('six stages expected');
for (const [p, P] of Object.entries(PARTS)) { if (!(P.stage >= 1 && P.stage <= 6)) err(`part ${p}: stage out of range`); if (P.after && !PARTS[P.after]) err(`part ${p}: after ${P.after} is not a part`); if (!vocalised(P.kname)) err(`part ${p}: kname without nikud`); }
for (const S of STAGES) if (!vocalised(S.kname)) err(`stage ${S.n}: kname without nikud`);
if (errors.length) { console.log(errors.join('\n')); console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log(`guide OK: ${ids.size} lines, ${Object.keys(GUIDE).length} places, ${Object.keys(PARTS).length} parts`);
