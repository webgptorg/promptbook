'use strict';
const { contextBridge, ipcRenderer } = require('electron');

/**
 * The only desktop capability of a window's project dashboard: keeping its own workspace (tabs, unsaved drafts and
 * editor positions) for a restart, and handing documents to the same project's dashboard in another window. The shell
 * validates every call against this view's window and origin; no file, terminal, engine or Node capability reaches it.
 */
contextBridge.exposeInMainWorld('desktopWorkspace', {
    restore: () => ipcRenderer.invoke('workspace:restore'),
    save: (state) => ipcRenderer.send('workspace:save', state),
    locate: (key) => ipcRenderer.invoke('workspace:locate', String(key)),
    move: (document, target) => ipcRenderer.invoke('workspace:move', { document, target: String(target) }),
    offer: (document) => ipcRenderer.invoke('workspace:offer', document),
    claim: (token) => ipcRenderer.invoke('workspace:claim', String(token)),
    accept: (id) => ipcRenderer.invoke('workspace:accept', String(id)),
    reject: (id, reason) => ipcRenderer.send('workspace:reject', { id: String(id), reason: String(reason || '') }),
    onEvent: (callback) => ipcRenderer.on('workspace:event', (_event, value) => callback(value)),
});
