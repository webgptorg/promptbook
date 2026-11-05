'use strict';
const { app, clipboard, BrowserWindow, WebContentsView, Menu, Tray, dialog, ipcMain, nativeImage, nativeTheme, shell } = require('electron');
const { fork } = require('node:child_process');
const { readFileSync, renameSync, writeFileSync } = require('node:fs');
const { readFile, access, mkdtemp, writeFile, rm } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { join, resolve, basename, delimiter } = require('node:path');
const { pathToFileURL } = require('node:url');
const { ACTIONS, localDashboardUrl, terminalArguments, dashboardPage, terminalSize } = require('./model.cjs');
const { createPromptServer } = require('./prompt-server.cjs');

/** macOS packages carry their own CLI runtime and use native application menus. */
const isMac = process.platform === 'darwin';

/** Supported appearance preferences, including a live system default. */
const themeSources = new Set(['system', 'light', 'dark']);

/** The tray controller owns client windows and attachments, never the engines. */
const windows = new Map();
const pending = new Map();
const shellUrl = pathToFileURL(join(__dirname, 'renderer', 'index.html')).href;
let tray;
let bridge;
let runtime;
let requestId = 0;
let quitting = false;
let refreshingTray = false;
let quitInProgress = false;
let clipboardDirectory;

/** Stores the client preference in the app profile, outside all projects. */
function themeFile() {
    return join(app.getPath('userData'), 'appearance');
}

/** Old profiles and invalid settings fall back to the operating system. */
function loadTheme() {
    try {
        const source = readFileSync(themeFile(), 'utf8').trim();
        if (themeSources.has(source)) nativeTheme.themeSource = source;
    } catch {
        // A preference file is optional and must not block the desktop app.
    }
}

/** Adds the usual user tool locations to the environment inherited from Finder. */
function bundledRuntime() {
    const home = app.getPath('home');
    const runtimeRoot = join(process.resourcesPath, 'runtime');
    const nodeBin = join(runtimeRoot, 'bin');
    const prefix = process.env.NPM_CONFIG_PREFIX || process.env.npm_config_prefix || join(home, '.local');
    const paths = [nodeBin, ...(process.env.PATH || '').split(delimiter).filter(Boolean),
        join(prefix, 'bin'), join(home, '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
    return { installation: join(runtimeRoot, 'ptbk'), nodePath: join(nodeBin, 'node'),
        env: { PATH: [...new Set(paths)].join(delimiter), npm_config_prefix: prefix } };
}

/** Resolves the release's standalone Node/CLI; Electron never acts as the engine runtime. */
async function resolveRuntime() {
    const override = process.env.PTBK_DESKTOP_RUNTIME;
    let config;
    if (isMac && app.isPackaged && !override) {
        config = bundledRuntime();
    } else if (isMac && !override) {
        config = { installation: resolve(__dirname, '../..'), nodePath: process.env.PTBK_DESKTOP_NODE || 'node' };
    } else {
        const file = override || join(process.env.LOCALAPPDATA || app.getPath('userData'), 'Promptbook', 'desktop', 'runtime.json');
        try { config = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, '')); }
        catch (error) {
            if (error.code !== 'ENOENT' || app.isPackaged || override) throw new Error(`The CLI runtime is unavailable. Repair the Promptbook installation. ${error.message}`);
            config = { installation: resolve(__dirname, '../..'), nodePath: process.env.PTBK_DESKTOP_NODE || 'node' };
        }
    }
    if (typeof config.installation !== 'string' || typeof config.nodePath !== 'string') throw new Error('Invalid desktop runtime configuration. Repair the installation.');
    const manifest = JSON.parse(await readFile(join(config.installation, 'package.json'), 'utf8'));
    if (manifest.name !== 'ptbk') throw new Error('The desktop runtime does not identify an installed ptbk package.');
    if (isMac && app.isPackaged && !override && manifest.version !== app.getVersion()) throw new Error('The bundled CLI version does not match the desktop application.');
    await access(join(config.installation, 'bin', 'ptbk.js'));
    return { ...config, version: manifest.version, bin: join(config.installation, 'bin', 'ptbk.js') };
}

/** Starts a read/control adapter using the actual system Node, with a private parent/child IPC channel. */
async function startBridge() {
    runtime = await resolveRuntime();
    bridge = fork(app.isPackaged ? join(process.resourcesPath, 'bridge.mjs') : join(__dirname, 'bridge.mjs'), [runtime.installation], {
        execPath: runtime.nodePath, execArgv: [], env: isMac ? { ...process.env, ...runtime.env } : process.env,
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true,
    });
    let diagnostic = '';
    bridge.stderr.on('data', (chunk) => { diagnostic = (diagnostic + chunk).slice(-4000); });
    bridge.on('message', (message) => {
        const entry = pending.get(message.id);
        if (!entry) return;
        pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.error) entry.reject(new Error(message.error));
        else entry.resolve(message.result);
    });
    bridge.once('exit', () => {
        for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('The CLI controller disconnected. Reopen Promptbook to reconnect.')); }
        pending.clear();
    });
    await new Promise((done, fail) => {
        const timer = setTimeout(() => fail(new Error(`The installed CLI controller did not become ready. ${diagnostic}`)), 20000);
        bridge.once('error', (error) => { clearTimeout(timer); fail(error); });
        bridge.once('exit', () => { clearTimeout(timer); fail(new Error(`The installed CLI controller exited. ${diagnostic}`)); });
        bridge.on('message', (message) => { if (message.ready) { clearTimeout(timer); done(); } });
    });
}

/** Requests shared observation/control without ever sending credentials to a renderer. */
async function controller(method, params = {}) {
    await ready;
    if (!bridge?.connected) throw new Error('The CLI controller is disconnected. Reopen Promptbook.');
    return await new Promise((done, fail) => {
        const id = ++requestId;
        const timer = setTimeout(() => { pending.delete(id); fail(new Error('The CLI operation timed out. Refresh before retrying a change.')); }, method === 'action' ? 200000 : 30000);
        pending.set(id, { resolve: done, reject: fail, timer });
        bridge.send({ id, method, params }, (error) => { if (error) { clearTimeout(timer); pending.delete(id); fail(error); } });
    });
}

/** Only the packaged shell's main frame may invoke desktop capabilities. */
function owner(event) {
    const entry = [...windows.values()].find((item) => item.window.webContents === event.sender);
    if (!entry || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url.split('#')[0] !== shellUrl) throw new Error('Untrusted desktop IPC sender.');
    return entry;
}

/** Sends state only to the window owning the corresponding operation. */
function emit(entry, value) {
    if (!entry.window.isDestroyed()) entry.window.webContents.send('desktop:event', value);
}

/** External links are always explicitly confirmed and opened without any desktop privileges. */
async function externalLink(url, window) {
    let parsed;
    try { parsed = new URL(url); } catch { return; }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return;
    const result = await dialog.showMessageBox(window, { type: 'question', message: 'Open this link in your browser?', detail: parsed.href, buttons: ['Open browser', 'Cancel'], defaultId: 1, cancelId: 1 });
    if (result.response === 0) await shell.openExternal(parsed.href);
}

/** Prevents arbitrary navigation, browser permissions and popups in both shell and unprivileged project views. */
function protect(contents, window, allowed) {
    contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    contents.session.setPermissionCheckHandler(() => false);
    contents.setWindowOpenHandler(({ url }) => { void externalLink(url, window); return { action: 'deny' }; });
    contents.on('will-navigate', (event, url) => { if (!allowed(url)) { event.preventDefault(); void externalLink(url, window); } });
    contents.on('will-redirect', (event, url) => { if (!allowed(url)) event.preventDefault(); });
    contents.on('will-attach-webview', (event) => event.preventDefault());
}

/** Destroys only a graphical project attachment, leaving its HTTP server and engine alone. */
function hideDashboard(entry) {
    if (!entry.view) return;
    entry.window.contentView.removeChildView(entry.view);
    entry.view.webContents.close();
    entry.view = undefined;
}

/** Clamps a native embedded view to the owning window. */
function setBounds(entry, bounds) {
    if (!entry.view || !bounds) return;
    const [width, height] = entry.window.getContentSize();
    const x = Math.max(0, Math.min(width, Math.round(Number(bounds.x) || 0)));
    const y = Math.max(0, Math.min(height, Math.round(Number(bounds.y) || 0)));
    entry.view.setBounds({ x, y, width: Math.max(0, Math.min(width - x, Math.round(Number(bounds.width) || 0))), height: Math.max(0, Math.min(height - y, Math.round(Number(bounds.height) || 0))) });
}

/** Ends a client-owned PTY and pending prompts; it never sends an engine stop. */
function closeTerminal(entry, id) {
    const terminal = entry.terminals.get(id);
    if (!terminal) return;
    terminal.prompts?.close();
    try { terminal.pty.kill(); } catch {}
    entry.terminals.delete(id);
}

/** Opens an independent local view; the process/tray survives the last closed window. */
function createWindow(options = {}) {
    const window = new BrowserWindow({ width: 1280, height: 850, minWidth: 800, minHeight: 600, title: 'Promptbook', ...(!isMac && { icon: iconPath() }), show: false,
        webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false } });
    const entry = { window, terminals: new Map(), view: undefined, root: options.root, page: undefined };
    windows.set(window.id, entry);
    protect(window.webContents, window, (url) => url.split('#')[0] === shellUrl);
    window.once('ready-to-show', () => window.show());
    window.webContents.once('did-finish-load', () => emit(entry, { type: 'launch', ...options }));
    window.on('close', () => { hideDashboard(entry); for (const id of entry.terminals.keys()) closeTerminal(entry, id); });
    window.on('closed', () => windows.delete(window.id));
    void window.loadURL(shellUrl);
    return entry;
}

/** Location of the same product icon used by the installer. */
function iconPath() { return app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(__dirname, 'icon.ico'); }

/** macOS expects a small PNG for its menu bar; the app bundle supplies the Dock icon. */
function trayIcon() {
    if (!isMac) return iconPath();
    const logo = app.isPackaged ? join(process.resourcesPath, 'tray.png') : join(__dirname, '../../design/logo-blue-transparent-256.png');
    return nativeImage.createFromPath(logo).resize({ width: 18, height: 18 });
}

/** Graceful or explicitly forced host-wide quit, using current registry/controller state on every pass. */
async function quitAll() {
    if (quitInProgress) return;
    quitInProgress = true;
    try {
        let host = await controller('observe');
        if (host.problem) throw new Error(`Discovery cannot verify all engines: ${host.problem}`);
        const active = host.rows.filter((row) => row.status === 'live' || row.status === 'unreachable');
        let force = false;
        if (active.length) {
            const choice = await dialog.showMessageBox({ type: 'warning', message: `Quit Promptbook and stop ${active.length} project engine(s)?`, detail: `${active.map((row) => `${row.projectName}: ${row.state || row.status}`).join('\n')}\n\nClosing a window leaves engines running. Graceful stop waits for checkpointing; force stop interrupts owned work.`, buttons: ['Stop gracefully and quit', 'Cancel', 'Force stop and quit…'], defaultId: 1, cancelId: 1 });
            if (choice.response === 1) return;
            if (choice.response === 2) {
                const confirm = await dialog.showMessageBox({ type: 'warning', message: 'Force stop every listed engine now?', detail: 'Active work may remain unfinished. This uses the ordinary whole-engine force stop.', buttons: ['Cancel', 'Force stop and quit'], defaultId: 0, cancelId: 0 });
                if (confirm.response !== 1) return;
                force = true;
            }
            const outcomes = await Promise.all(active.map((row) => controller('action', { root: row.projectRoot, action: force ? 'force-stop' : 'stop' })));
            const failed = outcomes.filter((item) => !['completed', 'accepted', 'unchanged', 'not-applicable'].includes(item.status));
            if (failed.length) throw new Error(failed.map((item) => `${item.projectName}: ${item.message}`).join('\n'));
            const deadline = Date.now() + 120000;
            for (;;) {
                host = await controller('observe');
                if (host.problem) throw new Error(host.problem);
                const live = host.rows.filter((row) => row.status === 'live' || row.status === 'unreachable');
                if (!live.length) break;
                if (live.some((row) => !active.some((before) => before.projectRoot === row.projectRoot && before.engine?.instanceId === row.engine?.instanceId))) throw new Error('Another engine started while quitting. Review the current projects and choose Quit again.');
                if (Date.now() > deadline) throw new Error('Engines are still settling or cannot be verified. The tray remains available; use the project controls to inspect them. No force stop was attempted.');
                tray.setToolTip('Promptbook — waiting for engines to stop');
                await new Promise((done) => setTimeout(done, 1000));
            }
        }
        const final = await controller('observe');
        if (final.problem || final.rows.some((row) => ['live', 'unreachable'].includes(row.status))) throw new Error('An engine is now live or unverified. Review the tray before quitting again.');
        quitting = true;
        app.quit();
    } catch (error) { await dialog.showMessageBox({ type: 'error', message: 'Promptbook remains open', detail: error.message }); }
    finally { quitInProgress = false; void refreshTray(); }
}

/** Refreshes tray labels from the same global observation as the terminal dashboard. */
async function refreshTray() {
    if (!tray || refreshingTray || quitting) return;
    refreshingTray = true;
    let host;
    let problem;
    try { host = await controller('observe'); } catch (error) { problem = error.message; }
    const items = [
        { label: 'Open Promptbook', click: () => createWindow() },
        { label: 'New window', click: () => createWindow() },
        { label: 'New project…', click: () => createWindow({ init: true }) },
        { type: 'separator' },
        ...(host?.rows || []).map((row) => ({ label: `${row.projectName} — ${row.state || row.status}`, click: () => createWindow({ root: row.projectRoot }) })),
        ...(problem || host?.problem ? [{ label: 'Discovery unavailable — open to inspect', click: () => createWindow() }] : []),
        { type: 'separator' },
        { label: 'About Promptbook', click: () => app.showAboutPanel() },
        { label: quitInProgress ? 'Stopping engines…' : 'Quit Promptbook and engines…', enabled: !quitInProgress, click: () => void quitAll() },
    ];
    tray.setContextMenu(Menu.buildFromTemplate(items));
    tray.setToolTip(`Promptbook — ${host?.rows.filter((row) => row.status === 'live').length || 0} engine(s)`);
    refreshingTray = false;
}

ipcMain.handle('desktop:observe', async (event) => { owner(event); return { ...await controller('observe'), home: app.getPath('home'), version: app.getVersion() }; });
ipcMain.handle('desktop:theme', (event, source) => {
    owner(event);
    if (source === undefined) return nativeTheme.themeSource;
    if (!themeSources.has(source)) throw new Error('Invalid appearance setting.');
    if (source !== nativeTheme.themeSource) {
        // Serialize the small atomic write across all client windows before changing the live theme.
        const file = themeFile();
        const temporary = `${file}.tmp`;
        writeFileSync(temporary, `${source}\n`, { mode: 0o600 });
        renameSync(temporary, file);
        nativeTheme.themeSource = source;
        for (const entry of windows.values()) emit(entry, { type: 'theme', source });
    }
    return source;
});
ipcMain.handle('desktop:action', async (event, { action, roots }) => {
    const entry = owner(event);
    if (!ACTIONS.has(action) || !Array.isArray(roots) || !roots.length || roots.length > 1000 || roots.some((root) => typeof root !== 'string')) throw new Error('Invalid project action.');
    if (action === 'force-stop' || action === 'remove') {
        const response = await dialog.showMessageBox(entry.window, { type: 'warning', message: action === 'remove' ? 'Forget the selected stopped projects?' : 'Force stop the selected engines?', detail: action === 'remove' ? 'Project files stay. Only verified stopped entries can be forgotten.' : 'Active work may remain unfinished; this interrupts all work owned by these engines.', buttons: ['Cancel', action === 'remove' ? 'Forget' : 'Force stop'], defaultId: 0, cancelId: 0 });
        if (response.response !== 1) return [];
    }
    const results = [];
    for (const root of [...new Set(roots)]) results.push(await controller('action', { action, root }));
    void refreshTray();
    return results;
});
ipcMain.handle('desktop:dashboard', async (event, { root, bounds }) => {
    const entry = owner(event);
    const result = await controller('dashboard', { root });
    const url = localDashboardUrl(result.url);
    hideDashboard(entry);
    const view = new WebContentsView({ webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, partition: `desktop-project-${entry.window.id}` } });
    entry.view = view;
    entry.root = root;
    entry.page = undefined;
    entry.window.contentView.addChildView(view);
    setBounds(entry, bounds);
    protect(view.webContents, entry.window, (target) => { try { return new URL(target).origin === new URL(url).origin; } catch { return false; } });
    view.webContents.on('did-navigate-in-page', (_event, target) => {
        entry.page = dashboardPage(target);
        emit(entry, { type: 'page', page: entry.page });
    });
    view.webContents.on('render-process-gone', () => emit(entry, { type: 'error', message: 'The graphical view closed. Reopen the project or use its CLI dashboard.' }));
    view.webContents.on('did-fail-load', (_event, _code, description) => { hideDashboard(entry); emit(entry, { type: 'error', message: `The graphical dashboard could not load: ${description}. Open its CLI dashboard.` }); });
    await view.webContents.loadURL(url);
    return { root, instanceId: result.instanceId };
});
ipcMain.on('desktop:bounds', (event, bounds) => { try { setBounds(owner(event), bounds); } catch {} });
ipcMain.on('desktop:hide-dashboard', (event) => { try { hideDashboard(owner(event)); } catch {} });
ipcMain.handle('desktop:new-window', (event, root) => { owner(event); createWindow({ root: typeof root === 'string' ? root : undefined }); });
ipcMain.handle('desktop:directory', async (event) => { const entry = owner(event); const result = await dialog.showOpenDialog(entry.window, { properties: ['openDirectory', 'createDirectory'] }); return result.canceled ? undefined : result.filePaths[0]; });
ipcMain.handle('desktop:attachments', async (event) => {
    const entry = owner(event);
    const result = await dialog.showOpenDialog(entry.window, { properties: ['openFile', 'multiSelections'] });
    return result.canceled ? [] : result.filePaths.map((path) => ({ type: 'attachment', kind: /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path) ? 'image' : 'file', path, name: basename(path) }));
});
ipcMain.handle('desktop:clipboard-image', async (event) => {
    owner(event);
    const image = clipboard.readImage();
    if (image.isEmpty()) return [];
    const bytes = image.toPNG();
    if (bytes.length > 32 * 1024 * 1024) throw new Error('The clipboard image is too large. Save it as a file and attach it.');
    clipboardDirectory ||= mkdtemp(join(app.getPath('temp'), 'ptbk-desktop-paste-'));
    const path = join(await clipboardDirectory, `${randomUUID()}.png`);
    await writeFile(path, bytes, { mode: 0o600 });
    return [{ type: 'attachment', kind: 'image', path, name: 'clipboard-image.png' }];
});
ipcMain.handle('desktop:terminal', async (event, options) => {
    const entry = owner(event);
    await ready;
    if (entry.terminals.size >= 8) throw new Error('Close an existing terminal before opening another.');
    const args = terminalArguments(options.kind, options.root, options.page || (options.kind === 'dashboard' ? entry.page : undefined));
    if (options.kind === 'dashboard') {
        const host = await controller('observe');
        if (!host.rows.some((row) => row.projectRoot === options.root && row.status === 'live')) throw new Error('The selected project has no verified running engine.');
    }
    hideDashboard(entry);
    const id = `${entry.window.id}-${++requestId}`;
    const prompts = options.kind === 'init' ? await createPromptServer((prompt) => emit(entry, prompt.kind === 'complete' ? { type: 'initialized', terminal: id, completion: prompt.completion } : { type: 'prompt', terminal: id, prompt }), (promptId) => emit(entry, { type: 'prompt-closed', terminal: id, promptId })) : undefined;
    const pty = require('node-pty');
    const env = { ...process.env, ...runtime.env, ...prompts?.env, TERM: 'xterm-256color', TERM_PROGRAM: 'Promptbook', PTBK_REDUCED_MOTION: '1' };
    delete env.ELECTRON_RUN_AS_NODE;
    let child;
    try { child = pty.spawn(runtime.nodePath, [runtime.bin, ...args], { name: 'xterm-256color', ...terminalSize(options.cols, options.rows), cwd: app.getPath('home'), env }); }
    catch (error) { prompts?.close(); throw error; }
    const terminal = { pty: child, prompts, buffer: '', outstanding: 0, flush: undefined };
    entry.terminals.set(id, terminal);
    child.onData((data) => {
        terminal.buffer += data;
        // Suspend a flooded client rather than silently dropping terminal control/output sequences.
        if (terminal.buffer.length > 256 * 1024) child.pause();
        if (!terminal.flush) terminal.flush = setTimeout(() => {
            terminal.flush = undefined;
            terminal.outstanding += terminal.buffer.length;
            emit(entry, { type: 'data', terminal: id, data: terminal.buffer });
            terminal.buffer = '';
            if (terminal.outstanding < 1024 * 1024) child.resume();
            else child.pause();
        }, 16);
    });
    child.onExit(({ exitCode }) => {
        clearTimeout(terminal.flush);
        if (terminal.buffer) emit(entry, { type: 'data', terminal: id, data: terminal.buffer });
        prompts?.close();
        entry.terminals.delete(id);
        emit(entry, { type: 'exit', terminal: id, exitCode });
        void refreshTray();
    });
    return { id };
});
ipcMain.on('desktop:input', (event, { id, data }) => { try { const terminal = owner(event).terminals.get(id); if (terminal && typeof data === 'string' && data.length <= 1024 * 1024) terminal.pty.write(data); } catch {} });
ipcMain.on('desktop:acknowledge', (event, { id, length }) => { try { const terminal = owner(event).terminals.get(id); if (terminal && Number.isInteger(length) && length > 0 && length <= terminal.outstanding) { terminal.outstanding -= length; if (terminal.outstanding < 256 * 1024) terminal.pty.resume(); } } catch {} });
ipcMain.on('desktop:resize', (event, { id, cols, rows }) => { try { const terminal = owner(event).terminals.get(id); if (terminal) { const size = terminalSize(cols, rows); terminal.pty.resize(size.cols, size.rows); } } catch {} });
ipcMain.handle('desktop:close-terminal', (event, id) => closeTerminal(owner(event), id));
ipcMain.handle('desktop:answer', (event, { id, promptId, answer }) => { const terminal = owner(event).terminals.get(id); if (!terminal?.prompts) throw new Error('The initializer is no longer attached.'); terminal.prompts.answer(promptId, answer); });

/** Reopening creates a new independent window; --tray starts only the controller at sign-in. */
function launchOptions(argv) {
    const at = argv.indexOf('--init');
    const project = argv.indexOf('--project');
    return { init: at >= 0, root: project >= 0 ? argv[project + 1] : at >= 0 && argv[at + 1] && !argv[at + 1].startsWith('--') ? argv[at + 1] : undefined, skipInit: argv.includes('--skip-init') };
}

app.setName('Promptbook');
if (!app.requestSingleInstanceLock()) app.exit(0);
if (process.argv.includes('--quit-client')) app.exit(0);
app.on('second-instance', (_event, argv) => { if (argv.includes('--quit-client')) { quitting = true; app.quit(); } else if (!argv.includes('--tray')) createWindow(launchOptions(argv)); });
app.on('window-all-closed', () => {});
app.on('before-quit', () => { quitting = true; for (const entry of windows.values()) for (const id of entry.terminals.keys()) closeTerminal(entry, id); if (bridge?.connected) bridge.disconnect(); if (clipboardDirectory) void clipboardDirectory.then((directory) => rm(directory, { recursive: true, force: true })).catch(() => {}); });

/** Startup initializes only the client adapter and tray; it never calls project Start/Resume. */
const ready = app.whenReady().then(async () => {
    await startBridge();
});
void app.whenReady().then(async () => {
    loadTheme();
    app.setAboutPanelOptions({ applicationName: 'Promptbook', applicationVersion: app.getVersion(), website: 'https://ptbk.io/', copyright: 'Promptbook — your AI, on your machine' });
    tray = new Tray(trayIcon());
    tray.on('double-click', () => createWindow());
    const menu = Menu.buildFromTemplate([
        ...(isMac ? [{ label: 'Promptbook', submenu: [
            { label: 'About Promptbook', click: () => app.showAboutPanel() },
            { label: 'Open at Login', type: 'checkbox', enabled: app.isPackaged, checked: app.isPackaged && app.getLoginItemSettings().openAtLogin,
                click: (item) => {
                    app.setLoginItemSettings({ openAtLogin: item.checked });
                    item.checked = app.getLoginItemSettings().openAtLogin;
                } },
            { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
            { type: 'separator' }, { role: 'quit' },
        ] }] : []),
        { label: 'File', submenu: [{ label: 'New window', accelerator: 'CmdOrCtrl+Shift+N', click: () => createWindow() }, { label: 'New project…', click: () => createWindow({ init: true }) }, { type: 'separator' }, { role: 'close' }, { label: 'Quit Promptbook and engines…', click: () => void quitAll() }] },
        { role: 'editMenu' }, { role: 'viewMenu' },
        ...(isMac ? [{ role: 'windowMenu' }] : [{ label: 'Help', submenu: [{ label: 'About Promptbook', click: () => app.showAboutPanel() }] }]),
    ]);
    Menu.setApplicationMenu(menu);
    await refreshTray();
    setInterval(() => void refreshTray(), 3000).unref();
    if (process.argv.includes('--quit-client')) { app.quit(); return; }
    if (!process.argv.includes('--tray') && !(isMac && app.isPackaged && app.getLoginItemSettings().wasOpenedAtLogin) && !windows.size) {
        createWindow(launchOptions(process.argv));
    }
    app.on('activate', () => { if (!windows.size) createWindow(); });
}).catch((error) => dialog.showErrorBox('Promptbook could not open', error.message));
void ready.catch(() => {});
