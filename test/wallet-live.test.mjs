import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as httpsServer, request as httpsRequest } from 'node:https';
import { createServer as tcpServer } from 'node:net';
import { once } from 'node:events';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { WalletLive } from '../dist/app/web/wallet-live.js';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { EngineOrigin } from '../dist/app/web/origin.js';
import { createAcmeChallengeCertificate, createLocalCa, issueLocalLeaf } from '../dist/app/web/x509.js';
import { api } from '../dist/vendor/app-platform.js';
import { BrowserFleet } from '../dist/browser/fleet.js';
import { findBrowserExecutable } from '../dist/browser/browser.js';
import { TabControls } from '../dist/browser/tab-control.js';
import { projectAt } from '../dist/project/workspace.js';
import { temporaryDirectory, waitFor } from './helpers.mjs';

const actor = {
    role: 'owner',
    sessionId: 'owner-session',
    permissions: ['wallet.manage', 'browser.watch', 'browser.control'],
    stepUpFresh: true,
};
const target = { kind: 'request', id: 'request-1', step: 0 };

test('Wallet live sessions bind the gateway owner, request and lifetime of the tab', async (t) => {
    let released = 0;
    const tab = {
        id: 'tab-private',
        grant: 'private',
        over: false,
        view: () => ({ browser: 'project' }),
        authorized: (grant) => grant === 'private',
        endUse: async () => {
            released++;
        },
    };
    const origin = 'https://service.test';
    const live = new WalletLive(
        async (site, item) =>
            site === origin && item.step === 0
                ? { kind: 'open', binding: { origin, tab, target: item } }
                : { kind: 'problem', code: 'wallet-request-moved' },
        (site) => site === 'https://engine.test',
    );
    t.after(() => live.close());
    const open = (fields = {}, member = actor) =>
        live.route('openBrowserSignIn', member, {}, { origin, browser: null, wallet: target, ...fields });
    assert.equal((await open({}, { ...actor, stepUpFresh: false })).problem.code, 'step-up-required');
    assert.equal((await open({}, { ...actor, role: 'member' })).problem.code, 'forbidden');
    assert.equal((await open({}, { ...actor, permissions: ['wallet.manage', 'browser.control'] })).problem.code, 'forbidden');
    assert.equal((await open({ origin: 'https://engine.test' })).problem.code, 'browser-origin-refused');
    assert.equal((await open({ wallet: { ...target, step: 1 } })).problem.code, 'wallet-request-moved');
    const session = (await open()).data;
    assert.equal(api.BrowserSession.safeParse(session).success, true);
    assert.equal((await open()).problem.code, 'browser-busy');
    assert.equal(
        (await live.route('getBrowserSession', { ...actor, sessionId: 'different' }, { sessionId: session.id })).problem.code,
        'not-found',
    );
    assert.equal((await live.route('endBrowserSession', actor, { sessionId: session.id })).data.status, 'ended');
    await live.route('endBrowserSession', actor, { sessionId: session.id });
    assert.equal(released, 1);
});

const available =
    process.env.PTBK_TEST_BROWSER !== '0' &&
    (!process.env.CI || process.env.PTBK_TEST_BROWSER === '1') &&
    (await findBrowserExecutable({ variant: 'CHROME' }));

test(
    'A remote Wallet viewer completes an independent provider popup on the original project tab',
    { skip: !available, timeout: 60_000 },
    async (t) => {
        const clean = [],
            root = await temporaryDirectory(t, 'wallet-remote-provider', clean);
        const base = join(root, 'project');
        await mkdir(join(base, '.ptbk', 'tmp'), { recursive: true });
        const project = await projectAt(base);
        const tools = [
            { type: 'BROWSER', name: 'project-browser', variant: 'CHROME', profile: { source: 'PROJECT' }, isEnabled: true, isHeadless: true },
        ];
        const fleet = new BrowserFleet(
            project,
            () => ({ tools, overriddenTools: new Set() }),
            { ...process.env, PTBK_HOME: join(root, 'home'), CHROME_PATH: available },
            () => {},
            'wallet-live-test',
        );
        clean.push(() => fleet.close());
        await fleet.startEnabled();
        const browser = fleet.instance('project-browser');
        const link = await browser.link();
        // Disposable test profile and two loopback HTTPS fixtures. No credentials or external accounts.
        await link.send('Security.setIgnoreCertificateErrors', { ignore: true });
        const certificate = await createAcmeChallengeCertificate('localhost', 'fixture');
        const tls = { key: certificate.keyPem, cert: certificate.certificatePem };
        const listen = async (server) => {
            server.listen(0, '127.0.0.1');
            await once(server, 'listening');
            clean.push(async () => {
                server.closeAllConnections();
                server.close();
            });
            return 'https://127.0.0.1:' + server.address().port;
        };
        let relying, provider;
        const trusted = Promise.withResolvers();
        const button = '<style>body{margin:0}button{width:280px;height:100px;font-size:20px}</style>';
        provider = await listen(
            httpsServer(tls, (_req, res) => {
                res.setHeader('Content-Type', 'text/html');
                res.end(
                    button +
                        "<button onclick=\"opener.postMessage('account-selected','" +
                        relying +
                        '\');window.close()">owner@example.test</button>',
                );
            }),
        );
        relying = await listen(
            httpsServer(tls, (req, res) => {
                res.setHeader('Content-Type', 'text/html');
                if (req.url === '/provider-ready') {
                    void trusted.promise.then(() => res.end('ready'));
                    return;
                }
                if (req.url === '/account') return res.end('<main>Signed in as owner@example.test</main>');
                if (req.url === '/signed-in')
                    return res.end(
                        button + `<button onclick="location.href='/account'">Show account</button><main>Contact teamowner@example.test</main>`,
                    );
                res.end(
                    button +
                        "<button onclick=\"const chooser=open('about:blank','chooser','width=400,height=400');fetch('/provider-ready').then(()=>chooser.location='" +
                        provider +
                        '\')">Continue with Google</button><script>onmessage=e=>{if(e.origin==="' +
                        provider +
                        '"&&e.data==="account-selected")location.href="/signed-in"}</script>',
                );
            }),
        );
        const controls = new TabControls({ onChange: () => {}, log: () => {} });
        let settled = 0;
        const tab = await controls.open({
            browser,
            url: relying,
            purpose: 'wallet',
            wallet: {
                request: target.id,
                origin: relying,
                account: 'owner@example.test',
                offer: async () => ({ kind: 'none' }),
                save: async () => '',
                satisfy: async (access) => {
                    assert.equal(access.account, 'owner@example.test');
                    settled++;
                    return { resolved: true, reason: 'signed in' };
                },
            },
        });
        tab.claim();
        const live = new WalletLive(
            async () => ({ kind: 'open', binding: { origin: relying, tab, target } }),
            () => false,
            new Set([provider]),
        );
        clean.push(() => live.close());
        const opened = await live.route('openBrowserSignIn', actor, {}, { origin: relying, browser: null, wallet: target });
        assert.equal(opened.kind, 'ok');
        const id = opened.data.id;
        const transport = createServer();
        transport.on('upgrade', (req, socket) => live.upgrade(id, req, socket, () => actor));
        await listen(transport);
        const ws = new WebSocket('ws://127.0.0.1:' + transport.address().port, 'ptbk-live');
        ws.binaryType = 'arraybuffer';
        const origins = [];
        let shown = null,
            frame = 0;
        const send = (m) => ws.send(JSON.stringify(m));
        ws.onmessage = (e) => {
            if (typeof e.data === 'string') {
                const m = JSON.parse(e.data);
                if (m.type === 'navigated') {
                    origins.push(m.origin);
                    shown = null;
                }
                if (m.type === 'blocked') shown = null;
            } else {
                const media = api.decodeLiveMedia(new Uint8Array(e.data));
                assert.equal(media.kind, 'ok');
                frame++;
                shown = origins.at(-1);
                send({ type: 'frame-ack', seq: media.media.seq });
            }
        };
        await once(ws, 'open');
        send({ type: 'hello', versions: [1] });
        send({ type: 'view', visible: true, width: 640, height: 480 });
        clean.push(async () => ws.close());
        const click = () => {
            for (const action of ['down', 'up'])
                send({ type: 'input', event: { kind: 'pointer', action, button: 'left', x: 80, y: 45, clicks: 1 } });
        };
        await waitFor(() => shown === relying, { timeoutMs: 12_000, message: 'first remote frame' });
        const premature = await live.route('handBackBrowserTab', actor, { sessionId: id });
        assert.equal(premature.kind, 'problem');
        assert.equal(settled, 0);
        click();
        // The private fixture CA is trusted only in the disposable target. Chrome opens its chooser in a different target.
        let popup;
        await waitFor(
            async () => {
                popup = (await tab.signInPopups())[0];
                return Boolean(popup);
            },
            { timeoutMs: 8000, message: 'Chrome chooser target' },
        );
        const fixtureTarget = (await link.send('Target.attachToTarget', { targetId: popup.targetId, flatten: true })).sessionId;
        await link.send('Security.setIgnoreCertificateErrors', { ignore: true }, fixtureTarget);
        trusted.resolve();
        await waitFor(() => shown === provider, { timeoutMs: 15_000, message: 'provider popup' });
        click();
        await waitFor(() => shown === relying && origins.length >= 3, { timeoutMs: 12_000, message: 'return from popup' });
        const unrelated = await live.route('handBackBrowserTab', actor, { sessionId: id });
        assert.equal(unrelated.kind, 'problem', 'an email ending with the expected account cannot satisfy the request');
        assert.equal(settled, 0);
        const previousFrame = frame;
        click();
        await waitFor(() => frame > previousFrame + 1, { timeoutMs: 8000, message: 'confirmed account page' });
        const done = await live.route('handBackBrowserTab', actor, { sessionId: id });
        assert.equal(done.data?.status, 'ended', JSON.stringify(done));
        assert.equal(settled, 1);
        assert.ok(frame >= 3);
        assert.deepEqual(origins.slice(0, 3), [relying, provider, relying]);
    },
);

test('The TLS engine origin admits only the exact Wallet channel, same browser origin and opening owner session', async (t) => {
    const root = await temporaryDirectory(t, 'wallet-gateway'),
        hostname = 'wallet.engine.test';
    const { ca } = await createLocalCa('Wallet gateway fixture');
    const leaf = await issueLocalLeaf(ca, hostname);
    const keys = join(root, 'tls');
    await mkdir(keys, { mode: 0o700 });
    await writeFile(join(keys, hostname + '.pem'), leaf.certificatePem, { mode: 0o600 });
    await writeFile(join(keys, hostname + '.key.pem'), leaf.keyPem, { mode: 0o600 });
    const token = 'a'.repeat(22),
        other = 'b'.repeat(22),
        service = 'https://service.test';
    const tab = {
        id: 'tab-test',
        grant: 'private',
        view: () => ({ browser: 'project-browser' }),
        authorized: (g) => g === 'private',
        remoteAttached: () => {},
        viewerDetached: () => {},
        endUse: async () => {},
    };
    const live = new WalletLive(
        async () => ({ kind: 'open', binding: { origin: service, tab, target } }),
        () => false,
    );
    const access = {
        authenticate: (value) => (value === token ? actor : value === other ? { ...actor, sessionId: 'second' } : undefined),
        recordAudit: async () => {},
    };
    const engineApi = new EngineApi({
        agenda: {},
        projectRoot: root,
        stateDirectory: root,
        hostname: () => hostname,
        engineId: () => 'project',
        dashboardUrl: () => undefined,
        security: () => undefined,
        ui: () => ({}),
        walletLive: live,
        hasBrowser: () => true,
    });
    const gateway = new EngineOrigin({
        directory: root,
        hostname,
        certificateSource: 'acme',
        env: {},
        tunnelReady: () => false,
        onChange: () => {},
        engineId: 'project',
        fingerprint: 'fixture',
        api: (request, member) => engineApi.handle(request, member, access),
        documents: async () => new Response(),
        access,
        walletLive: live,
    });
    await gateway.start();
    const relay = tcpServer((socket) => {
        socket.peer = { address: '127.0.0.1', port: socket.remotePort };
        gateway.handleStream(socket);
    });
    relay.listen(0, '127.0.0.1');
    await once(relay, 'listening');
    t.after(async () => {
        await live.close();
        gateway.stop();
        relay.close();
    });
    const entry = await new Promise((resolve, reject) => {
        const request = httpsRequest(
            {
                hostname: '127.0.0.1',
                port: relay.address().port,
                servername: hostname,
                ca: ca.certificatePem,
                agent: false,
                path: '/api/v1/browser-sessions',
                method: 'POST',
                headers: {
                    Host: hostname,
                    Origin: 'https://' + hostname,
                    'Sec-Fetch-Site': 'same-origin',
                    Cookie: '__Host-ptbk_session=' + token,
                    'Content-Type': 'application/json',
                },
            },
            (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    body += chunk;
                });
                response.on('end', () => {
                    if (response.statusCode !== 201) return reject(new Error('Unexpected status ' + response.statusCode + ' ' + body));
                    resolve(JSON.parse(body));
                });
            },
        );
        request.once('error', reject);
        request.end(JSON.stringify({ origin: service, browser: null, wallet: target }));
    });
    const path = '/api/v1/live-sessions/' + entry.id + '/channel',
        site = 'https://' + hostname;
    async function upgrade(origin, credential, route = path) {
        return new Promise((resolve, reject) => {
            const req = httpsRequest({
                hostname: '127.0.0.1',
                port: relay.address().port,
                servername: hostname,
                ca: ca.certificatePem,
                path: route,
                method: 'GET',
                agent: false,
                headers: {
                    Host: hostname,
                    Origin: origin,
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                    'Sec-WebSocket-Protocol': 'ptbk-live',
                    'Sec-WebSocket-Version': '13',
                    'Sec-WebSocket-Key': 'MDEyMzQ1Njc4OUFCQ0RFRg==',
                    ...(credential ? { Cookie: '__Host-ptbk_session=' + credential } : {}),
                },
            });
            req.once('error', reject);
            req.once('response', (res) => {
                res.resume();
                resolve(res.statusCode);
            });
            req.once('upgrade', (res, socket) => {
                assert.equal(res.headers['sec-websocket-protocol'], 'ptbk-live');
                socket.destroy();
                resolve(res.statusCode);
            });
            req.end();
        });
    }
    assert.equal(await upgrade(site, null), 401);
    assert.equal(await upgrade('https://other.test', token), 403);
    assert.equal(await upgrade(site, other), 404);
    assert.equal(await upgrade(site, token, path + '?token=ignored'), 404);
    assert.equal(await upgrade(site, token), 101);
});
