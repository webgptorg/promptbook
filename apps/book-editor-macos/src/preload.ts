import { contextBridge, ipcRenderer } from 'electron';
import type { FileApi } from './fileApi.types';

contextBridge.exposeInMainWorld('fileApi', {
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    saveFileAs: (content: string) => ipcRenderer.invoke('file:save-as', content),
    openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
    setWindowTitle: (title: string) => ipcRenderer.invoke('window:set-title', title),

    onFileOpened(callback: (filePath: string) => void) {
        ipcRenderer.on('file:opened', (_event, filePath: string) => callback(filePath));
    },
    onMenuNew(callback: () => void) {
        ipcRenderer.on('menu:new', () => callback());
    },
    onMenuSave(callback: () => void) {
        ipcRenderer.on('menu:save', () => callback());
    },
    onMenuSaveAs(callback: () => void) {
        ipcRenderer.on('menu:save-as', () => callback());
    },
} satisfies FileApi);
