// רשת החיים – desktop shell (Electron). Loads the desktop build of the game (node build.mjs --desktop → app/):
// index.html + core.js + packs/ (each zone and the learning hub, loaded on demand with import()) + assets/ (pictures,
// fonts). It is served over app://game/ – a privileged custom scheme – because Chromium does not allow ES-module
// import() and fetch() from file:// pages.
// Saves: the game keeps using localStorage; preload.js mirrors every "web-of-life*" key to a real JSON file in
// %APPDATA%\רשת החיים\saves\ (with a rolling backup) and restores from it if the browser storage is ever lost.
// Versions up to 1.0.x ran from file://, so their localStorage belongs to the file:// origin; on the first start
// under app://game, carryOverFileStorage() copies it across (see there).
const { app, BrowserWindow, ipcMain, Menu, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const reportPdf = require('./report-pdf');

// the product name comes from package.json: the torah edition is built with its own name (builder-torah.json →
// extraMetadata), so it gets its own data folder (%APPDATA%\<name>), saves and single-instance lock
const PRODUCT = (() => { try { return require('./package.json').productName || 'רשת החיים'; } catch (e) { return 'רשת החיים'; } })();
app.setName(PRODUCT);
// a second copy only hands the focus to the first one and closes – it must not open windows or touch the saves
const PRIMARY = app.requestSingleInstanceLock();
if (!PRIMARY) { app.quit(); }

// ───────────────────────────── app://game/ – the game's own origin, files read from app/ (inside app.asar)
const APP_DIR = path.join(__dirname, 'app');
const GAME_ORIGIN = 'app://game';
// must run before the app is ready: standard (relative URLs, an origin, localStorage), secure (like https),
// fetch() support, and V8 code caching of the scripts between starts
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } }]);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.wasm': 'application/wasm',
};
function serveApp() {
  protocol.handle('app', async (req) => {
    let url;
    try { url = new URL(req.url); } catch (e) { return new Response('bad url', { status: 400 }); }
    if (url.host !== 'game') return new Response('not found', { status: 404 });
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(APP_DIR, rel);
    if (!file.startsWith(APP_DIR + path.sep)) return new Response('forbidden', { status: 403 });   // no way out of app/
    try {
      const data = await fs.promises.readFile(file);   // asar-aware
      return new Response(data, { status: 200, headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch (e) {
      return new Response('not found', { status: 404 });
    }
  });
}

const SAVE_DIR = () => path.join(app.getPath('userData'), 'saves');
const SAVE_FILE = () => path.join(SAVE_DIR(), 'saves.json');
const BACKUP_FILE = () => path.join(SAVE_DIR(), 'saves.backup.json');

function readSaves() {
  for (const f of [SAVE_FILE(), BACKUP_FILE()]) {
    try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (j && typeof j === 'object' && j.keys) return j; } catch (e) { /* try the next file */ }
  }
  return null;
}
let lastWritten = '';
function writeSaves(json) {
  if (typeof json !== 'string' || json === lastWritten) return true;
  try {
    fs.mkdirSync(SAVE_DIR(), { recursive: true });
    if (fs.existsSync(SAVE_FILE())) fs.copyFileSync(SAVE_FILE(), BACKUP_FILE());
    const tmp = SAVE_FILE() + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, SAVE_FILE());       // atomic replace: a crash never leaves a half-written save
    lastWritten = json;
    return true;
  } catch (e) { return false; }
}
// Updates: the install path, app id and data folder (%APPDATA%\רשת החיים) never change between versions, so the game's
// own storage and the saves file carry over. In addition, the first run of every new version keeps a dated snapshot
// of all saves (saves\versions\), so a faulty update can never cost the children their forests and albums.
function snapshotOnVersionChange() {
  try {
    const marker = path.join(SAVE_DIR(), 'last-version.txt');
    const prev = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : '';
    const cur = app.getVersion();
    if (prev === cur) return;
    fs.mkdirSync(path.join(SAVE_DIR(), 'versions'), { recursive: true });
    if (prev && fs.existsSync(SAVE_FILE())) {
      const stamp = new Date().toISOString().slice(0, 10);
      fs.copyFileSync(SAVE_FILE(), path.join(SAVE_DIR(), 'versions', `saves-before-${cur}-from-${prev}-${stamp}.json`));
      // keep the 8 newest snapshots
      const all = fs.readdirSync(path.join(SAVE_DIR(), 'versions')).filter((f) => f.endsWith('.json'))
        .map((f) => ({ f, t: fs.statSync(path.join(SAVE_DIR(), 'versions', f)).mtimeMs })).sort((a, b) => b.t - a.t);
      for (const old of all.slice(8)) fs.unlinkSync(path.join(SAVE_DIR(), 'versions', old.f));
    }
    fs.writeFileSync(marker, cur, 'utf8');
  } catch (e) { /* never block start-up over a snapshot */ }
}

// Saves from 1.0.x live in the file:// origin's localStorage, which the app://game page cannot see. On the first start
// of a build that runs from app://game (marker saves\storage-origin.txt missing), a hidden window reads the old
// storage and, only if the new origin's storage is still empty, writes those keys into it and into saves.json.
// The file:// storage itself is left as it was (an older version installed again would still find it). If anything
// here fails, the preload's own restore from saves.json covers it: 1.0.x kept that file up to date (every 4 s and on
// closing), and app://game starts with an empty storage, which is exactly when the preload restores.
const ORIGIN_FILE = () => path.join(SAVE_DIR(), 'storage-origin.txt');
const READ_KEYS = `(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('web-of-life')) o[k] = localStorage.getItem(k); } return o; })()`;
async function carryOverFileStorage() {
  if (fs.existsSync(ORIGIN_FILE())) return 'done before';
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false } });
  let result = 'nothing to copy';
  try {
    await w.loadURL(GAME_ORIGIN + '/migrate.html');
    const now = await w.webContents.executeJavaScript(READ_KEYS);
    if (Object.keys(now).length) result = 'new storage already in use';
    else {
      await w.loadFile(path.join(APP_DIR, 'migrate.html'));
      const old = await w.webContents.executeJavaScript(READ_KEYS);
      const n = Object.keys(old).length;
      if (n) {
        // the file:// storage is what 1.0.x played from – at least as new as its mirror file
        writeSaves(JSON.stringify({ v: 1, savedAt: new Date().toISOString(), keys: old }));
        await w.loadURL(GAME_ORIGIN + '/migrate.html');
        await w.webContents.executeJavaScript(`((k) => { for (const [a, v] of Object.entries(k)) localStorage.setItem(a, v); })(${JSON.stringify(old)})`);
        await w.loadURL(GAME_ORIGIN + '/migrate.html');   // a fresh page: confirm the keys reached the storage
        const back = await w.webContents.executeJavaScript(READ_KEYS);
        result = `copied ${Object.keys(back).length}/${n} keys from file://`;
      }
    }
    fs.mkdirSync(SAVE_DIR(), { recursive: true });
    fs.writeFileSync(ORIGIN_FILE(), `${GAME_ORIGIN}\n${new Date().toISOString()} ${result}\n`, 'utf8');
  } catch (e) {
    result = 'failed: ' + ((e && e.message) || e);   // no marker: tried again next start (never over a used storage)
  } finally {
    w.destroy();
  }
  return result;
}
ipcMain.on('saves:read', (e) => { e.returnValue = readSaves(); });
ipcMain.on('saves:write', (e, json) => { writeSaves(json); });
ipcMain.on('saves:writeSync', (e, json) => { e.returnValue = writeSaves(json); });

// "דוח החוקר": the game shows the report page, we print it to an A4 PDF (the page's @media print rules hide the 3D
// canvas and the rest of the interface) and save it in Documents\רשת החיים – דוחות, then show the file in its folder.
ipcMain.handle('report:pdf', async (e, name) => {
  if (!win || e.sender !== win.webContents) return { ok: false, error: 'not the game window' };
  try {
    const data = await e.sender.printToPDF({ pageSize: 'A4', landscape: false, printBackground: true, preferCSSPageSize: true });
    const r = await reportPdf.savePdf({ documentsDir: app.getPath('documents'), base: reportPdf.safeBase(name), data });
    shell.showItemInFolder(r.path);
    return { ok: true, name: r.name, path: r.path, folder: reportPdf.FOLDER };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

let win = null;
function createWindow() {   // the window first (so closing the hidden migration window never ends the app), the game after
  // Windows: no menu bar at all. macOS always shows a menu at the top of the screen; keep the standard minimal one so
  // Cmd+Q, Cmd+H, Cmd+C/V and full screen work as every Mac user expects
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      { label: 'תצוגה', submenu: [{ role: 'resetZoom', label: 'גודל רגיל' }, { role: 'zoomIn', label: 'הגדלה' }, { role: 'zoomOut', label: 'הקטנה' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'מסך מלא' }] },
      { role: 'windowMenu' },
    ]));
  } else Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 960, minHeight: 600,
    show: false, backgroundColor: '#0d1a14', title: PRODUCT,
    icon: path.join(__dirname, 'app', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      devTools: !app.isPackaged, spellcheck: false, backgroundThrottling: false,
    },
  });
  win.maximize();
  win.once('ready-to-show', () => win.show());
  // the game is fully offline: block navigation and pop-ups; any real web link opens in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(GAME_ORIGIN + '/')) e.preventDefault(); });
  // F11 toggles full screen, Ctrl+R reloads, Ctrl+= / Ctrl+- / Ctrl+0 zoom the interface
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const mod = input.control || (process.platform === 'darwin' && input.meta);   // Ctrl on Windows, Cmd on a Mac
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (mod && (input.key === 'r' || input.key === 'R')) { win.reload(); e.preventDefault(); }
    else if (mod && (input.key === '=' || input.key === '+')) { win.webContents.setZoomLevel(Math.min(3, win.webContents.getZoomLevel() + 0.5)); e.preventDefault(); }
    else if (mod && input.key === '-') { win.webContents.setZoomLevel(Math.max(-3, win.webContents.getZoomLevel() - 0.5)); e.preventDefault(); }
    else if (mod && input.key === '0') { win.webContents.setZoomLevel(0); e.preventDefault(); }
  });
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
if (PRIMARY) app.whenReady().then(async () => {
  snapshotOnVersionChange();
  serveApp();
  createWindow();
  const migration = await carryOverFileStorage();
  if (process.env.WOL_DEBUG_MIGRATION) console.log('storage migration:', migration);
  if (win) win.loadURL(GAME_ORIGIN + '/index.html');
});
app.on('window-all-closed', () => app.quit());
