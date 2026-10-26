import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { findBrowserExecutable } from '../dist/browser/browser.js';
import { browserTools } from '../dist/browser/agent-tools.js';
import { BrowserFleet } from '../dist/browser/fleet.js';
import { parseKeyPress, parseModifiers } from '../dist/browser/input.js';
import { ToolBridge } from '../dist/engine/bridge.js';
import { readableHarnessLine } from '../dist/engine/task-trace.js';
import { temporaryDirectory, waitFor } from './helpers.mjs';

test('browser keys: named keys, characters and shortcuts become trusted key presses; editing shortcuts work on macOS', () => {
    assert.deepEqual(parseKeyPress('Enter', 'linux'), { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r', modifiers: 0 });
    assert.deepEqual(parseKeyPress('shift+tab', 'linux'), { key: 'Tab', code: 'Tab', keyCode: 9, text: undefined, modifiers: 8 });
    assert.equal(parseKeyPress('Shift+a', 'linux').text, 'A');
    assert.deepEqual(parseKeyPress('Control+A', 'darwin').commands, ['selectAll'], 'macOS Chrome needs the editing command');
    assert.equal(parseKeyPress('Control+A', 'linux').commands, undefined, 'other platforms handle the shortcut natively (no double paste)');
    assert.equal(parseKeyPress('Control+A', 'linux').text, undefined, 'a shortcut inserts no text');
    assert.equal(parseKeyPress('Cmd+V', 'darwin').modifiers, 4);
    assert.equal(parseKeyPress('Control++', 'linux').key, '+');
    assert.equal(parseKeyPress('PageDown', 'linux').keyCode, 34);
    assert.throws(() => parseKeyPress('Hyper+Q'), /Unknown modifier "Hyper"/);
    assert.throws(() => parseKeyPress('Launch'), /Unknown key "Launch"/);
    assert.equal(parseModifiers(['Shift', 'ctrl']), 10);
});

test('images returned to the model reach the harness as MCP image content and stay out of the readable harness log', async () => {
    const bridge = await ToolBridge.start([{ name: 'shot', description: 'Screenshot', inputSchema: { type: 'object' }, handler: async () => ({ text: 'Screenshot of the viewport.', images: [{ data: 'iVBORw0KGgo=', mimeType: 'image/png' }] }) }]);
    try {
        const launch = bridge.launch();
        const child = spawn(launch.command, launch.args, { env: { ...process.env, ...launch.env }, stdio: ['pipe', 'pipe', 'ignore'] });
        const line = await new Promise((resolve, reject) => {
            let output = '';
            child.stdout.on('data', (chunk) => {
                output += chunk;
                if (output.includes('\n')) resolve(output.split('\n')[0]);
            });
            child.once('error', reject);
            child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'shot', arguments: {} } })}\n`);
        });
        child.kill();
        assert.deepEqual(JSON.parse(line).result.content, [
            { type: 'text', text: 'Screenshot of the viewport.' },
            { type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' },
        ]);
    } finally {
        await bridge.close();
    }
    const event = JSON.stringify({ type: 'item.completed', item: { type: 'mcp_tool_call', result: { content: [{ type: 'image', data: 'A'.repeat(5000), mimeType: 'image/png' }] } } });
    const readable = readableHarnessLine(event);
    assert.match(readable, /\[image data, 5000 base64 characters omitted\]/);
    assert.doesNotMatch(readable, /AAAAAAAAAA/);
});

/**
 * Whether the real-browser test runs: locally whenever a Chrome-compatible browser is installed, on CI only on request.
 */
async function realBrowserSkip() {
    if (process.env.PTBK_TEST_BROWSER === '0') return 'PTBK_TEST_BROWSER=0';
    if (process.env.CI && process.env.PTBK_TEST_BROWSER !== '1') return 'runs on CI only with PTBK_TEST_BROWSER=1';
    return (await findBrowserExecutable({ variant: 'CHROME' })) ? false : 'no Chrome-compatible browser is installed';
}

/**
 * A LinkedIn-like page: the post composer is a rich-text editor in a shadow-DOM dialog, media are added through a
 * file chooser opened by a button, and a link opens a new tab.
 */
const FEED_PAGE = `<!doctype html><html><head><title>Feed</title></head><body>
<h1>Feed</h1><p>Main feed text</p>
<button id=start>Start a post</button>
<a href="/second" target="_blank">Open second</a>
<div style="position:relative"><button id=covered>Under overlay</button><div id=overlay style="position:absolute;inset:0">overlay</div></div>
<div id=interop-outlet></div>
<script>
document.getElementById('start').addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    const root = document.getElementById('interop-outlet').attachShadow({ mode: 'open' });
    root.innerHTML = '<div role=dialog aria-modal=true aria-label="Create a post"><div contenteditable=true role=textbox aria-label="Text editor for creating content"><p><br></p></div><button id=media>Add media</button><input type=file id=file style="display:none" multiple><span id=files></span><button id=post>Post</button></div>';
    const editor = root.querySelector('[contenteditable]');
    root.getElementById('media').addEventListener('click', () => root.getElementById('file').click());
    root.getElementById('file').addEventListener('change', (change) => { root.getElementById('files').textContent = 'files: ' + [...change.target.files].map((file) => file.name).join(','); });
    root.getElementById('post').addEventListener('click', () => { document.querySelector('h1').textContent = 'Posted: ' + editor.innerText.replace(/\\n+/g, ' | '); root.innerHTML = ''; });
});
</script></body></html>`;

test('full browser access: an agent posts through a shadow-DOM rich-text composer, uploads, follows new tabs, scripts the page and drives it over DevTools', { skip: await realBrowserSkip(), timeout: 180_000 }, async (t) => {
    // The browser is closed before its temporary profile is removed.
    const teardown = [];
    const root = await temporaryDirectory(t, 'ptbk browser', teardown);
    await mkdir(join(root, '.ptbk', 'tmp'), { recursive: true });
    await writeFile(join(root, 'photo.png'), 'pretend image');
    const project = { root, runtime: { root: join(root, '.ptbk'), temporary: join(root, '.ptbk', 'tmp'), browserProfile: join(root, '.ptbk', 'browser', 'profile') } };
    const server = createServer((request, response) => {
        response.setHeader('content-type', 'text/html');
        response.end(request.url === '/second' ? '<title>Second</title><p>Second page text</p>' : FEED_PAGE);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const settings = { tools: [{ type: 'BROWSER', variant: 'CHROME', name: 'project-browser', isEnabled: true, profile: { source: 'PROJECT' }, isHeadless: true }], overriddenTools: new Set() };
    const fleet = new BrowserFleet(project, () => settings, { ...process.env, PTBK_HOME: join(root, 'ptbk home') });
    teardown.push(async () => {
        await fleet.close();
        server.closeAllConnections();
        server.close();
    });
    const tools = Object.fromEntries(browserTools(fleet.scope('test task'), undefined, 'Tester', () => undefined, () => []).map((tool) => [tool.name, tool]));
    const call = async (name, input = {}) => {
        const result = await tools[name].handler(input);
        assert.ok(!result.isError, `${name}: ${result.text}`);
        return result;
    };
    const ref = (text, needle) => Number(text.split('\n').find((line) => /^\[\d+\]/.test(line) && line.includes(needle))?.match(/^\[(\d+)\]/)?.[1]);

    let { text } = await call('browser_open', { url: `127.0.0.1:${server.address().port}` });
    assert.match(text, /Main feed text/, 'an address without a scheme opens like in the address bar');
    ({ text } = await call('browser_click', { ref: ref(text, 'Start a post') }));
    assert.match(text, /Open dialog "Create a post"/, 'the shadow-DOM dialog is read first (the click was a trusted one)');
    const editor = ref(text, 'Text editor for creating content');
    assert.equal(editor, 1, 'dialog elements are numbered first');
    ({ text } = await call('browser_type', { ref: editor, text: 'Hello LinkedIn\nSecond paragraph' }));
    assert.match(text, /Its content is now:\nHello LinkedIn\n+Second paragraph\n/, 'typing into the rich-text editor is verified by reading it back');
    ({ text } = await call('browser_upload', { ref: ref(text, 'Add media'), paths: ['photo.png'] }));
    assert.match(text, /files: photo\.png/, 'files reach the file chooser a button opens');
    ({ text } = await call('browser_click', { ref: ref(text, '"Post"') }));
    assert.match(text, /Posted: Hello LinkedIn \| Second paragraph/);

    const covered = await tools.browser_click.handler({ ref: ref(text, 'Under overlay') });
    assert.ok(covered.isError && /covered by div#overlay/.test(covered.text), 'a click that would hit another element is refused with the reason');

    const shot = await call('browser_screenshot');
    assert.equal(shot.images[0].mimeType, 'image/png', 'the model sees the screenshot');
    assert.match(shot.text, /Screenshot of the viewport, 1280×\d+ CSS pixels/, 'a headless browser has a desktop-sized window');
    assert.match((await call('browser_evaluate', { script: 'await Promise.resolve(document.querySelector("h1").textContent)' })).text, /^Posted:/);
    assert.match((await call('browser_cdp', { method: 'Browser.getVersion', scope: 'browser' })).text, /"product"/);
    const endpoint = (await call('browser_devtools_endpoint')).text.match(/HTTP endpoint: (\S+)/)[1];
    assert.ok((await (await fetch(`${endpoint}/json/version`)).json()).webSocketDebuggerUrl, 'the DevTools endpoint is reachable for the agent own scripts');

    ({ text } = await call('browser_click', { ref: ref(text, 'Open second') }));
    assert.match(text, /opened a new tab/);
    assert.match(text, /Second page text/, 'a tab the website opens becomes the current tab');
    ({ text } = await call('browser_tabs', { action: 'close' }));
    assert.match(text, /Posted:/, 'closing the current tab continues in the remaining one');
    ({ text } = await call('browser_navigate', { action: 'reload' }));
    assert.match(text, /Main feed text/);
});

/**
 * Whether a process still runs.
 */
function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

test('shared browser pools: engines share one process per profile, tasks get their own tabs, and the last disconnection closes it', { skip: await realBrowserSkip(), timeout: 180_000 }, async (t) => {
    const teardown = [];
    const root = await temporaryDirectory(t, 'ptbk pool', teardown);
    const env = { ...process.env, PTBK_HOME: join(root, 'ptbk home') };
    const profile = join(root, 'shared profile');
    await mkdir(profile, { recursive: true });
    const project = async (name) => {
        const base = join(root, name);
        await mkdir(join(base, '.ptbk', 'tmp'), { recursive: true });
        return { root: base, name, runtime: { root: join(base, '.ptbk'), temporary: join(base, '.ptbk', 'tmp'), browserProfile: join(base, '.ptbk', 'browser', 'profile') } };
    };
    const server = createServer((request, response) => {
        response.setHeader('content-type', 'text/html');
        response.end(`<title>${request.url}</title><p>Page ${request.url}</p>`);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = (path) => `http://127.0.0.1:${server.address().port}${path}`;
    const settings = { tools: [{ type: 'BROWSER', variant: 'CHROME', name: 'shared', isEnabled: true, profile: { source: 'CUSTOM', path: profile }, isHeadless: true }], overriddenTools: new Set() };
    const a = new BrowserFleet(await project('alpha'), () => settings, env, () => undefined, 'engine-alpha');
    const b = new BrowserFleet(await project('beta'), () => settings, env, () => undefined, 'engine-beta');
    teardown.push(async () => {
        await a.close();
        await b.close();
        server.closeAllConnections();
        server.close();
    });

    // Both engines start the enabled browser eagerly: the first launches the process, the second joins it.
    await Promise.all([a.startEnabled(), b.startEnabled()]);
    await a.refresh();
    const [alpha] = a.inspectAll();
    const [beta] = b.inspectAll();
    assert.equal(alpha.state, 'running', JSON.stringify(alpha));
    assert.equal(alpha.pid, beta.pid, 'one browser process for the profile, no matter who started it');
    assert.equal(alpha.connections.length, 2, 'both engines are connected members of the pool');
    assert.deepEqual(alpha.connections.map((connection) => connection.self).sort(), [false, true]);
    const pid = alpha.pid;

    // Concurrent tasks work in their own tabs of the shared process.
    const [one, two] = await Promise.all([a.scope('task one').acquire(), a.scope('task two').acquire()]);
    const [pageOne, pageTwo] = await Promise.all([one.open(url('/one')), two.open(url('/two'))]);
    assert.match(pageOne, /Page \/one/);
    assert.match(pageTwo, /Page \/two/, 'neither task navigated the other one’s tab');
    const listing = await two.tabs();
    const foreign = listing.split('\n').find((line) => line.startsWith('x '));
    assert.ok(foreign, `the other task's tab is marked as not yours:\n${listing}`);
    await assert.rejects(two.tab('close', foreign.split(' ')[1]), /belongs to another task/, 'a task never closes another task’s tab');
    assert.equal(a.inspectAll()[0].tabs.length, 2, 'diagnostics list the task tabs');
    await a.endScope('task one');
    assert.doesNotMatch(await two.tabs(), /^x /m, 'a finished task’s tabs are closed');

    // The engine that launched the process leaves: the other keeps working in the same process.
    await a.close();
    assert.ok(alive(pid), 'the shared process stays for the remaining engine (no master engine)');
    await b.refresh();
    assert.equal(b.inspectAll()[0].connections.length, 1);
    const three = await b.scope('task three').acquire();
    assert.match(await three.open(url('/three')), /Page \/three/);
    assert.equal(b.inspectAll()[0].pid, pid);

    // The last managed disconnection closes the process; its profile stays and nothing is left recorded.
    await b.close();
    await waitFor(() => !alive(pid), { timeoutMs: 20_000, message: 'the browser to close after the last disconnection' });
    assert.ok((await readdir(profile)).length > 0, 'the profile data is kept');
    assert.deepEqual((await readdir(join(root, 'ptbk home', 'browser-pools')).catch(() => [])).filter((name) => name.endsWith('.json')), []);
});
