// Prints every line of רובו־דע as JSON (for tools/voice/make.py).
import { allGuideLines } from '../../src/data/guide-lines.js';
const seen = new Set(); const out = [];
for (const l of allGuideLines()) if (l.id && !seen.has(l.id)) { seen.add(l.id); out.push({ id: l.id, f: l.f, k: l.k }); }
process.stdout.write(JSON.stringify(out));
