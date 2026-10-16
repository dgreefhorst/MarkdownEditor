const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('native', {
  open: () => ipcRenderer.invoke('dlg:open'),
  recent: () => ipcRenderer.invoke('recent:list'),
  openPath: p => ipcRenderer.invoke('file:read', p),
  write: (p, c) => ipcRenderer.invoke('file:write', p, c),
  saveAs: (n, c) => ipcRenderer.invoke('dlg:saveas', n, c),
  state: s => ipcRenderer.send('state', s),
  pathFor: f => webUtils.getPathForFile(f),
  onMenu: cb => ipcRenderer.on('menu', (_e, c) => cb(c)),
  onOpen: cb => { ipcRenderer.on('open-file', (_e, r) => cb(r)); ipcRenderer.send('renderer-ready'); }
});
