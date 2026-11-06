import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { browserTools } from '../dist/browser/agent-tools.js';
import { findBrowserExecutable } from '../dist/browser/browser.js';
import { BrowserFleet } from '../dist/browser/fleet.js';
import { ChatStore } from '../dist/chats/store.js';
import { projectAt } from '../dist/project/workspace.js';
import { git, initializedProject, ptbk, waitFor } from './helpers.mjs';

/** Match the real-browser fixture policy; CI can opt in with an installed Chrome-compatible browser. */
async function realBrowserSkip() {
    if (process.env.PTBK_TEST_BROWSER === '0') return 'PTBK_TEST_BROWSER=0';
    if (process.env.CI && process.env.PTBK_TEST_BROWSER !== '1') return 'runs on CI only with PTBK_TEST_BROWSER=1';
    return await findBrowserExecutable({ variant: 'CHROME' }) ? false : 'no Chrome-compatible browser is installed';
}

test('browser attention: lists and offscreen calls stay unseen, displaying a long call acknowledges it, and refresh preserves scroll and the unanswered wait', { skip: await realBrowserSkip(), timeout: 180_000 }, async (t) => {
    const fixture = await initializedProject(t, { check: 'process.exit(0);\n' });
    const project = projectAt(fixture.project);
    const store = new ChatStore(project, { timeZone: 'UTC' });
    const chat = await store.create({ name: 'Attention viewport', members: ['@User', '@Developer'], status: 'waiting-for-user', messages: [{ sender: '@Developer', text: '+@User Which date should be used?\n\n' + 'Long calling message for viewport verification.\n'.repeat(120) }] });
    await store.append(chat.chat.name, { sender: '@Developer', text: 'Ordinary passive update.\n'.repeat(35) });
    await git(project.root, ['add', 'chats']);
    await git(project.root, ['commit', '-qm', 'Viewport fixture']);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project.root, env: fixture.env })).code, 0);
    const status = async () => JSON.parse((await ptbk(['status', '--json'], { cwd: project.root, env: fixture.env })).stdout);
    const before = await status();
    assert.equal(before.chats.pings.length, 1);

    const root = join(fixture.directory, 'isolated browser');
    const browserProject = { root, runtime: { root: join(root, '.ptbk'), temporary: join(root, '.ptbk', 'tmp'), browserProfile: join(root, '.ptbk', 'browser', 'profile') } };
    await mkdir(browserProject.runtime.temporary, { recursive: true });
    const settings = { tools: [{ type: 'BROWSER', variant: 'CHROME', name: 'project-browser', isEnabled: true, profile: { source: 'PROJECT' }, isHeadless: true }], overriddenTools: new Set() };
    // The harness fixture deliberately points CHROME_PATH at Node; this separate UI fixture needs the real browser.
    const fleet = new BrowserFleet(browserProject, () => settings, { ...fixture.env, CHROME_PATH: process.env.CHROME_PATH ?? '', PTBK_HOME: join(root, 'home') });
    const tools = Object.fromEntries(browserTools(fleet.scope('viewport fixture'), undefined, 'Tester', () => undefined, () => []).map((tool) => [tool.name, tool]));
    const call = async (name, input) => {
        const result = await tools[name].handler(input);
        assert.ok(!result.isError, result.text);
        return result;
    };
    const evaluate = async (script) => (await call('browser_evaluate', { script })).text;
    try {
        await call('browser_open', { url: before.localApi.url });
        await waitFor(async () => await evaluate('Boolean(document.querySelector("[data-tile=chats]"))') === 'true', { message: 'dashboard home' });
        await evaluate('document.querySelector("[data-tile=chats]").click(); true');
        await waitFor(async () => await evaluate('document.body.innerText.includes("Attention viewport")') === 'true', { message: 'chat list' });
        assert.equal((await status()).chats.pings.length, 1, 'the list never acknowledges a calling message');
        await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.textContent === "Open conversation").click(); true');
        await waitFor(async () => await evaluate('Boolean(document.querySelector(".messages .message"))') === 'true', { message: 'chat viewport' });
        assert.equal((await status()).chats.pings.length, 1, 'a call above the viewport stays unseen');
        await evaluate('document.querySelector(".messages").scrollTop = 0; true');
        const seen = await waitFor(async () => {
            const snapshot = await status();
            return snapshot.chats.pings.length ? undefined : snapshot;
        }, { timeoutMs: 15_000, message: 'the displayed calling message to become seen' });
        assert.equal(seen.chats.waiting.length, 1, 'viewing never answers');
        const top = await evaluate('await new Promise(resolve => setTimeout(resolve, 500)); document.querySelector(".messages").scrollTop');
        assert.equal(top, '0', 'the shared seen refresh cannot move the operator away from the calling message');
    } finally { await fleet.close(); }
});
