// One place where failures are written down (1.4.4 stability set, docs/RULES-CODE.md). An optional part may fail and the
// game goes on, but the failure is never swallowed: logError(area, id, err) writes one line "[area] id message" through
// console.error (so the F strip of main.js shows it as the last error) and keeps the last 20 for tests and reports.
//   logError('warm', sp.id, e)    lastErrors() → [{ t, area, id, msg }]
const LAST = [];
export function logError(area, id, err) {
  const msg = String((err && (err.message || err)) || '').replace(/\s+/g, ' ').slice(0, 200);
  const line = { t: Date.now(), area: String(area), id: id == null ? '' : String(id), msg };
  LAST.push(line); if (LAST.length > 20) LAST.shift();
  try { console.error(`[${line.area}] ${line.id} ${msg}`.replace(/\s+/g, ' ')); } catch (e) { /* no console */ }
  return line;
}
export const lastErrors = () => LAST.slice();
