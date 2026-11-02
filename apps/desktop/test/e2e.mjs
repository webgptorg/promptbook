import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { _electron } from 'playwright-core';
import electron from 'electron';
import { initializedProject, ptbk } from '../../../test/helpers.mjs';

/** Runs actual Electron, native PTYs and the existing engine with the repository's deterministic fake harness. */
test('desktop windows and native terminals are independent clients of the same paused engine', { timeout: 150000 }, async (t) => {
    const { project, env, directory } = await initializedProject(t);
    const runtimeConfig = join(directory, 'desktop-runtime.json');
    await writeFile(runtimeConfig, JSON.stringify({ installation: fileURLToPath(new URL('../../../', import.meta.url)), nodePath: process.execPath }));
    const started = await ptbk(['start', '--paused', '--no-dashboard', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const before = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    const application = await _electron.launch({ executablePath: process.env.PTBK_DESKTOP_EXECUTABLE || electron, args: [...(process.env.PTBK_DESKTOP_EXECUTABLE ? [] : [fileURLToPath(new URL('../', import.meta.url))]), '--skip-init'], env: { ...env, PTBK_DESKTOP_NODE: process.execPath, PTBK_DESKTOP_RUNTIME: runtimeConfig }, timeout: 45000 });
    t.after(() => application.close().catch(() => {}));
    const page = await application.firstWindow();
    page.on('pageerror', (error) => process.stderr.write(`Desktop renderer: ${error.message}\n`));
    await page.getByRole('heading', { name: 'Your projects' }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 1);
    const opening = application.waitForEvent('window');
    await page.getByRole('button', { name: 'New window', exact: true }).click();
    await opening;
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 2);
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await page.getByRole('button', { name: 'Open in terminal', exact: true }).click();
    await page.locator('.xterm-screen').waitFor();
    await page.waitForFunction(() => document.querySelector('.xterm-screen')?.textContent.includes('ptbk'));
    // Starting init uses the same graphical prompts; cancellation remains a normal CLI outcome.
    await page.getByRole('button', { name: '＋ New project', exact: true }).click();
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
});
