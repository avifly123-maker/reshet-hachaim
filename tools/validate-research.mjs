// חוקרי היער: checks every mystery's data and the beginner rule that children aged 6 to 8 read vocalised text.
//   node tools/validate-research.mjs
// - every case: ids that exist in its zone, board / tool / idea / visual references that resolve, lights on real vars
// - beginner cases (level 'kids'): every Hebrew string a child reads carries nikud (one vowel mark per two letters at
//   least, so a forgotten word stands out); the same for the beginner screen texts (src/research/texts.js)
// - the population model of each case is a real puzzle: tests/research/solvable.mjs (run separately or with --all)
import { CASES } from '../src/research/cases/index.js';
import { KIDS_TEXTS } from '../src/research/texts.js';
import { BIOME as AMAZON } from '../src/data/amazon.js';
import { BIOME as GROVE } from '../src/data/grove.js';

const errors = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const zones = { amazon: AMAZON, grove: GROVE };
const HEB = /[א-ת]/g, NIK = /[ְ-ׇּׁׂ]/g;
function vocalised(s) {
  const letters = (String(s).match(HEB) || []).length; if (!letters) return true;
  const marks = (String(s).match(NIK) || []).length;
  // every word of two letters or more needs at least one mark
  for (const w of String(s).split(/[\s,.?!:;"'()–-]+/)) { const l = (w.match(HEB) || []).length; if (l >= 2 && !(w.match(NIK) || []).length) return false; }
  return marks * 2 >= letters * 0.8;
}
function kidStrings(C) {
  const out = [['title', C.title], ['call', C.call], ['callMore', C.callMore], ['solved', C.solved], ['learned', C.learned], ['realStory', C.realStory]];
  for (const [k, v] of Object.entries(C.lightNames || {})) out.push(['lightNames.' + k, v]);
  for (const b of C.board || []) out.push(['board.' + b.id, b.name]);
  for (const t of C.tools || []) out.push(['tools.' + t.id, t.name], ['tools.' + t.id + '.tell', t.tell]);
  for (const i of C.ideas || []) out.push(['ideas.' + i.id, i.title]);
  for (const [k, v] of Object.entries(C.after || {})) { if (typeof v === 'string') out.push(['after.' + k, v]); else for (const [k2, v2] of Object.entries(v)) out.push([`after.${k}.${k2}`, v2]); }
  (C.hints || []).forEach((h, i) => out.push(['hints.' + i, h]));
  for (const g of C.guesses || []) out.push(['guesses.' + g.id, g.text]);
  return out;
}
for (const C of CASES) {
  const B = zones[C.zone]; if (!B) { err(C.id, `unknown zone ${C.zone}`); continue; }
  const sp = new Set(B.species.map((s) => s.id));
  const vars = new Set(C.model.vars.map((v) => v.id));
  for (const f of C.model.flows) for (const k of ['from', 'to', 'eater', 'food', 'pred', 'prey', 'of']) if (f[k] && !vars.has(f[k])) err(C.id, `flow ${f.type}.${k} → unknown var ${f[k]}`);
  for (const f of C.model.flows) for (const k of ['half', 'need', 'rate', 'attack', 'handling']) if (k in f && !(f[k] > 0)) err(C.id, `flow ${f.type}: ${k} must be a positive number`);
  for (const f of C.model.flows) if ('byCap' in f && !(f.byCap > 0)) err(C.id, `flow ${f.type}: byCap must be positive`);
  for (const v of C.model.vars) if (v.kind === 'animal' && !(v.need > 0)) err(C.id, `animal ${v.id}: need must be positive`);
  for (const l of C.lights) if (!vars.has(l.id)) err(C.id, `light on unknown var ${l.id}`);
  for (const b of C.board) { if (!vars.has(b.id)) err(C.id, `board row ${b.id} is not a model var`); if (b.species && !sp.has(b.species)) err(C.id, `board species ${b.species} not in ${C.zone}`); if (!C.tools.some((t) => t.id === b.tool)) err(C.id, `board ${b.id}: tool ${b.tool} missing`); }
  for (const v of C.visual || []) { if (!vars.has(v.id)) err(C.id, `visual ${v.id} is not a model var`); if (!sp.has(v.species)) err(C.id, `visual species ${v.species} not in ${C.zone}`); }
  for (const i of C.ideas) { for (const k of Object.keys(i.effect.add || {})) if (!vars.has(k)) err(C.id, `idea ${i.id} changes unknown var ${k}`); if (i.icon.startsWith('species:') && !sp.has(i.icon.slice(8))) err(C.id, `idea ${i.id} icon species missing`); }
  for (const [d] of C.scene?.decor || []) if (!sp.has(d)) err(C.id, `decor ${d} not in ${C.zone}`);
  if (!C.guesses.some((g) => g.right)) err(C.id, 'no right guess');
  if (!C.tests) err(C.id, 'no solvability tests');
  if (C.level === 'kids') for (const [k, s] of kidStrings(C)) if (!vocalised(s)) err(C.id, `beginner text without full nikud: ${k} "${s}"`);
}
for (const [k, s] of Object.entries(KIDS_TEXTS)) if (!vocalised(s)) err('texts', `beginner screen text without full nikud: ${k} "${s}"`);
for (const e of errors) console.log('ERROR', e);
console.log(errors.length ? `\n${errors.length} error(s)` : `OK – ${CASES.length} mysteries checked`);
if (process.argv.includes('--all')) await import('../tests/research/solvable.mjs');
process.exit(errors.length ? 1 : 0);
