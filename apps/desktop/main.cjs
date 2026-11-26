'use strict';
const { app, clipboard, BrowserWindow, WebContentsView, Menu, Tray, dialog, ipcMain, nativeImage, nativeTheme, session, shell } = require('electron');
const { fork } = require('node:child_process');
const { readFile, access, mkdtemp, writeFile, rm } = require('node:fs/promises');
const { createHash, randomUUID } = require('node:crypto');
const { join, resolve, basename, delimiter } = require('node:path');
const { pathToFileURL } = require('node:url');
const { terminalArguments, terminalSize } = require('./model.cjs');
const { createPromptServer } = require('./prompt-server.cjs');
const { DesktopUpdates } = require('./updates.cjs');
const { PROJECT_ORIGIN, PROJECTS_ORIGIN, loadAppBundle } = require('./app-protocol.cjs');
const { createWindowsIcons } = require('./windows-icons.cjs');

/** The isolated, persistent session for each local project. Two windows can attach to the same engine. */
const projects = new Map();
const windows = new Map();
const pending = new Map();
const isMac = process.platform === 'darwin';
const windowsIcons = createWindowsIcons(join(app.isPackaged ? process.resourcesPath : __dirname, 'icons'), nativeTheme);
const shellUrl = pathToFileURL(join(__dirname, 'renderer', 'index.html')).href;
const desktopUpdates = new DesktopUpdates({ current: app.getVersion(), platform: process.platform, arch: process.arch, packaged: app.isPackaged,
    changed: (update) => { for (const entry of windows.values()) emit(entry, { type: 'update', update }); } });
let tray, bridge, runtime, clipboardDirectory, bundle;
let requestId = 0;
let refreshingTray = false;
let checkingFromMenu = false;
let quitInProgress = false;
let quitting = false;

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

/** Ends a client-owned PTY and pending prompts; it never sends an engine stop. */
function closeTerminal(entry, id) {
    const terminal = entry.terminals.get(id);
    if (!terminal) return;
    terminal.prompts?.close();
    try { terminal.pty.kill(); } catch {}
    entry.terminals.delete(id);
}

/** A sandbox that can reach only its own project's bundled UI and private engine pipe. */
function projectSession(root) {
    let binding = projects.get(root);
    if (binding) return binding;
    const partition = 'persist:ptbk-ui-' + createHash('sha256').update(root).digest('hex');
    const isolated = session.fromPartition(partition, { cache: false });
    binding = { session: isolated, endpoint: undefined };
    isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    isolated.setPermissionCheckHandler(() => false);
    isolated.protocol.handle('https', async (request) => {
        try {
            bundle ||= loadAppBundle(join(__dirname, 'engine-ui'));
            return await (await bundle)(request, binding.endpoint);
        } catch {
            return new Response('The project connection is unavailable.', { status: 503 });
        }
    });
    isolated.webRequest.onBeforeRequest((details, callback) => {
        const url = new URL(details.url);
        callback({ cancel: url.origin !== PROJECT_ORIGIN && url.protocol !== 'data:' });
    });
    projects.set(root, binding);
    return binding;
}

/** Teardown only this client. In-flight connections are cancelled by closing its WebContents. */
function hideDashboard(entry) {
    entry.generation++;
    if (entry.view) {
        entry.window.contentView.removeChildView(entry.view);
        entry.view.webContents.close();
        entry.view = undefined;
    }
    entry.instance = undefined;
}

/** Fill the window down to the update button, or to the bottom when the footer is hidden. */
function resizeProject(entry) {
    if (!entry.view) return;
    const [width, height] = entry.window.getContentSize();
    entry.view.setBounds({ x: 0, y: 0, width, height: Math.max(0, height - entry.updateBarHeight) });
}

/** A local navigation back to the project list, including the upstream switcher's All projects/Add project links. */
function showLauncher(entry, action = 'projects') {
    hideDashboard(entry);
    emit(entry, { type: 'launcher', action, root: entry.root });
}

/** Verify the project on every attachment. A later selection always wins over an earlier, slower connection. */
async function openProject(entry, root) {
    hideDashboard(entry);
    const generation = entry.generation;
    const endpoint = await controller('app-connect', { root });
    if (entry.window.isDestroyed() || entry.generation !== generation) return;
    bundle ||= loadAppBundle(join(__dirname, 'engine-ui'));
    await bundle;
    if (entry.window.isDestroyed() || entry.generation !== generation) return;
    const binding = projectSession(root);
    binding.endpoint = endpoint;
    const view = new WebContentsView({ webPreferences: { session: binding.session, sandbox: true, contextIsolation: true, nodeIntegration: false, webviewTag: false } });
    entry.view = view;
    entry.root = root;
    entry.instance = endpoint.instanceId;
    const content = view.webContents;
    const navigate = (target, popup) => {
        const url = new URL(target);
        if (url.origin === PROJECTS_ORIGIN) {
            setImmediate(() => { if (entry.view === view) showLauncher(entry, url.pathname === '/engines/new' ? 'init' : 'projects'); });
        } else if (url.origin === PROJECT_ORIGIN && url.pathname === '/auth/sign-in') {
            setImmediate(() => { if (entry.view === view) showLauncher(entry); });
        } else if (url.origin === PROJECT_ORIGIN) {
            if (popup) void content.loadURL(url.href).catch(() => {});
            return true;
        } else {
            void externalLink(url.href, entry.window);
        }
        return false;
    };
    content.on('will-navigate', (event) => { if (!navigate(event.url, false)) event.preventDefault(); });
    content.on('will-redirect', (event) => { if (new URL(event.url).origin !== PROJECT_ORIGIN) event.preventDefault(); });
    content.setWindowOpenHandler(({ url }) => { setImmediate(() => { if (!content.isDestroyed()) navigate(url, true); }); return { action: 'deny' }; });
    content.on('will-attach-webview', (event) => event.preventDefault());
    entry.window.contentView.addChildView(view);
    resizeProject(entry);
    try {
        await content.loadURL(PROJECT_ORIGIN + '/');
        if (!content.isDestroyed()) content.focus();
    } catch (error) {
        if (entry.generation !== generation) return;
        hideDashboard(entry);
        throw error;
    }
}

/** The trusted local project chooser and optional CLI wizard stay outside the project page. */
function createWindow(launch = {}) {
    const window = new BrowserWindow({ width: 1280, height: 850, minWidth: 720, minHeight: 520, title: 'Promptbook', show: false,
        ...(!isMac && { icon: windowsIcons.current().window }), webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    const entry = { window, terminals: new Map(), generation: 0, root: launch.root, updateBarHeight: 0 };
    windows.set(window.id, entry);
    window.webContents.on('will-navigate', (event) => { if (event.url !== shellUrl) event.preventDefault(); });
    window.webContents.setWindowOpenHandler(({ url }) => { void externalLink(url, window); return { action: 'deny' }; });
    window.once('ready-to-show', () => window.show());
    window.on('resize', () => resizeProject(entry));
    window.webContents.once('did-finish-load', () => emit(entry, { type: 'launch', ...launch }));
    window.on('close', () => { hideDashboard(entry); for (const id of entry.terminals.keys()) closeTerminal(entry, id); });
    window.on('closed', () => windows.delete(window.id));
    void window.loadURL(shellUrl);
    return entry;
}

/** macOS tints the transparent template to match the menu bar, independently of the app's selected theme. */
function trayIcon() {
    if (!isMac) return windowsIcons.current().tray;
    const logo = app.isPackaged ? join(process.resourcesPath, 'tray.png') : join(__dirname, '../../design/logo-blue-transparent-256.png');
    const source = nativeImage.createFromPath(logo);
    const bitmap = source.toBitmap();
    // Template images use black pixels and the logo's original alpha mask (BGRA).
    for (let offset = 0; offset < bitmap.length; offset += 4) bitmap.fill(0, offset, offset + 3);
    const monochrome = nativeImage.createFromBitmap(bitmap, source.getSize());
    const icon = monochrome.resize({ width: 18, height: 18 });
    icon.addRepresentation({ scaleFactor: 2, dataURL: monochrome.resize({ width: 36, height: 36 }).toDataURL() });
    icon.setTemplateImage(true);
    return icon;
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
        app.quit();
    } catch (error) { await dialog.showMessageBox({ type: 'error', message: 'Promptbook remains open', detail: error.message }); }
    finally { quitInProgress = false; void refreshTray(); }
}

/** Shell-only theme changes can arrive between Electron theme notifications. */
function refreshWindowsIcons() {
    if (process.platform === 'win32' && tray && !quitting && !tray.isDestroyed()) {
        windowsIcons.refresh(tray, windows.values());
    }
}

/** Refreshes tray labels from the same global observation as the terminal dashboard. */
async function refreshTray() {
    refreshWindowsIcons();
    if (!tray || refreshingTray || quitting) return;
    refreshingTray = true;
    let host;
    let problem;
    try { host = await controller('observe'); } catch (error) { problem = error.message; }
    const items = [
        { label: 'Open Promptbook', click: () => { const window = [...windows.values()][0]?.window; if (window) window.show(); else createWindow(); } },
        { label: 'New window', click: () => createWindow() },
        { label: 'New project…', click: () => createWindow({ init: true }) },
        { type: 'separator' },
        ...(host?.rows || []).map((row) => ({ label: `${row.projectName} — ${row.state || row.status}`, click: () => createWindow({ root: row.projectRoot }) })),
        ...(problem || host?.problem ? [{ label: 'Discovery unavailable — open to inspect', click: () => createWindow() }] : []),
        { type: 'separator' },
        { label: 'About Promptbook', click: () => app.showAboutPanel() },
        { label: 'Check for updates…', click: checkForDesktopUpdates },
        { label: quitInProgress ? 'Stopping engines…' : 'Quit Promptbook and engines…', enabled: !quitInProgress, click: () => void quitAll() },
    ];
    for (const entry of windows.values()) {
        if (!entry.view || !host || host.problem) continue;
        const row = host.rows.find((item) => item.projectRoot === entry.root);
        if (row?.status !== 'live' || row.engine?.instanceId !== entry.instance) {
            if (row?.status === 'live') {
                void openProject(entry, entry.root).catch((error) => { showLauncher(entry); emit(entry, { type: 'error', message: error.message }); });
            } else showLauncher(entry);
        }
    }
    tray.setContextMenu(Menu.buildFromTemplate(items));
    tray.setToolTip(`Promptbook — ${host?.rows.filter((row) => row.status === 'live').length || 0} engine(s)`);
    refreshingTray = false;
}

ipcMain.handle('desktop:observe', async (event) => { owner(event); return { ...await controller('observe'), home: app.getPath('home'), version: app.getVersion() }; });
ipcMain.on('desktop:update-bar-height', (event, height) => {
    if (!Number.isFinite(height) || height < 0) return;
    let entry;
    try { entry = owner(event); } catch { return; }
    const heightInDip = Math.ceil(height * entry.window.webContents.getZoomFactor());
    if (entry.updateBarHeight === heightInDip) return;
    entry.updateBarHeight = heightInDip;
    resizeProject(entry);
});
ipcMain.handle('desktop:update', async (event, action) => {
    const { window } = owner(event);
    if (action === 'check') return desktopUpdates.check();
    if (action === 'download') {
        const release = desktopUpdates.state.available;
        if (release) {
            try { await shell.openExternal(release.url); }
            catch (error) { await dialog.showMessageBox(window, { type: 'error', message: 'Could not open the desktop installer.', detail: error.message }); }
        }
        return;
    }
    if (action !== undefined) throw new Error('Invalid update action.');
    return desktopUpdates.state;
});
ipcMain.handle('desktop:dashboard', async (event, root) => openProject(owner(event), root));
ipcMain.handle('desktop:start', async (event, root) => { owner(event); return controller('action', { root, action: 'start' }); });
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
    const args = terminalArguments(options.kind, options.root, options.page);
    if (options.kind === 'dashboard') {
        const host = await controller('observe');
        if (!host.rows.some((row) => row.projectRoot === options.root && row.status === 'live')) throw new Error('The selected project has no verified running engine.');
    }
    hideDashboard(entry);
    const id = `${entry.window.id}-${++requestId}`;
    const prompts = ['init', 'setup', 'global'].includes(options.kind) ? await createPromptServer((prompt) => emit(entry, prompt.kind === 'complete' ? { type: 'initialized', terminal: id, completion: prompt.completion } : { type: 'prompt', terminal: id, prompt }), (promptId) => emit(entry, { type: 'prompt-closed', terminal: id, promptId })) : undefined;
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
if (!app.requestSingleInstanceLock() || process.argv.includes('--quit-client')) app.exit(0);
app.on('second-instance', (_event, argv) => { if (argv.includes('--quit-client')) app.quit(); else if (!argv.includes('--tray')) createWindow(launchOptions(argv)); });
app.on('window-all-closed', () => {});
app.on('before-quit', () => {
    quitting = true;
    desktopUpdates.stop();
    if (bridge?.connected) bridge.disconnect();
    if (clipboardDirectory) void clipboardDirectory.then((directory) => rm(directory, { recursive: true, force: true })).catch(() => {});
});
const ready = app.whenReady().then(startBridge);
void ready.catch(() => {});

/** Native menus remain available while the entire window belongs to the manGoweb app. */
function launcher(action) {
    const entry = [...windows.values()].find((item) => item.window.isFocused()) || [...windows.values()][0];
    if (entry) { entry.window.show(); showLauncher(entry, action); }
    else createWindow({ action });
}

/** Manual checks keep the current project open. Surface lookup failures only to the person who requested the check. */
async function checkForDesktopUpdates() {
    if (checkingFromMenu) return;
    checkingFromMenu = true;
    try {
        const update = await desktopUpdates.check();
        if (update.status === 'unknown') {
            await dialog.showMessageBox({ type: 'warning', message: 'Could not check for desktop updates.', detail: update.problem });
        } else if (update.available) {
            const entry = windows.get(BrowserWindow.getFocusedWindow()?.id) || windows.values().next().value;
            if (entry) {
                entry.window.show();
                entry.window.webContents.focus();
                emit(entry, { type: 'focus-update' });
            } else {
                createWindow({ action: 'projects' });
            }
        }
    } finally {
        checkingFromMenu = false;
    }
}

void app.whenReady().then(async () => {
    desktopUpdates.start();
    app.setAboutPanelOptions({ applicationName: 'Promptbook', applicationVersion: app.getVersion(), website: 'https://ptbk.io/' });
    tray = new Tray(trayIcon());
    if (process.platform === 'win32') nativeTheme.on('updated', refreshWindowsIcons);
    tray.on('double-click', () => createWindow());
    const menu = Menu.buildFromTemplate([
        ...(isMac ? [{ label: 'Promptbook', submenu: [
            { role: 'about' }, { label: 'Open at Login', type: 'checkbox', enabled: app.isPackaged, checked: app.isPackaged && app.getLoginItemSettings().openAtLogin,
                click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }) },
            { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'quit' },
        ] }] : []),
        { label: 'Projects', submenu: [
            { label: 'All local projects', accelerator: 'CmdOrCtrl+Shift+P', click: () => launcher('projects') },
            { label: 'New project…', click: () => launcher('init') },
            { label: 'Set up with the web App…', click: () => launcher('setup') },
            { label: 'New window', accelerator: 'CmdOrCtrl+Shift+N', click: () => createWindow() },
            { type: 'separator' }, { label: 'Open CLI console', click: () => launcher('console') },
            ...(isMac ? [{ label: 'Keep Awake with the Lid Closed…', click: () => launcher('keep-awake-helper') }] : []),
            { role: 'close' }, { role: 'quit' }, { label: 'Quit Promptbook and engines…', click: () => void quitAll() },
        ] },
        { role: 'editMenu' }, { role: 'viewMenu' },
        { label: 'Updates', submenu: [{ label: 'Check for updates…', click: checkForDesktopUpdates }] },
        ...(isMac ? [{ role: 'windowMenu' }] : []),
    ]);
    Menu.setApplicationMenu(menu);
    if (!process.argv.includes('--tray') && !(isMac && app.isPackaged && app.getLoginItemSettings().wasOpenedAtLogin)) createWindow(launchOptions(process.argv));
    await refreshTray();
    setInterval(() => void refreshTray(), 3000).unref();
    app.on('activate', () => { if (!windows.size) createWindow(); });
}).catch((error) => dialog.showErrorBox('Promptbook could not open', error.message));
