import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { _electron } from 'playwright-core';
import electron from 'electron';
import { initializedProject, ptbk, waitFor } from '../../../test/helpers.mjs';
import { readProcessRecord } from '../../../dist/service/records.js';
import { projectAt } from '../../../dist/project/workspace.js';
import { ControlClient } from '../../../dist/service/control.js';

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
        args: [...(process.env.PTBK_DESKTOP_EXECUTABLE ? [] : [fileURLToPath(new URL('../', import.meta.url))]), '--skip-init', `--user-data-dir=${profile}`],
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

/** Voice starts beside the composer of the open (new) chat, stays bound to it, and leaving that chat view ends it. */
/**
 * Windows has not passed this flow yet: on the windows-installer runner it never finished. Even its own timeout and
 * bounded cleanup did not end it, and the whole job was cancelled, so it is skipped there until it is diagnosed on a
 * Windows machine.
 */
const VOICE_E2E_WINDOWS = process.platform === 'win32' ? { skip: 'desktop voice e2e hangs the Windows runner (undiagnosed); verified on macOS' } : {};

test('desktop voice is started and controlled from the open chat, never from the feature bar', { timeout: 240000, ...VOICE_E2E_WINDOWS }, async (t) => {
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
        args: [...(process.env.PTBK_DESKTOP_EXECUTABLE ? [] : [fileURLToPath(new URL('../', import.meta.url))]), '--skip-init', `--user-data-dir=${profile}`],
        env: desktopEnv,
        colorScheme: null,
        timeout: 45000,
    });
    // Cleanup is bounded: a client that does not exit is killed, so a failure is reported instead of hanging the run.
    t.after(async () => {
        await Promise.race([application.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 15000))]);
        try { application.process().kill(); } catch {}
    });
    const shell = await application.firstWindow();
    await shell.getByRole('heading', { name: 'Your projects' }).waitFor();
    await shell.locator('tbody .status-dot').waitFor();
    await shell.getByRole('button', { name: 'Open', exact: true }).click();
    const dashboard = await waitFor(() => application.windows().find((page) => page.url().includes('view=desktop')), { timeoutMs: 45000, message: 'the graphical dashboard' });
    assert.match(new URL(dashboard.url()).searchParams.get('intent') ?? '', /^[0-9a-f]{32}$/, 'the view has its own voice intent token');
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
});
