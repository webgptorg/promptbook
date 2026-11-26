import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { _electron } from 'playwright-core';
import electron from 'electron';
import { initializedProject, ptbk, waitFor } from '../../../test/helpers.mjs';

/** Full Electron window path for source builds; native CI sets the exact packaged executable. */
const desktop = resolve(fileURLToPath(new URL('../', import.meta.url)));
const projectOrigin = 'https://desktop.localhost';

/** Read the actual project WebContentsView, which has its own session and no preload. */
async function inProject(application, expression) {
    return application.evaluate(({ webContents }, { origin, script }) => {
        const view = webContents.getAllWebContents().find((item) => item.getURL().startsWith(origin + '/'));
        return view?.executeJavaScript(script);
    }, { origin: projectOrigin, script: expression });
}

/** One install, two unpaired engines. The first project even has its ordinary HTTP dashboard disabled. */
test('the bundled App opens real local projects, writes through the same API and switches without pairing', { timeout: 180000 }, async (t) => {
    const first = await initializedProject(t);
    const second = await initializedProject(t);
    const { env, directory } = first;
    // Each fixture stops its own engine before removing its folder. A stop hook here would run after that removal
    // (t.after hooks run in registration order) and fail to spawn in the deleted directory.
    const start = async (project) => {
        const result = await ptbk(['start', '--paused', '--no-server', '--no-dashboard', '--no-persist', '--raw'], { cwd: project, env });
        assert.equal(result.code, 0, result.output);
    };
    await start(first.project);
    const status = async (project) => JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    const before = await status(first.project);
    const profile = join(directory, 'desktop profile');
    await mkdir(profile);
    const runtime = join(directory, 'desktop-runtime.json');
    await writeFile(runtime, JSON.stringify({ installation: resolve(desktop, '../..'), nodePath: process.execPath }));
    const desktopEnv = { ...env };
    if (process.platform !== 'darwin' || !process.env.PTBK_DESKTOP_EXECUTABLE) desktopEnv.PTBK_DESKTOP_RUNTIME = runtime;
    const application = await _electron.launch({
        executablePath: process.env.PTBK_DESKTOP_EXECUTABLE || electron,
        args: [...(process.env.PTBK_DESKTOP_EXECUTABLE ? [] : [desktop]), '--lang=en-US', '--user-data-dir=' + profile],
        env: desktopEnv, colorScheme: null, timeout: 45000,
    });
    t.after(() => application.close().catch(() => {}));
    const shell = await application.firstWindow();
    if (process.platform === 'win32' && process.env.PTBK_DESKTOP_EXECUTABLE) {
        // Ask the Windows shell for the packaged EXE icon, as a pinned shortcut does with the app closed.
        const colors = await application.evaluate(async ({ app }) => {
            const icon = await app.getFileIcon(process.execPath, { size: 'normal' });
            const pixels = icon.toBitmap();
            const result = { transparent: false, blue: false, white: false };
            for (let i = 0; i < pixels.length; i += 4) {
                const [b, g, r, a] = pixels.subarray(i, i + 4);
                if (a === 0) result.transparent = true;
                if (a > 220 && b > r + 45 && b > g + 20) result.blue = true;
                if (a > 220 && Math.min(r, g, b) > 220) result.white = true;
            }
            return result;
        });
        assert.deepEqual(colors, { transparent: true, blue: true, white: true });
    }
    const mounted = () => waitFor(() => inProject(application, "Boolean(document.querySelector('#root nav'))").catch(() => false), { timeoutMs: 30000, message: 'upstream engine UI mounted with its navigation' });
    await mounted();
    assert.equal(await inProject(application, 'typeof window.desktop'), 'undefined');
    const summary = await inProject(application, "Promise.all(['/api/v1/me','/api/v1/engine'].map(path => fetch(path).then(r => r.json())))");
    assert.equal(summary[0].role, 'owner');
    assert.equal(summary[1].mode, 'local');
    assert.equal(summary[1].engineId, null, 'opening the local UI does not pair the project');
    const created = await inProject(application, `fetch('/api/v1/chats', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Desktop acceptance' }) }).then(async r => ({ status: r.status, chat: await r.json() }))`);
    assert.equal(created.status, 201, JSON.stringify(created.chat));
    const containsChat = "fetch('/api/v1/chats').then(r => r.json()).then(page => page.items.some(chat => chat.id === " + JSON.stringify(created.chat.id) + "))";
    assert.equal(await inProject(application, containsChat), true);
    const chatPath = '/chats/' + encodeURIComponent(created.chat.id);
    await inProject(application, 'setTimeout(() => location.assign(' + JSON.stringify(chatPath) + '), 0); true');
    await waitFor(() => inProject(application, "document.body.innerText.includes('Desktop acceptance')").catch(() => false), { timeoutMs: 20000, message: 'a deep link renders the real chat' });

    await start(second.project);
    // Click the actual upstream switcher's All projects link; the shell owns only its local destination.
    await inProject(application, "[...document.querySelectorAll('button')].find(button => button.textContent.includes('desktop.localhost')).click()");
    const switchLink = "document.querySelector('a[href=\"https://projects.localhost/\"]')";
    await waitFor(() => inProject(application, 'Boolean(' + switchLink + ')'), { timeoutMs: 10000, message: 'upstream project switcher offers all projects' });
    await inProject(application, 'setTimeout(() => ' + switchLink + '.click(), 0); true');
    const projectButtons = shell.locator('button[data-project]');
    await waitFor(() => projectButtons.count().then((n) => n === 2), { timeoutMs: 15000, message: 'both local engines discovered' });
    await projectButtons.filter({ hasText: second.project }).click();
    await mounted();
    assert.equal(await inProject(application, containsChat), false);
    await application.close();
    const after = await status(first.project);
    assert.equal(after.service.instanceId, before.service.instanceId);
    assert.equal(after.service.state, 'pause');
});
