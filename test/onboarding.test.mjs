import assert from 'node:assert/strict';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { loadEngineIdentity } from '../dist/app/identity.js';
import { ProjectOnboarding } from '../dist/app/onboarding.js';
import { parseLinkInput } from '../dist/app/registration.js';
import { appSettings } from '../dist/app/settings.js';
import { ensurePrivateDirectory, writePrivateFile } from '../dist/app/files.js';
import { fakeHarness, git, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

test('a link URL pins the intended App without exposing the code on rejection', () => {
    const code = 'a'.repeat(26);
    assert.deepEqual(parseLinkInput(`https://staging.example:8443/link#${code}`), { code, origin: 'https://staging.example:8443' });
    assert.throws(() => appSettings({ PTBK_DASHBOARD_URL: 'https://app.example' }, 'https://staging.example:8443'), /staging\.example.*app\.example/);
    for (const url of [`http://staging.example/link#${code}`, `https://user@staging.example/link#${code}`, `https://staging.example/link?x=#${code}`]) {
        assert.throws(() => parseLinkInput(url), (error) => !error.message.includes(code));
    }
});

test('App answers are authorized, exclusive and durably replayed with uploaded bytes', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk onboarding API');
    const onboarding = await ProjectOnboarding.open(directory);
    const prompt = { kind: 'text', frame: { title: 'Setup' }, question: 'What are you working on?', attachments: true };
    const displayed = onboarding.present(prompt);
    const engine = new EngineApi({
        onboarding, projectRoot: directory, stateDirectory: directory, engineId: () => undefined,
        hostname: () => undefined, dashboardUrl: () => undefined, security: () => undefined, ui: () => ({}),
    });
    const owner = { memberId: 'owner', permissions: ['files.read', 'files.write', 'settings.manage'] };
    const call = (route, options, actor = owner) => engine.handle(new Request(`https://engine.example/api/v1${route}`, options), actor, {});
    const forbidden = await call('/onboarding', {}, { ...owner, permissions: [] });
    assert.equal(forbidden.status, 403);
    const state = await (await call('/onboarding')).json();
    assert.equal(state.prompt.kind, 'text');
    const form = new FormData();
    form.set('file', new File(['file payload'], 'note.txt'));
    form.set('name', 'note.txt');
    form.set('purpose', 'upload');
    const upload = await call('/files', { method: 'POST', body: form });
    assert.equal(upload.status, 201, await upload.clone().text());
    const { id } = await upload.json();
    const body = JSON.stringify({ promptId: state.prompt.id, action: 'answer', answer: { kind: 'text', text: 'A private brief', fileIds: [id] } });
    const post = () => call('/onboarding/answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    const results = await Promise.all([post(), post()]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
    const answer = await displayed;
    assert.equal(await readFile(answer.value[1].path, 'utf8'), 'file payload');
    await onboarding.defer();
    const restored = await ProjectOnboarding.open(directory);
    assert.equal(restored.state().deferred, true);
    assert.deepEqual(await restored.present(prompt), answer);
});

test('the detached CLI continues after restart and starts exactly one project with the original App identity', async (t) => {
    const beforeRemoval = [];
    const root = await temporaryDirectory(t, 'ptbk pending launch', beforeRemoval);
    const { env } = await fakeHarness(t, root);
    const id = 'test-setup';
    const workspace = join(env.PTBK_HOME, 'initializations', id);
    const projectsHome = join(root, 'projects');
    await ensurePrivateDirectory(workspace);
    await mkdir(projectsHome);
    await writePrivateFile(workspace, 'pending-project.json', JSON.stringify({ id, projectsHome }));
    const run = (args, input) => ptbk(args, { cwd: root, env, input, timeoutMs: 35_000 });
    const prepare = () => run(['init', '--prepare-only', '--initialization', id, '--no-persist', '--json']);
    const stop = (path) => run(['stop', '--force', '--path', path, '--raw']);
    beforeRemoval.push(() => stop(workspace));
    const show = async () => {
        const result = await run(['onboarding', id, '--json']);
        if (result.code !== 0) return undefined;
        return JSON.parse(result.stdout);
    };
    const next = (id) => waitFor(async () => {
        const state = await show();
        return state && (state.status === 'completed' || state.prompt?.id && state.prompt.id !== id) ? state : undefined;
    }, { timeoutMs: 25_000, message: 'the next onboarding prompt' });
    const answer = async (prompt, payload) => {
        const result = await run(['onboarding', id, '--answer-stdin'], JSON.stringify({ promptId: prompt.id, action: 'answer', answer: payload }));
        assert.equal(result.code, 0, result.output);
    };

    const started = await prepare();
    assert.equal(started.code, 0, started.output);
    assert.deepEqual(await readdir(projectsHome), []);
    const identity = await loadEngineIdentity(join(workspace, '.ptbk', 'app'), { create: false });
    assert.ok(identity);
    let state = await next();
    assert.equal(state.prompt.kind, 'text');
    await answer(state.prompt, { kind: 'text', text: 'Prepare a project for restoring onboarding.' });
    state = await next(state.prompt.id);
    assert.equal(state.prompt.kind, 'choice');
    const selected = state.prompt.question;
    const stopped = await stop(workspace);
    assert.equal(stopped.code, 0, stopped.output);
    assert.equal((await prepare()).code, 0);
    state = await next();
    assert.equal(state.prompt.question, selected);
    for (let i = 0; i < 20 && state.status !== 'completed'; i++) {
        const prompt = state.prompt;
        assert.ok(prompt, JSON.stringify(state));
        assert.notEqual(prompt.title, 'Project setup needs attention', prompt.hint);
        assert.equal(prompt.kind, 'choice', JSON.stringify(prompt));
        await answer(prompt, { kind: 'choice', choiceIds: prompt.initial });
        state = await next(prompt.id);
    }
    assert.equal(state.status, 'completed');
    const { target } = JSON.parse(await readFile(join(workspace, 'pending-project.json'), 'utf8'));
    assert.ok(target);
    beforeRemoval.push(() => stop(target));
    const targetIdentity = await waitFor(async () => await loadEngineIdentity(join(target, '.ptbk', 'app'), { create: false }), { message: 'original App identity at final project' });
    assert.equal(targetIdentity.engineId, identity.engineId);
    assert.match(await readFile(join(target, 'specs', '_initial.md'), 'utf8'), /restoring onboarding/);
    assert.equal((await readdir(projectsHome)).filter((name) => !name.startsWith('.')).length, 1);
    const files = await git(target, ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', 'HEAD']);
    const commits = await git(target, ['log', '--format=%s']);
    assert.equal(commits.split('\n').filter((line) => line === 'ptbk: Initialize project').length, 1);
    assert.ok(files.length > 0);
});
