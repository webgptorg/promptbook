'use strict';
const { contextBridge, ipcRenderer } = require('electron');

/** Only fixed operations are exposed; raw IPC and Node never reach the renderer or project dashboard. */
contextBridge.exposeInMainWorld('desktop', {
    observe: () => ipcRenderer.invoke('desktop:observe'),
    action: (action, roots) => ipcRenderer.invoke('desktop:action', { action, roots }),
    dashboard: (root, bounds) => ipcRenderer.invoke('desktop:dashboard', { root, bounds }),
    bounds: (bounds) => ipcRenderer.send('desktop:bounds', bounds),
    hideDashboard: () => ipcRenderer.send('desktop:hide-dashboard'),
    newWindow: (root) => ipcRenderer.invoke('desktop:new-window', root),
    chooseDirectory: () => ipcRenderer.invoke('desktop:directory'),
    chooseAttachments: () => ipcRenderer.invoke('desktop:attachments'),
    terminal: (kind, root, page, size) => ipcRenderer.invoke('desktop:terminal', { kind, root, page, ...size }),
    input: (id, data) => ipcRenderer.send('desktop:input', { id, data }),
    resize: (id, size) => ipcRenderer.send('desktop:resize', { id, ...size }),
    closeTerminal: (id) => ipcRenderer.invoke('desktop:close-terminal', id),
    answer: (id, promptId, answer) => ipcRenderer.invoke('desktop:answer', { id, promptId, answer }),
    onEvent: (callback) => {
        const listener = (_event, value) => callback(value);
        ipcRenderer.on('desktop:event', listener);
        return () => ipcRenderer.removeListener('desktop:event', listener);
    },
});
