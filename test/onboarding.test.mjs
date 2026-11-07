import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { loadEngineIdentity } from '../dist/app/identity.js';
import { parseAppLink, readRegistration, storeRegistration } from '../dist/app/registration.js';
import { appSettings } from '../dist/app/settings.js';
import { onboardingPage } from '../dist/app/web/onboarding-page.js';
import { AccessStore } from '../dist/app/web/access.js';
import { harnessLoginMethods } from '../dist/harness/maintenance.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { readOnboarding, saveOnboarding } from '../dist/onboarding/draft.js';
import { OnboardingSession } from '../dist/onboarding/session.js';
import { OnboardingUploads } from '../dist/onboarding/uploads.js';
import { projectAt } from '../dist/project/workspace.js';
import { lookupService } from '../dist/service/control.js';
import { launchDaemon, stopService } from '../dist/service/launcher.js';
import { fakeHarness, git, temporaryDirectory, waitFor } from './helpers.mjs';

/** A temporary pending service, outside any project's worktree. */
async function pending(t, cleanup = []) {
    const home = await temporaryDirectory(t, 'ptbk onboarding', cleanup);
    const parent = join(home, '.ptbk-onboarding');
    const initial = projectAt(join(parent, 'temporary'));
    await mkdir(initial.root, { recursive: true, mode: 0o700 });
    const identity = await loadEngineIdentity(initial.runtime.app, { create: true });
    const project = projectAt(join(parent, identity.engineId));
    await rename(initial.root, project.root);
    const draft = { version: 1, engineId: identity.engineId, step: 'intent', promptId: randomUUID(), deferred: false };
    await saveOnboarding(project, draft);
    return { home, project, draft, identity };
}

/** Constructs an answer to the exact currently displayed prompt. */
function answer(state, value) {
    return { promptId: state.prompt.id, action: 'answer', answer: value };
}

test('an HTTPS pairing URL supplies the dashboard and its origin survives a fresh process', async (t) => {
    const { project, identity } = await pending(t);
    const code = 'a'.repeat(26);
    const origin = 'https://dashboard.example.test:444';
    const link = origin + '/link#' + code;
    assert.deepEqual(parseAppLink(link, {}).linkCode, code);
    assert.equal(parseAppLink(link, {}).settings.dashboardUrl, origin);
    assert.throws(() => parseAppLink(link, { PTBK_DASHBOARD_URL: 'https://another.example.test' }), /different origin/);
    for (const invalid of [link.replace('https:', 'http:'), link.replace('/link', '/wrong'), link.replace('/link#', '/link?token=abc#'), link.replace('dashboard.', 'user@dashboard.')]) {
        assert.throws(() => parseAppLink(invalid, {}), /complete HTTPS pairing URL/);
    }
    const engineDomain = 'engines.example.test';
    await storeRegistration(project.runtime.app, { v: 1, engineId: identity.engineId, engineDomain, hostname: identity.engineId + '.' + engineDomain,
        dashboardUrl: origin, relays: ['relay.example.test'], registeredAt: new Date().toISOString() });
    assert.equal((await readRegistration(project.runtime.app, identity, appSettings({}))).dashboardUrl, origin);
});

test('onboarding API keeps uploads and answers private, rejects stale clients, and resumes the next step from disk', async (t) => {
    const { project, draft } = await pending(t);
    const uploads = new OnboardingUploads(join(project.root, 'uploads'));
    const session = new OnboardingSession(project, draft, uploads, {}, async () => assert.fail('not confirmed'));
    const access = await AccessStore.open(project.runtime.app);
    const engine = new EngineApi({ onboarding: session, projectRoot: project.root, stateDirectory: project.runtime.app, engineId: () => draft.engineId,
        hostname: () => draft.engineId + '.engines.example.test', dashboardUrl: () => null, security: () => undefined, ui: () => ({}) });
    const owner = { memberId: 'owner', role: 'owner', permissions: ['settings.manage', 'files.read', 'files.write'] };
    const outsider = { memberId: 'guest', role: 'member', permissions: ['files.read', 'files.write'] };
    const call = (route, init, actor = owner) => engine.handle(new Request('https://engine.example.test/api/v1' + route, init), actor, access);
    const before = await (await call('/onboarding')).json();
    assert.equal(before.prompt.kind, 'text');
    const body = new FormData();
    body.append('file', new Blob(['example attachment'], { type: 'text/plain' }), 'brief.txt');
    body.append('name', 'brief.txt');
    body.append('purpose', 'upload');
    const upload = { method: 'POST', body };
    assert.equal((await call('/files', upload, outsider)).status, 403);
    const uploaded = await call('/files', upload);
    assert.equal(uploaded.status, 201, await uploaded.clone().text());
    const file = await uploaded.json();
    const downloaded = await call('/files/' + file.id + '/content');
    assert.equal(await downloaded.text(), 'example attachment');
    assert.equal(downloaded.headers.get('content-disposition'), 'attachment');
    const response = answer(before, { kind: 'text', text: 'Keep this verbatim.', fileIds: [file.id] });
    const post = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(response) };
    const competing = await Promise.all([call('/onboarding/answer', post), call('/onboarding/answer', post)]);
    assert.deepEqual(competing.map((result) => result.status).sort(), [200, 409]);
    assert.equal((await call('/files/' + file.id, { method: 'DELETE' })).status, 403);
    await call('/onboarding/defer', { method: 'POST' });
    const saved = await readOnboarding(project);
    const reattached = new OnboardingSession(project, saved, uploads, {}, async () => assert.fail('not confirmed'));
    assert.equal(reattached.state().deferred, true);
    assert.equal(reattached.state().prompt.kind, 'choice');
    assert.deepEqual(saved.fileIds, [file.id]);
    assert.equal(saved.intent, 'Keep this verbatim.');
    await reattached.answer({ promptId: reattached.state().prompt.id, action: 'back' });
    assert.equal(reattached.state().prompt.initial, saved.intent);
    assert.equal(reattached.state().deferred, false);
});

test('the daemon waits without a project, restores a draft, then publishes one agenda under the same engine identity', { timeout: 90_000 }, async (t) => {
    const cleanup = [];
    const { home, project, identity } = await pending(t, cleanup);
    const { env } = await fakeHarness(t, home);
    const root = join(home, 'project-result');
    const finalProject = projectAt(root);
    cleanup.push(() => stopService(project, { force: true }), () => stopService(finalProject, { force: true }));
    const run = () => launchDaemon(project, { env, cli: {}, persistent: false, onboarding: true });
    const first = await run();
    const client = first.lookup.client;
    const state = async (target = client) => (await target.request('onboarding-state')).onboarding;
    await assert.rejects(stat(root), { code: 'ENOENT' });
    assert.equal((await client.request('app-status')).engineId, identity.engineId);
    const filePath = join(home, 'brief.txt');
    await writeFile(filePath, 'A private attachment.');
    const uploaded = await client.request('onboarding-upload', { path: filePath });
    await client.request('onboarding-answer', answer(await state(), { kind: 'text', text: 'Create a newsletter.', fileIds: [uploaded.id] }));
    await client.request('onboarding-defer');
    await client.request('stop');
    await waitFor(async () => (await lookupService(project)).state === 'stopped', { timeoutMs: 10_000 });
    const second = (await run()).lookup.client;
    assert.equal((await state(second)).deferred, true);
    await second.request('onboarding-answer', answer(await state(second), { kind: 'choice', choiceIds: ['openai-codex'] }));
    await waitFor(async () => (await state(second)).prompt?.title === 'Project name', { timeoutMs: 15_000 });
    const name = await state(second);
    await second.request('onboarding-answer', answer(name, { kind: 'text', text: 'Project result', fileIds: [] }));
    await second.request('onboarding-answer', answer(await state(second), { kind: 'text', text: 'project-result', fileIds: [] }));
    await assert.rejects(stat(root), { code: 'ENOENT' });
    await second.request('onboarding-answer', answer(await state(second), { kind: 'confirm', confirmed: true }));
    await waitFor(async () => {
        const saved = await readOnboarding(project);
        if (saved.error) throw new Error(saved.error);
        return saved.step === 'done';
    }, { timeoutMs: 25_000 });
    const linked = await loadEngineIdentity(finalProject.runtime.app, { create: false });
    assert.equal(linked.engineId, identity.engineId);
    assert.equal((await lookupService(finalProject)).state, 'running');
    assert.equal((await readFile(join(root, 'specs', '_initial.md'), 'utf8')).trim(), 'Create a newsletter.\n\n[brief.txt](_initial/brief.txt)');
    assert.equal(await readFile(join(root, 'specs', '_initial', 'brief.txt'), 'utf8'), 'A private attachment.');
    const firstCommit = (await git(root, ['rev-list', '--max-parents=0', 'HEAD'])).trim();
    const initialTree = await git(root, ['ls-tree', '-r', '--name-only', firstCommit]);
    assert.equal(initialTree.split('\n').filter((path) => /^tasks\/[^/]+\.book$/.test(path)).length, 1);
    assert.equal((await readdir(home)).filter((name) => name.startsWith('project-result')).length, 1);
});

test('the Codex adapter presents the native device challenge without exposing other CLI output', async (t) => {
    const root = await temporaryDirectory(t);
    const { env } = await fakeHarness(t, root);
    const [method] = await harnessLoginMethods(harnessPlugin('openai-codex'), { env, projectRoot: root }, 'remote');
    const url = 'https://auth.openai.com/codex/device';
    const native = 'Open this link in your browser\n' + url + '\n2. Enter this one-time code (expires in 15 minutes)\n  \u001b[94mFAKE-C0DE\u001b[0m\nOther untrusted CLI output';
    assert.deepEqual(method.deviceChallenge(native), { url, userCode: 'FAKE-C0DE' });
    assert.equal(method.deviceChallenge(native.replace(url, 'https://example.test/')), undefined);
});

test('the engine ships a same-origin onboarding script for hosts without a verified App UI', async () => {
    const page = await onboardingPage(new Request('https://engine.example.test/'));
    assert.match(await page.text(), /<script type="module" src="\/_ptbk\/onboarding\.js"><\/script>/);
    const script = await onboardingPage(new Request('https://engine.example.test/_ptbk/onboarding.js'));
    assert.match(script.headers.get('content-type'), /javascript/);
    assert.doesNotMatch(await script.text(), /innerHTML|eval\(/);
});
