import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const IS_DEV = process.env['NODE_ENV'] === 'development';

let mainWindow: BrowserWindow | null = null;

/**
 * File path that was opened via macOS open-file event or command line argument.
 * Buffered until the window finishes loading.
 */
let pendingFilePath: string | null = null;

/**
 * Creates and configures the main application window.
 */
function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 600,
        minHeight: 400,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (IS_DEV) {
        mainWindow.loadURL('http://localhost:5174');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.webContents.on('did-finish-load', () => {
        if (pendingFilePath) {
            mainWindow?.webContents.send('file:opened', pendingFilePath);
            pendingFilePath = null;
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    setupMenu();
}

/**
 * Builds and sets the native macOS application menu with File/Edit/View operations.
 */
function setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        },
        {
            label: 'File',
            submenu: [
                {
                    label: 'New',
                    accelerator: 'CmdOrCtrl+N',
                    click() {
                        mainWindow?.webContents.send('menu:new');
                    },
                },
                {
                    label: 'Open…',
                    accelerator: 'CmdOrCtrl+O',
                    click() {
                        handleOpenDialog();
                    },
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click() {
                        mainWindow?.webContents.send('menu:save');
                    },
                },
                {
                    label: 'Save As…',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click() {
                        mainWindow?.webContents.send('menu:save-as');
                    },
                },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                ...(IS_DEV ? [{ role: 'toggleDevTools' as const }] : []),
                { type: 'separator' as const },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' as const },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * Shows the native open-file dialog and sends the chosen path to the renderer.
 */
async function handleOpenDialog(): Promise<void> {
    if (!mainWindow) return;

    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Book File',
        filters: [
            { name: 'Book Files', extensions: ['book', 'md'] },
            { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
        mainWindow.webContents.send('file:opened', result.filePaths[0]);
    }
}

// ---- IPC handlers ----

ipcMain.handle('file:read', async (_event, filePath: string) => {
    return await fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    await fs.writeFile(filePath, content, 'utf-8');
});

ipcMain.handle('file:save-as', async (_event, content: string) => {
    if (!mainWindow) return null;

    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Book File',
        defaultPath: 'agent.book',
        filters: [
            { name: 'Book Files', extensions: ['book'] },
            { name: 'Markdown Book Files', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });

    if (!result.canceled && result.filePath) {
        await fs.writeFile(result.filePath, content, 'utf-8');
        return result.filePath;
    }

    return null;
});

ipcMain.handle('file:open-dialog', async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Book File',
        filters: [
            { name: 'Book Files', extensions: ['book', 'md'] },
            { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }

    return null;
});

ipcMain.handle('window:set-title', (_event, title: string) => {
    mainWindow?.setTitle(title);
});

// ---- App lifecycle ----

// Handle file opened via macOS "Open With" or drag onto dock icon
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (mainWindow?.webContents.isLoading() === false) {
        mainWindow.webContents.send('file:opened', filePath);
    } else {
        pendingFilePath = filePath;
    }
});

app.whenReady().then(() => {
    // Handle file path passed via command line (e.g. `open file.book`)
    const args = process.argv.slice(IS_DEV ? 3 : 1);
    const fileArg = args.find(
        (arg) => !arg.startsWith('-') && (arg.endsWith('.book') || arg.endsWith('.book.md')),
    );
    if (fileArg) {
        pendingFilePath = path.resolve(fileArg);
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On macOS, apps conventionally stay open even without windows
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
