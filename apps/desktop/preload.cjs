'use strict';
const { contextBridge, ipcRenderer } = require('electron');

/** Only fixed operations are exposed; raw IPC and Node never reach the renderer or project dashboard. */
contextBridge.exposeInMainWorld('desktop', {
    observe: () => ipcRenderer.invoke('desktop:observe'),
    theme: (source) => ipcRenderer.invoke('desktop:theme', source),
    action: (action, roots) => ipcRenderer.invoke('desktop:action', { action, roots }),
    dashboard: (root, bounds) => ipcRenderer.invoke('desktop:dashboard', { root, bounds }),
    bounds: (bounds) => ipcRenderer.send('desktop:bounds', bounds),
    hideDashboard: () => ipcRenderer.send('desktop:hide-dashboard'),
    newWindow: (root) => ipcRenderer.invoke('desktop:new-window', root),
    chooseDirectory: () => ipcRenderer.invoke('desktop:directory'),
    clipboardImage: () => ipcRenderer.invoke('desktop:clipboard-image'),
    chooseAttachments: () => ipcRenderer.invoke('desktop:attachments'),
    terminal: (kind, root, page, size) => ipcRenderer.invoke('desktop:terminal', { kind, root, page, ...size }),
    input: (id, data) => ipcRenderer.send('desktop:input', { id, data }),
    acknowledge: (id, length) => ipcRenderer.send('desktop:acknowledge', { id, length }),
    resize: (id, size) => ipcRenderer.send('desktop:resize', { id, ...size }),
    closeTerminal: (id) => ipcRenderer.invoke('desktop:close-terminal', id),
    answer: (id, promptId, answer) => ipcRenderer.invoke('desktop:answer', { id, promptId, answer }),
    featureContext: (root) => ipcRenderer.invoke('desktop:feature-context', root),
    openFeature: (request) => ipcRenderer.invoke('desktop:feature-open', request),
    closeFeature: (id, reason) => ipcRenderer.invoke('desktop:feature-close', id, reason),
    featureBounds: (feature, bounds) => ipcRenderer.send('desktop:feature-bounds', { feature, bounds }),
    tabTabs: (root, browser) => ipcRenderer.invoke('desktop:tab-tabs', { root, browser }),
    tabAction: (request) => ipcRenderer.invoke('desktop:tab-action', request),
    voiceControl: (root, chat, action) => ipcRenderer.invoke('desktop:voice-control', { root, chat, action }),
    onEvent: (callback) => {
        const listener = (_event, value) => callback(value);
        ipcRenderer.on('desktop:event', listener);
        return () => ipcRenderer.removeListener('desktop:event', listener);
    },
});
