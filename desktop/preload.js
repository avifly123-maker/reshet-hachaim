// Mirrors the game's saves (localStorage keys starting with "web-of-life") to a real file through the main process,
// and restores them on start if the browser storage is empty (e.g. after a profile reset). Runs before the game.
const { ipcRenderer, contextBridge } = require('electron');

// The one thing the game may ask of the desktop shell: save the open "דוח החוקר" page as a PDF file.
// Resolves to { ok, name, path } (see main.js 'report:pdf').
try {
  contextBridge.exposeInMainWorld('wolDesktop', {
    saveReportPDF: (name) => ipcRenderer.invoke('report:pdf', String(name == null ? '' : name).slice(0, 200)),
  });
} catch (e) { /* no context isolation: nothing to expose */ }

const PREFIX = 'web-of-life';
function snapshot() {
  const keys = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys[k] = localStorage.getItem(k);
    }
  } catch (e) { /* storage unavailable */ }
  return keys;
}
function serialize(keys) { return JSON.stringify({ v: 1, savedAt: new Date().toISOString(), keys }); }

// restore only when the browser storage lost everything (a deleted or reset player must not come back)
try {
  const saved = ipcRenderer.sendSync('saves:read');
  if (saved && saved.keys && Object.keys(snapshot()).length === 0) {
    for (const [k, v] of Object.entries(saved.keys)) {
      if (typeof v === 'string' && localStorage.getItem(k) === null) localStorage.setItem(k, v);
    }
  }
} catch (e) { /* first run or unreadable file: start fresh */ }

let last = '';
function flush(sync) {
  const json = serialize(snapshot());
  const body = json.slice(json.indexOf('"keys"'));          // ignore the timestamp when comparing
  if (body === last) return;
  last = body;
  if (sync) ipcRenderer.sendSync('saves:writeSync', json); else ipcRenderer.send('saves:write', json);
}
setInterval(() => flush(false), 4000);
window.addEventListener('beforeunload', () => flush(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(false); });
