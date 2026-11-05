import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { _electron } from 'playwright-core';
import electron from 'electron';
import { initializedProject, ptbk } from '../../../test/helpers.mjs';

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
