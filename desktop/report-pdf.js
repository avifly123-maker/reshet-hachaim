// "דוח החוקר" PDF export – the file side (no Electron here, so it can be tested with plain Node).
// main.js renders the page with webContents.printToPDF and hands the bytes to savePdf().
// Files go to  <Documents>\רשת החיים – דוחות\<name>.pdf ; a file that is open in a PDF viewer (locked on Windows)
// gets a numbered name instead of failing.
const path = require('path');
const fsp = require('fs').promises;

const FOLDER = 'רשת החיים – דוחות';

// a name that is valid on Windows: no reserved characters or device names, no trailing dot/space, not too long
function safeBase(name) {
  let s = String(name == null ? '' : name).normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^[.\s]+|[.\s]+$/g, '');
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s = '_' + s;
  if (!s) s = 'דוח החוקר';
  return s.slice(0, 100).trim();
}

async function savePdf({ documentsDir, base, data, fs = fsp }) {
  if (!documentsDir) throw new Error('no documents folder');
  if (!data || !data.length) throw new Error('empty pdf');
  const dir = path.join(documentsDir, FOLDER);
  await fs.mkdir(dir, { recursive: true });
  const name0 = safeBase(base);
  let last = null;
  for (let i = 1; i <= 20; i++) {
    const file = path.join(dir, (i === 1 ? name0 : `${name0} (${i})`) + '.pdf');
    try {
      await fs.writeFile(file, data);
      return { ok: true, path: file, dir, name: path.basename(file) };
    } catch (e) {
      last = e;
      if (!['EBUSY', 'EPERM', 'EACCES'].includes(e && e.code)) throw e;   // only a locked file is worth another name
    }
  }
  throw last || new Error('could not write the pdf');
}

module.exports = { FOLDER, safeBase, savePdf };
