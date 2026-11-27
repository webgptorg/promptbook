'use strict';
const { contextBridge, ipcRenderer } = require('electron');

/** Only fixed operations are exposed; raw IPC and Node never reach the renderer or project dashboard. */
contextBridge.exposeInMainWorld('desktop', {
    observe: () => ipcRenderer.invoke('desktop:observe'),
    update: (action) => ipcRenderer.invoke('desktop:update', action),
    updateBarHeight: (height) => ipcRenderer.send('desktop:update-bar-height', height),
    start: (root) => ipcRenderer.invoke('desktop:start', root),
    dashboard: (root) => ipcRenderer.invoke('desktop:dashboard', root),
    chooseDirectory: () => ipcRenderer.invoke('desktop:directory'),
    clipboardImage: () => ipcRenderer.invoke('desktop:clipboard-image'),
    chooseAttachments: () => ipcRenderer.invoke('desktop:attachments'),
    terminal: (kind, root, page, size) => ipcRenderer.invoke('desktop:terminal', { kind, root, page, ...size }),
    input: (id, data) => ipcRenderer.send('desktop:input', { id, data }),
    acknowledge: (id, length) => ipcRenderer.send('desktop:acknowledge', { id, length }),
    resize: (id, size) => ipcRenderer.send('desktop:resize', { id, ...size }),
    closeTerminal: (id) => ipcRenderer.invoke('desktop:close-terminal', id),
    answer: (id, promptId, answer) => ipcRenderer.invoke('desktop:answer', { id, promptId, answer }),
    onEvent: (callback) => {
        const listener = (_event, value) => callback(value);
        ipcRenderer.on('desktop:event', listener);
        return () => ipcRenderer.removeListener('desktop:event', listener);
    },
});
