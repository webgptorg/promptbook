import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dirname, join, resolve } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { _electron } from 'playwright-core';
import electron from 'electron';
import { initializedProject, ptbk, waitFor } from '../../../test/helpers.mjs';
import { readProcessRecord } from '../../../dist/service/records.js';
import { projectAt } from '../../../dist/project/workspace.js';
import { ControlClient } from '../../../dist/service/control.js';

/**
 * The desktop app folder, without a trailing separator: Playwright quotes each argument for `cmd.exe` on Windows, and a
 * trailing backslash would escape the closing quote and scramble every following argument (`--user-data-dir`, `--project`).
 */
const DESKTOP_APP = resolve(fileURLToPath(new URL('../', import.meta.url)));

/** Monaco's `CtrlCmd` shortcuts and document navigation as the current platform types them. */
const KEYS = process.platform === 'darwin'
    ? { documentEnd: 'Meta+ArrowDown', save: 'Meta+S', undo: 'Meta+Z', redo: 'Meta+Shift+Z', reference: 'Meta' }
    : { documentEnd: 'Control+End', save: 'Control+S', undo: 'Control+Z', redo: 'Control+Y', reference: 'Control' };

/** A control-channel request to the project's engine (the observed outcome, independent of the desktop UI). */
async function control(project, method, params = {}) {
    const record = await readProcessRecord(projectAt(project));
    return await new ControlClient(projectAt(project), record).request(method, params, 60_000);
}

/** Runs actual Electron, native PTYs and the existing engine with the repository's deterministic fake harness. */
test('desktop windows and native terminals are independent clients of the same paused engine', { timeout: 150000 }, async (t) => {
    const { project, env, directory } = await initializedProject(t);
    const runtimeConfig = join(directory, 'desktop-runtime.json');
    await writeFile(runtimeConfig, JSON.stringify({ installation: fileURLToPath(new URL('../../../', import.meta.url)), nodePath: process.execPath }));
    const packagedMac = process.platform === 'darwin' && Boolean(process.env.PTBK_DESKTOP_EXECUTABLE);
    const desktopEnv = { ...env };
    if (packagedMac) {
        delete desktopEnv.PTBK_DESKTOP_NODE;
        delete desktopEnv.PTBK_DESKTOP_RUNTIME;
    } else {
        desktopEnv.PTBK_DESKTOP_NODE = process.execPath;
        desktopEnv.PTBK_DESKTOP_RUNTIME = runtimeConfig;
    }
    const started = await ptbk(['start', '--paused', '--no-dashboard', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const before = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    const profile = join(directory, 'desktop profile');
    await mkdir(profile);
    const launch = () => _electron.launch({
        executablePath: process.env.PTBK_DESKTOP_EXECUTABLE || electron,
        args: [...(process.env.PTBK_DESKTOP_EXECUTABLE ? [] : [DESKTOP_APP]), '--skip-init', `--user-data-dir=${profile}`],
        env: desktopEnv,
        colorScheme: null,
        timeout: 45000,
    });
    const application = await launch();
    t.after(() => application.close().catch(() => {}));
    const page = await application.firstWindow();
    page.on('pageerror', (error) => process.stderr.write(`Desktop renderer: ${error.message}\n`));
    await page.getByRole('heading', { name: 'Your projects' }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 1);
    const appearance = page.getByRole('group', { name: 'Theme' });
    const selectedTheme = (window, theme) => window.locator(`#appearance [data-theme="${theme}"][aria-pressed="true"]`);
    await selectedTheme(page, 'system').waitFor();
    await appearance.getByRole('button', { name: 'Dark' }).click();
    await page.waitForFunction(() => matchMedia('(prefers-color-scheme: dark)').matches);
    await page.waitForFunction(() => {
        const logo = document.querySelector('.brand img');
        return logo?.naturalWidth > 0 && logo.currentSrc.endsWith('readme-wordmark-dark.svg');
    });
    const opening = application.waitForEvent('window');
    await page.getByRole('button', { name: 'New window', exact: true }).click();
    const second = await opening;
    await selectedTheme(second, 'dark').waitFor();
    await second.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Light' }).click();
    await selectedTheme(page, 'light').waitFor();
    await page.waitForFunction(() => matchMedia('(prefers-color-scheme: light)').matches);
    await page.locator('tbody .status-dot').waitFor();
    assert.match(await page.locator('tbody .state').textContent(), /^pause\b/);
    const divider = page.getByRole('separator', { name: 'Projects sidebar width' });
    const initialWidth = Number(await divider.getAttribute('aria-valuenow'));
    assert.ok(initialWidth > 0);
    await divider.press('ArrowRight');
    await page.waitForFunction((width) => Number(document.querySelector('#sidebar-divider').getAttribute('aria-valuenow')) > width, initialWidth);
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 2);
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await page.getByRole('button', { name: 'Open in terminal', exact: true }).click();
    await page.locator('.xterm-screen').waitFor();
    await page.waitForFunction(() => document.querySelector('.xterm-screen')?.textContent.includes('ptbk'));
    // Starting init uses the same graphical prompts; cancellation remains a normal CLI outcome.
    await page.getByRole('button', { name: '+ New project', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel setup', exact: true }).waitFor({ timeout: 45000 });
    await page.getByRole('button', { name: 'Cancel setup', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#prompt-pane').hidden);
    const firstId = await page.evaluate(() => window.desktop ? true : false);
    assert.equal(firstId, true);
    await page.close();
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
    const afterWindow = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.equal(afterWindow.service.pid, before.service.pid, 'closing a window never replaces or stops the engine');
    await application.close();
    const afterController = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.equal(afterController.service.pid, before.service.pid, 'closing the client process leaves the independent engine running');
    const restarted = await launch();
    try {
        const window = await restarted.firstWindow();
        await selectedTheme(window, 'light').waitFor();
        await window.waitForFunction(() => matchMedia('(prefers-color-scheme: light)').matches);
        await window.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'System' }).click();
        await selectedTheme(window, 'system').waitFor();
        assert.equal(await window.evaluate(() => window.desktop.theme()), 'system');
    } finally {
        await restarted.close();
    }
});

/**
 * The desktop workspace: preview reuse and promotion, pinning, Monaco with the shared Book language logic, saving
 * through the engine, moving a dirty document with its undo history to a new window, and restoring after a restart.
 */
test('desktop workspace tabs, Monaco editing, cross-window moves and restart restoration', { timeout: 240000 }, async (t) => {
    const { project, env, directory } = await initializedProject(t);
    await writeFile(join(project, 'notes.md'), '# Notes\r\nŽluťoučký kůň 👋\r\n');
    await writeFile(join(project, 'other.txt'), 'other\n');
    const runtimeConfig = join(directory, 'desktop-runtime.json');
    await writeFile(runtimeConfig, JSON.stringify({ installation: fileURLToPath(new URL('../../../', import.meta.url)), nodePath: process.execPath }));
    const desktopEnv = { ...env, PTBK_DESKTOP_NODE: process.execPath, PTBK_DESKTOP_RUNTIME: runtimeConfig };
    assert.equal((await ptbk(['start', '--paused', '--no-dashboard', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const profile = join(directory, 'desktop profile');
    await mkdir(profile);
    // Clients close before the fixture's own cleanup: a running Electron keeps its profile (inside the fixture) open,
    // and removing that directory under it never finishes on Windows, past the test's own timeout.
    const clients = [];
    const launch = async (...args) => {
        const client = await _electron.launch({
            executablePath: electron,
            args: [DESKTOP_APP, '--skip-init', `--user-data-dir=${profile}`, ...args],
            env: desktopEnv, colorScheme: null, timeout: 45000,
        });
        clients.push(client);
        return client;
    };
    const closeBounded = async (application) => {
        await Promise.race([application.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 15000))]);
        try { application.process().kill(); } catch {}
    };
    const dashboards = (application) => application.windows().filter((page) => page.url().includes('view=desktop'));
    try {
        const application = await launch('--project', project);
        const dashboard = await waitFor(() => dashboards(application)[0], { timeoutMs: 45000, message: 'the graphical dashboard' });
        dashboard.on('pageerror', (error) => process.stderr.write(`Desktop dashboard: ${error.message}\n`));
        await dashboard.locator('nav.workspace-tabs').waitFor();
        await dashboard.evaluate(() => { location.hash = '#/files'; });
        await dashboard.reload();
        const tabs = dashboard.getByRole('tablist', { name: 'Open pages and documents' });
        await tabs.getByRole('tab', { name: 'Files' }).waitFor();
        const files = dashboard.locator('.files-list');
        // A single click previews; previewing another file reuses the same preview tab.
        await files.getByRole('button', { name: 'other.txt', exact: true }).click();
        await tabs.getByRole('tab', { name: 'other.txt (preview)' }).waitFor();
        await dashboard.waitForFunction(() => Boolean(window.PromptbookEditor) && document.querySelector('.document-view:not([hidden]) .monaco-editor'));
        await tabs.getByRole('tab', { name: 'Files' }).click();
        await files.getByRole('button', { name: 'notes.md', exact: true }).click();
        await tabs.getByRole('tab', { name: 'notes.md (preview)' }).waitFor();
        assert.equal(await tabs.getByRole('tab', { name: /other\.txt/ }).count(), 0, 'one preview per window');
        // Starting an edit keeps the preview open as a regular tab.
        await dashboard.getByRole('button', { name: 'Edit', exact: true }).click();
        await tabs.getByRole('tab', { name: 'notes.md', exact: true }).waitFor();
        const editor = dashboard.locator('.document-view:not([hidden]) .monaco-editor');
        await editor.locator('.view-lines').click();
        await dashboard.keyboard.press(KEYS.documentEnd);
        await dashboard.keyboard.type('Saved line');
        await dashboard.keyboard.press(KEYS.save);
        await dashboard.locator('.document-view:not([hidden]) .doc-status').filter({ hasText: /Saved/ }).waitFor({ timeout: 30000 });
        assert.equal(await readFile(join(project, 'notes.md'), 'utf8'), '# Notes\r\nŽluťoučký kůň 👋\r\nSaved line', 'saved through the engine with its CRLF and Unicode');
        // Pinned tabs survive closing the unpinned ones.
        await tabs.locator('.ws-tab', { hasText: 'notes.md' }).locator('select').selectOption('pin');
        await tabs.getByRole('tab', { name: 'notes.md (pinned)' }).waitFor();
        await tabs.locator('.ws-tab', { hasText: 'notes.md' }).locator('select').selectOption('unpinned');
        await waitFor(async () => (await tabs.getByRole('tab').count()) === 1 || undefined, { timeoutMs: 10000, message: 'only the pinned tab stays' });
        // A Book uses the shared language logic: highlighting, live diagnostics and Ctrl/Cmd+click to the referenced Book.
        await dashboard.evaluate(() => { location.hash = '#/agents'; });
        await tabs.getByRole('tab', { name: 'Agents' }).waitFor();
        await dashboard.locator('.inventory li').filter({ hasNotText: 'engine-provided' }).first().getByRole('button', { name: 'Book', exact: true }).click();
        const book = dashboard.locator('.document-view:not([hidden])');
        await book.locator('.monaco-editor .ptbk-book-declaration').first().waitFor({ timeout: 20000 });
        await book.locator('.view-lines').click();
        await dashboard.keyboard.press(KEYS.documentEnd);
        await dashboard.keyboard.press('Enter');
        await dashboard.keyboard.type('NONSENSE THING here');
        // Escape closes a suggestion and stays in the editor (it never leaves the document).
        await dashboard.keyboard.press('Escape');
        await dashboard.keyboard.press('Enter');
        await dashboard.keyboard.type('GOAL Ask @Expert today.');
        await dashboard.keyboard.press('Escape');
        await book.locator('.monaco-editor .ptbk-book-unknown').waitFor({ timeout: 10000 });
        await book.locator('.monaco-editor .squiggly-warning, .monaco-editor .squiggly-error').first().waitFor({ timeout: 10000 });
        await book.locator('.monaco-editor .ptbk-book-reference', { hasText: 'Expert' }).last().click({ modifiers: [KEYS.reference] });
        await tabs.getByRole('tab', { name: 'Expert', exact: true }).waitFor({ timeout: 20000 });
        // An unsaved edit moves to a new window with its undo history; the source tab closes only after the target takes it.
        await tabs.getByRole('tab', { name: /notes\.md/ }).click();
        await editor.locator('.view-lines').click();
        await dashboard.keyboard.press(KEYS.documentEnd);
        await dashboard.keyboard.type(' DRAFT');
        await tabs.getByRole('tab', { name: 'notes.md (pinned) · unsaved' }).waitFor();
        await tabs.locator('.ws-tab', { hasText: 'notes.md' }).locator('select').selectOption('new-window');
        const moved = await waitFor(() => dashboards(application).find((page) => page !== dashboard), { timeoutMs: 45000, message: 'the new window with the document' });
        const movedTabs = moved.getByRole('tablist', { name: 'Open pages and documents' });
        await movedTabs.getByRole('tab', { name: 'notes.md (pinned) · unsaved' }).waitFor({ timeout: 45000 });
        await waitFor(async () => (await tabs.getByRole('tab', { name: /notes\.md/ }).count()) === 0 || undefined, { timeoutMs: 20000, message: 'the source tab closes after the move' });
        const movedText = () => moved.evaluate(() => document.querySelector('.document-view:not([hidden]) .monaco-editor .view-lines').textContent.replace(/ /g, ' '));
        assert.match(await movedText(), /Saved line DRAFT$/);
        await moved.locator('.document-view:not([hidden]) .monaco-editor .view-lines').click();
        await moved.keyboard.press(KEYS.undo);
        await waitFor(async () => (/Saved line$/.test(await movedText()) || undefined), { timeoutMs: 10000, message: 'undo works after the move' });
        await moved.keyboard.press(KEYS.redo);
        await waitFor(async () => (/Saved line DRAFT$/.test(await movedText()) || undefined), { timeoutMs: 10000, message: 'redo works after the move' });
        // The workspace and its draft return after a restart.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await closeBounded(application);
        const restarted = await launch();
        const restored = await waitFor(async () => {
            for (const page of dashboards(restarted)) if (await page.getByRole('tab', { name: 'notes.md (pinned) · unsaved' }).count()) return page;
        }, { timeoutMs: 60000, message: 'the restored window with its pinned draft' });
        await restored.getByRole('tab', { name: /notes\.md/ }).click();
        await restored.locator('.document-view:not([hidden]) .doc-status').filter({ hasText: /Restored your unsaved draft/ }).waitFor({ timeout: 30000 });
        assert.equal(await readFile(join(project, 'notes.md'), 'utf8'), '# Notes\r\nŽluťoučký kůň 👋\r\nSaved line', 'a draft is never written without a save');
    } finally {
        for (const client of clients.reverse()) await closeBounded(client);
    }
});

/** Voice starts beside the composer of the open (new) chat, stays bound to it, and leaving that chat view ends it. */
test('desktop voice is started and controlled from the open chat, never from the feature bar', { timeout: 240000 }, async (t) => {
    const { project, env: baseEnv, directory, log } = await initializedProject(t, { check: 'process.exit(0);\n' });
    // The fake provider never transcribes here, so the history stays exactly what the user does.
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '0', FAKE_CODEX_VOICE_LOG: join(dirname(log), 'voice.log'), FAKE_CODEX_VOICE_DELAY_MS: '600000', PTBK_VOICE_PAGE_GRACE_MS: '60000' };
    const runtimeConfig = join(directory, 'desktop-runtime.json');
    await writeFile(runtimeConfig, JSON.stringify({ installation: fileURLToPath(new URL('../../../', import.meta.url)), nodePath: process.execPath }));
    const packagedMac = process.platform === 'darwin' && Boolean(process.env.PTBK_DESKTOP_EXECUTABLE);
    const desktopEnv = { ...env };
    if (packagedMac) {
        delete desktopEnv.PTBK_DESKTOP_NODE;
        delete desktopEnv.PTBK_DESKTOP_RUNTIME;
    } else {
        desktopEnv.PTBK_DESKTOP_NODE = process.execPath;
        desktopEnv.PTBK_DESKTOP_RUNTIME = runtimeConfig;
    }
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    t.after(async () => await ptbk(['stop', '--raw'], { cwd: project, env }).catch(() => undefined));
    const profile = join(directory, 'desktop profile');
    await mkdir(profile);
    const application = await _electron.launch({
        executablePath: process.env.PTBK_DESKTOP_EXECUTABLE || electron,
        args: [...(process.env.PTBK_DESKTOP_EXECUTABLE ? [] : [DESKTOP_APP]), '--skip-init', `--user-data-dir=${profile}`],
        env: desktopEnv,
        colorScheme: null,
        timeout: 45000,
    });
    // Cleanup is bounded: a client that does not exit is killed, so a failure is reported instead of hanging the run.
    // It runs before the fixture's own cleanup, which cannot remove the profile from under a running client on Windows.
    try {
        const shell = await application.firstWindow();
        await shell.getByRole('heading', { name: 'Your projects' }).waitFor();
        await shell.locator('tbody .status-dot').waitFor();
        await shell.getByRole('button', { name: 'Open', exact: true }).click();
        const dashboard = await waitFor(() => application.windows().find((page) => page.url().includes('view=desktop')), { timeoutMs: 45000, message: 'the graphical dashboard' });
        assert.match(new URL(dashboard.url()).searchParams.get('intent') ?? '', /^[0-9a-f]{32}$/, 'the view has its own voice intent token');
        // A reload while the just-opened dashboard is still navigating is aborted (net::ERR_ABORTED), so it waits until the dashboard has rendered.
        await dashboard.locator('nav.workspace-tabs').waitFor();
        await dashboard.evaluate(() => { location.hash = '#/chats'; });
        await dashboard.reload();
        await dashboard.getByRole('button', { name: 'New chat', exact: true }).click();
        await dashboard.getByRole('button', { name: /^Chat with / }).click();
        await dashboard.locator('textarea[data-draft="chat:new"]').fill('UNSENT DRAFT');
        assert.equal(await shell.getByRole('button', { name: /Start voice/ }).count(), 0, 'no voice entry or chat picker in the shell');
        await dashboard.getByRole('button', { name: 'Start voice chat' }).click();
        // The new chat's ordinary Book exists without a message; the shell presents the call's media below that chat.
        const name = await waitFor(async () => (await control(project, 'chat-list')).find((chat) => /new chat/.test(chat.name))?.name, { timeoutMs: 30000, message: 'the chat prepared for voice' });
        await waitFor(async () => (await control(project, 'chat-get', { name })).voice, { timeoutMs: 30000, message: 'the call in that chat' });
        assert.equal((await control(project, 'chat-get', { name })).messages.length, 0, 'media setup adds no message');
        await waitFor(() => shell.evaluate(() => !document.getElementById('voice-strip').hidden), { timeoutMs: 30000, message: 'the media below the chat' });
        await dashboard.locator('.voice-panel').waitFor({ timeout: 30000 });
        assert.equal(await dashboard.locator('textarea[data-draft]').inputValue(), 'UNSENT DRAFT', 'the draft moved with its chat');
        assert.equal(await dashboard.getByRole('button', { name: 'Start voice chat' }).count(), 0);
        await dashboard.getByRole('button', { name: 'Mute microphone' }).click();
        await waitFor(async () => (await control(project, 'chat-get', { name })).voice.micMuted || undefined, { timeoutMs: 20000, message: 'mute from the chat' });
        await dashboard.getByRole('button', { name: 'Unmute microphone' }).waitFor({ timeout: 20000 });
        // The same composer sends text during the call, into the same chat.
        await dashboard.locator('textarea[data-draft]').fill('TYPED DURING CALL');
        await dashboard.getByRole('button', { name: 'Send', exact: true }).click();
        await waitFor(async () => (await control(project, 'chat-get', { name })).messages.some((message) => message.text === 'TYPED DURING CALL') || undefined, { timeoutMs: 20000, message: 'the typed message' });
        // Leaving the chat view closes the call's owning view: voice ends, the chat stays.
        await dashboard.getByRole('button', { name: 'Close', exact: true }).click();
        await waitFor(async () => ['ended', 'failed'].includes((await control(project, 'chat-get', { name })).voice?.state) || undefined, { timeoutMs: 30000, message: 'the call ends on leaving its chat' });
        await waitFor(() => shell.evaluate(() => document.getElementById('voice-strip').hidden), { timeoutMs: 30000, message: 'the media view goes away' });
        assert.match(await shell.locator('#notice').textContent(), /left the chat/);
        assert.ok((await control(project, 'chat-get', { name })).messages.length >= 1, 'the chat and its history remain');
    } finally {
        await Promise.race([application.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 15000))]);
        try { application.process().kill(); } catch {}
    }
});
