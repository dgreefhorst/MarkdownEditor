const { app, BrowserWindow, Menu, MenuItem, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'txt'] }];
const COPYRIGHT = 'Copyright © 2026 Danny Greefhorst (danny.greefhorst@gmail.com)';
let win = null, ready = false, pendingPath = null;

const RECENT_MAX = 10;
const recentFile = () => path.join(app.getPath('userData'), 'recent.json');
async function recentLoad() {
  try {
    const a = JSON.parse(await fs.readFile(recentFile(), 'utf8'));
    return Array.isArray(a) ? a.filter(x => typeof x === 'string') : [];
  } catch { return []; }
}
async function recentAdd(p) {
  try {
    const list = [p, ...(await recentLoad()).filter(x => x !== p)].slice(0, RECENT_MAX);
    await fs.mkdir(path.dirname(recentFile()), { recursive: true });
    await fs.writeFile(recentFile(), JSON.stringify(list), 'utf8');
  } catch {}
}

async function readFile(p) {
  const content = await fs.readFile(p, 'utf8');
  app.addRecentDocument(p);
  await recentAdd(p);
  return { path: p, name: path.basename(p), content };
}
function openPath(p) {
  if (win && ready) {
    readFile(p).then(r => win.webContents.send('open-file', r))
      .catch(e => dialog.showErrorBox('Kan bestand niet openen', String(e.message || e)));
    if (win.isMinimized()) win.restore();
    win.focus();
  } else pendingPath = p;
}

const argPath = process.argv.slice(app.isPackaged ? 1 : 2).find(a => /\.(md|markdown|mdown|txt)$/i.test(a));
if (argPath) pendingPath = path.resolve(argPath);

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', (_e, argv) => {
  const p = argv.slice(1).find(a => /\.(md|markdown|mdown|txt)$/i.test(a));
  if (p) openPath(path.resolve(p)); else if (win) win.focus();
});
app.on('open-file', (e, p) => { e.preventDefault(); openPath(p); });

function createWindow() {
  ready = false;
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 600, minHeight: 400,
    title: 'Markdown Editor', backgroundColor: '#f6f5f1',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });
  // Waarschuwing bij sluiten met niet-opgeslagen wijzigingen (beforeunload in de pagina)
  win.webContents.on('will-prevent-unload', e => {
    const c = dialog.showMessageBoxSync(win, {
      type: 'warning', buttons: ['Annuleren', 'Sluiten zonder opslaan'], defaultId: 0, cancelId: 0,
      message: 'Er zijn niet-opgeslagen wijzigingen.', detail: 'Als je nu sluit, gaan deze wijzigingen verloren.'
    });
    if (c === 1) e.preventDefault();
  });
  win.on('closed', () => { win = null; ready = false; });
}

let mi = {};
function menu() {
  const send = c => () => { if (win) win.webContents.send('menu', c); };
  const mac = process.platform === 'darwin';
  mi.autosave = new MenuItem({ label: 'Auto-opslaan', type: 'checkbox', checked: false, click: send('autosave') });
  mi.copyMd = new MenuItem({ label: 'Kopieer Markdown', accelerator: 'CmdOrCtrl+Shift+C', click: send('copy-md') });
  mi.modeWysiwyg = new MenuItem({ label: 'Editor', type: 'radio', checked: true, accelerator: 'CmdOrCtrl+1', click: send('mode:wysiwyg') });
  mi.modeSplit = new MenuItem({ label: 'Gesplitst', type: 'radio', accelerator: 'CmdOrCtrl+2', click: send('mode:split') });
  mi.modeSource = new MenuItem({ label: 'Markdown', type: 'radio', accelerator: 'CmdOrCtrl+3', click: send('mode:source') });
  mi.theme = new MenuItem({ label: 'Thema wisselen', accelerator: 'CmdOrCtrl+Shift+D', click: send('theme') });
  mi.fmtBold = new MenuItem({ label: 'Vet', accelerator: 'CmdOrCtrl+B', click: send('fmt:bold') });
  mi.fmtItalic = new MenuItem({ label: 'Cursief', accelerator: 'CmdOrCtrl+I', click: send('fmt:italic') });
  mi.fmtStrike = new MenuItem({ label: 'Doorhalen', accelerator: 'CmdOrCtrl+Shift+X', click: send('fmt:strikeThrough') });
  mi.fmtCode = new MenuItem({ label: 'Inline code', accelerator: 'CmdOrCtrl+E', click: send('fmt:code') });
  mi.fmtUl = new MenuItem({ label: 'Opsomming', accelerator: 'CmdOrCtrl+Shift+8', click: send('fmt:insertUnorderedList') });
  mi.fmtOl = new MenuItem({ label: 'Genummerde lijst', accelerator: 'CmdOrCtrl+Shift+7', click: send('fmt:insertOrderedList') });
  mi.fmtTask = new MenuItem({ label: 'Takenlijst', click: send('fmt:task') });
  mi.fmtLink = new MenuItem({ label: 'Link…', accelerator: 'CmdOrCtrl+K', click: send('fmt:link') });
  mi.fmtImage = new MenuItem({ label: 'Afbeelding…', click: send('fmt:image') });
  mi.fmtTable = new MenuItem({ label: 'Tabel…', click: send('fmt:table') });
  mi.fmtHr = new MenuItem({ label: 'Horizontale lijn', click: send('fmt:insertHorizontalRule') });
  mi.fmtClear = new MenuItem({ label: 'Opmaak wissen', accelerator: 'CmdOrCtrl+\\', click: send('fmt:removeFormat') });
  mi.blocks = {};
  [['p', 'Alinea', 'CmdOrCtrl+Alt+0'], ['h1', 'Kop 1', 'CmdOrCtrl+Alt+1'], ['h2', 'Kop 2', 'CmdOrCtrl+Alt+2'],
   ['h3', 'Kop 3', 'CmdOrCtrl+Alt+3'], ['h4', 'Kop 4', 'CmdOrCtrl+Alt+4'], ['blockquote', 'Citaat', null],
   ['pre', 'Codeblok', null]].forEach(([v, label, acc]) => {
    mi.blocks[v] = new MenuItem({ label, type: 'radio', checked: v === 'p', accelerator: acc || undefined, click: send('block:' + v) });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu' }] : []),
    { label: 'Bestand', submenu: [
      { label: 'Nieuw', accelerator: 'CmdOrCtrl+N', click: send('new') },
      { label: 'Openen…', accelerator: 'CmdOrCtrl+O', click: send('open') },
      { role: 'recentDocuments' },
      { type: 'separator' },
      { label: 'Opslaan', accelerator: 'CmdOrCtrl+S', click: send('save') },
      { label: 'Opslaan als…', accelerator: 'CmdOrCtrl+Shift+S', click: send('saveas') },
      { type: 'separator' },
      mi.autosave,
      { type: 'separator' },
      { role: 'close' }
    ] },
    { label: 'Bewerken', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      { type: 'separator' },
      mi.copyMd
    ] },
    { label: 'Opmaak', submenu: [
      mi.blocks.p, mi.blocks.h1, mi.blocks.h2, mi.blocks.h3, mi.blocks.h4, mi.blocks.blockquote, mi.blocks.pre,
      { type: 'separator' },
      mi.fmtBold, mi.fmtItalic, mi.fmtStrike, mi.fmtCode,
      { type: 'separator' },
      mi.fmtUl, mi.fmtOl, mi.fmtTask,
      { type: 'separator' },
      mi.fmtLink, mi.fmtImage, mi.fmtTable, mi.fmtHr,
      { type: 'separator' },
      mi.fmtClear
    ] },
    { label: 'Weergave', submenu: [
      mi.modeWysiwyg, mi.modeSplit, mi.modeSource,
      { type: 'separator' },
      mi.theme,
      { type: 'separator' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ] },
    { role: 'windowMenu' }
  ]));
}

ipcMain.handle('dlg:open', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: FILTERS });
  return r.canceled ? null : readFile(r.filePaths[0]);
});
ipcMain.handle('file:read', (_e, p) => readFile(p).catch(() => null));
ipcMain.handle('file:write', async (_e, p, content) => {
  if (!path.isAbsolute(p)) throw new Error('Ongeldig pad');
  await fs.writeFile(p, content, 'utf8');
});
ipcMain.handle('dlg:saveas', async (_e, name, content) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters: FILTERS });
  if (r.canceled || !r.filePath) return null;
  await fs.writeFile(r.filePath, content, 'utf8');
  app.addRecentDocument(r.filePath);
  await recentAdd(r.filePath);
  return { path: r.filePath, name: path.basename(r.filePath) };
});
ipcMain.on('state', (_e, s) => {
  if (!win) return;
  win.setDocumentEdited(!!s.dirty);
  win.setRepresentedFilename(s.path || '');
  if (mi.autosave) mi.autosave.checked = !!s.autosave;
  if (mi.modeWysiwyg) {
    const active = { wysiwyg: mi.modeWysiwyg, split: mi.modeSplit, source: mi.modeSource }[s.mode];
    if (active) active.checked = true;
  }
  if (mi.blocks && mi.blocks[s.block]) mi.blocks[s.block].checked = true;
});
ipcMain.handle('recent:list', async () => {
  const out = [], seen = new Set();
  for (const p of await recentLoad()) {
    if (out.length >= RECENT_MAX) break;
    if (seen.has(p)) continue;
    seen.add(p);
    try { await fs.access(p); out.push({ path: p, name: path.basename(p) }); } catch {}
  }
  return out;
});
ipcMain.on('renderer-ready', () => {
  ready = true;
  if (pendingPath) { const p = pendingPath; pendingPath = null; openPath(p); }
  else if (win) win.webContents.send('menu', 'start');
});

app.whenReady().then(() => {
  app.setAboutPanelOptions({ applicationName: 'Markdown Editor', applicationVersion: app.getVersion(), copyright: COPYRIGHT });
  menu(); createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
