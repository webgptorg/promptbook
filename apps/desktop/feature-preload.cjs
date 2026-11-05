'use strict';
const { contextBridge, ipcRenderer } = require('electron');

/**
 * The only capability of an embedded feature view (a tab viewer or a voice media page): exchanging its own messages
 * with its feature over private IPC. No desktop, project or Node capability reaches it, and the streamed website is
 * only an image inside it.
 */
contextBridge.exposeInMainWorld('featureBridge', {
    hello: () => ipcRenderer.send('feature:out', { kind: 'hello' }),
    send: (text) => ipcRenderer.send('feature:out', { kind: 'message', data: String(text) }),
    sendBinary: (data) => ipcRenderer.send('feature:out', { kind: 'binary', data: new Uint8Array(data) }),
    onMessage: (callback) => ipcRenderer.on('feature:in', (_event, value) => { if (value && value.kind === 'message') callback(String(value.data)); }),
    onBinary: (callback) => ipcRenderer.on('feature:in', (_event, value) => {
        if (value && value.kind === 'binary' && value.data instanceof Uint8Array) callback(value.data.buffer.slice(value.data.byteOffset, value.data.byteOffset + value.data.byteLength));
    }),
});
