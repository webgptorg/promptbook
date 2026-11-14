import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseModelRow } from '../dist/book/model.js';
import { HarnessPool } from '../dist/engine/harnesses.js';
import { routeConcrete } from '../dist/engine/routing.js';
import { billingOf } from '../dist/engine/usage.js';
import { functionalCheck } from '../dist/harness/preparation.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { HarnessSessions } from '../dist/harness/sessions.js';
import { activeConsumers, registerConsumer, withHostOperation } from '../dist/inference/host.js';
import { recommendLocalModel } from '../dist/inference/catalog.js';
import { ollamaAdapter } from '../dist/inference/ollama.js';
import { resolveSettings } from '../dist/project/config.js';
import { applyConfigurationMigration, planConfigurationMigration } from '../dist/project/migrations.js';
import { parseTools } from '../dist/tools/normalize.js';
import { planToolOperation } from '../dist/tools/operations.js';
import { fakeHarness, git, initializedProject, initRepository, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';
import { projectAt } from '../dist/project/workspace.js';
import { ControlClient } from '../dist/service/control.js';
import { readProcessRecord } from '../dist/service/records.js';

/** A downloaded local model as Ollama lists it. */
const LOCAL_MODEL = { name: 'gpt-oss:20b', model: 'gpt-oss:20b', size: 13_780_173_839, digest: 'aa4295ac10c3afb60e6d711289fc6896f5aef82258997b9efdaed6d0cc4cd8b8', details: { family: 'gptoss', parameter_size: '20.9B', quantization_level: 'MXFP4' } };

/** A cloud model listed by the same local service (never local execution). */
const CLOUD_MODEL = { name: 'gpt-oss:120b-cloud', model: 'gpt-oss:120b-cloud', remote_model: 'gpt-oss:120b', remote_host: 'https://ollama.com:443', details: { family: 'gptoss', parameter_size: '116.8B' } };

/**
 * A deterministic stand-in of the Ollama HTTP API on loopback (no real models, no inference).
 * `pulls` decides how a pull stream ends: `complete` confirms it, `interrupted` stops before success.
 */
async function fakeOllama(t, { version = '0.15.2', models = [LOCAL_MODEL, CLOUD_MODEL] } = {}) {
    const state = { models: [...models], pulls: 'complete', requests: [] };
    const server = createServer((request, response) => {
        let body = '';
        request.setEncoding('utf8').on('data', (chunk) => (body += chunk));
        request.on('end', () => {
            const url = new URL(request.url, 'http://fake');
            const data = body ? JSON.parse(body) : undefined;
            state.requests.push({ method: request.method, path: url.pathname, body: data });
            const json = (value) => {
                response.writeHead(200, { 'content-type': 'application/json' });
                response.end(JSON.stringify(value));
            };
            if (url.pathname === '/api/version') return json({ version });
            if (url.pathname === '/api/tags') return json({ models: state.models });
            if (url.pathname === '/api/ps') return json({ models: [] });
            if (url.pathname === '/api/show') return json({ capabilities: ['completion', 'tools', 'thinking'], model_info: { 'gptoss.context_length': 131072 } });
            if (url.pathname === '/api/pull') {
                response.writeHead(200, { 'content-type': 'application/x-ndjson' });
                response.write(`${JSON.stringify({ status: 'pulling manifest' })}\n`);
                response.write(`${JSON.stringify({ status: 'pulling 0123', total: 100, completed: 50 })}\n`);
                if (state.pulls === 'complete') {
                    response.write(`${JSON.stringify({ status: 'pulling 0123', total: 100, completed: 100 })}\n`);
                    response.write(`${JSON.stringify({ status: 'success' })}\n`);
                    state.models.push({ name: data.model, model: data.model, size: 100, digest: 'f'.repeat(64), details: { family: 'gptoss' } });
                }
                return response.end();
            }
            if (url.pathname === '/api/delete') {
                state.models = state.models.filter((model) => model.name !== data.model);
                return json({});
            }
            if (url.pathname === '/api/generate') return json({ done: true });
            response.writeHead(404).end();
        });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const close = () => new Promise((resolve) => (server.listening ? server.close(() => resolve()) : resolve()));
    t.after(close);
    server.closeAllConnections?.();
    return { url: `http://127.0.0.1:${server.address().port}`, state, close: async () => (server.closeAllConnections?.(), await close()) };
}

/** A runtime record and the managed local Codex connection bound to it. */
function localTools(endpoint) {
    return [
        { type: 'INFERENCE_RUNTIME', variant: 'OLLAMA', name: 'local-ollama', endpoint },
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex-local', authentication: 'NONE', baseUrl: 'LOCAL', inferenceRuntime: 'local-ollama' },
    ];
}

/** A pool over the fake Codex and a fake Ollama service, with an ambient key that must never reach the local route. */
async function localPool(t, options) {
    const root = await temporaryDirectory(t);
    const { env } = await fakeHarness(t, root);
    env.OPENAI_API_KEY = 'sk-ambient-must-not-leak';
    const ollama = await fakeOllama(t, options);
    const pool = new HarnessPool(root, resolveSettings({ file: { tools: localTools(ollama.url) } }), env);
    await pool.refresh();
    return { root, env, pool, ollama };
}

/** Routes one MODEL row for Developer through the pool. */
async function route(pool, text) {
    const { row, problems } = parseModelRow(text);
    assert.deepEqual(problems, [], text);
    return await routeConcrete({ name: 'Developer' }, row, { pool, catalog: undefined, settings: undefined });
}

test('local models: runtime records and credential-free connections normalize; invalid bindings are explicit, never guessed', () => {
    const parsed = parseTools([{ type: 'inference_runtime', variant: 'ollama', name: 'Local Ollama', endpoint: 'http://127.0.0.1:11434/' }, ...localTools().slice(1).map((tool) => ({ ...tool, inferenceRuntime: 'local-ollama' }))]);
    assert.deepEqual(parsed.problems.filter((problem) => problem.severity === 'error'), []);
    assert.deepEqual(parsed.tools[0], { type: 'INFERENCE_RUNTIME', variant: 'OLLAMA', name: 'local-ollama', isEnabled: true, endpoint: 'http://127.0.0.1:11434' });
    assert.equal(parsed.tools[1].inferenceRuntime, 'local-ollama');
    assert.equal(parsed.tools[1].authentication, 'NONE');

    const errors = (tools) => parseTools(tools).problems.filter((problem) => problem.severity === 'error');
    assert.ok(errors([{ ...localTools()[1], baseUrl: 'OFFICIAL' }]).length, 'a runtime binding needs baseUrl LOCAL');
    assert.ok(errors([{ type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex', authentication: 'NONE' }]).length, 'credential-free on the official endpoint is invalid');
    assert.ok(errors([{ type: 'INFERENCE_RUNTIME', variant: 'OLLAMA', name: 'o', endpoint: 'http://user:secret@127.0.0.1:11434' }]).length, 'no credentials in a service URL');

    const dangling = parseTools([localTools()[1]]);
    assert.equal(dangling.tools.length, 1, 'a dangling reference keeps its record (unusable, with a cause)');
    assert.ok(dangling.problems.some((problem) => problem.severity === 'warning' && /local-ollama/.test(problem.message)));
});

test('local models: setup saves the runtime and its connection together; renaming a runtime rewrites its references; removal never rebinds', () => {
    const added = planToolOperation([], { kind: 'add-together', summary: 'Set up local models', tools: [{ type: 'INFERENCE_RUNTIME', variant: 'OLLAMA', name: 'local-ollama' }, { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex-local', authentication: 'NONE', baseUrl: 'LOCAL', inferenceRuntime: 'local-ollama' }] });
    assert.equal(added.tools.length, 2, 'one plan (one commit) with both records');
    assert.equal(added.tools[1].inferenceRuntime, 'local-ollama');

    assert.throws(() => planToolOperation([], { kind: 'add', tool: { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex-local', authentication: 'NONE', baseUrl: 'LOCAL', inferenceRuntime: 'missing' } }), /No local model runtime is named "missing"/);

    const renamed = planToolOperation(added.tools, { kind: 'modify', name: 'local-ollama', changes: {}, rename: 'ollama' });
    assert.equal(renamed.tools[0].name, 'ollama');
    assert.equal(renamed.tools[1].inferenceRuntime, 'ollama', 'the dependent connection follows the rename in the same change');

    const removed = planToolOperation(added.tools, { kind: 'remove', name: 'local-ollama' });
    assert.deepEqual(removed.tools.map((tool) => tool.name), ['codex-local'], 'removing a runtime never removes or rebinds its connection implicitly');
    assert.equal(removed.tools[0].inferenceRuntime, 'local-ollama');
});

test('local models: readiness, catalog and route come from the runtime; cloud entries never satisfy runtime=local; a stopped service is a wait', async (t) => {
    const { pool, ollama } = await localPool(t);
    const inspection = pool.inspectionOf('codex-local');
    assert.equal(inspection.usable, true, inspection.summary);
    assert.equal(inspection.authentication, 'local');
    assert.ok((await pool.models('codex-local')).includes('gpt-oss:20b'), 'the connection-scoped catalog is the runtime’s');

    const instance = pool.instance('codex-local');
    const localRoute = pool.localRoute(instance, 'gpt-oss:20b');
    assert.equal(localRoute.protocolUrl, `${ollama.url}/v1`);
    assert.equal(localRoute.model.digest, LOCAL_MODEL.digest);
    assert.equal(pool.modelLocality('codex-local', 'gpt-oss:20b'), 'local');
    assert.equal(pool.modelLocality('codex-local', 'gpt-oss:120b-cloud'), 'cloud');

    const routed = await route(pool, 'harness=OPENAI_CODEX model=gpt-oss:20b runtime=local');
    assert.equal(routed.kind, 'routable', routed.reason);
    assert.equal(routed.selection.tool, 'codex-local');
    assert.equal(routed.selection.locality, 'local');
    assert.equal(routed.selection.localRoute.protocolUrl, `${ollama.url}/v1`);

    const cloud = await route(pool, 'harness=OPENAI_CODEX model=gpt-oss:120b-cloud runtime=local');
    assert.equal(cloud.kind, 'incompatible', 'a cloud model behind the local service is never local execution');

    const notDownloaded = await route(pool, 'harness=OPENAI_CODEX model=gpt-oss:120b runtime=local');
    assert.equal(notDownloaded.kind, 'blocked', 'a known model not downloaded yet is a resource wait');
    assert.match(notDownloaded.next, /ptbk tool runtime local-ollama download gpt-oss:120b/);

    const unknown = await route(pool, 'harness=OPENAI_CODEX model=no-such-model:1b runtime=local');
    assert.equal(unknown.kind, 'incompatible');
    assert.match(unknown.next ?? '', /download/);

    await ollama.close();
    pool.runtimes.invalidate();
    await pool.refresh();
    const stopped = await route(pool, 'harness=OPENAI_CODEX model=gpt-oss:20b runtime=local');
    assert.equal(stopped.kind, 'blocked', 'a stopped runtime waits, never falls back to a hosted endpoint');
    assert.match(stopped.next, /ptbk tool runtime local-ollama start/);
    assert.equal(pool.inspectionOf('codex-local').usable, false);
});

test('local models: downloads report progress and an interrupted download is never reported as installed', async (t) => {
    const ollama = await fakeOllama(t, { models: [] });
    const context = { tool: localTools(ollama.url)[0], env: process.env };
    const empty = await ollamaAdapter.inspect(context);
    assert.equal(empty.problem, 'no-models');
    const progress = [];
    await ollamaAdapter.download(context, 'gpt-oss:20b', (item) => progress.push(item));
    assert.ok(progress.some((item) => item.stage === 'downloading' && item.totalBytes === 100));
    assert.equal(progress.at(-1).stage, 'downloaded');
    assert.ok((await ollamaAdapter.inspect(context)).models.some((model) => model.id === 'gpt-oss:20b' && model.locality === 'local'));

    ollama.state.pulls = 'interrupted';
    await assert.rejects(ollamaAdapter.download(context, 'gpt-oss:120b', () => undefined), /without confirming/);
    assert.ok(!(await ollamaAdapter.inspect(context)).models.some((model) => model.id === 'gpt-oss:120b'));
});

test('local models: Codex runs through its own per-invocation provider, without credentials or a forced login', async (t) => {
    const { root, env, pool, ollama } = await localPool(t);
    const log = join(root, 'preparation.log');
    const instance = pool.instance('codex-local');
    const check = await functionalCheck({
        plugin: harnessPlugin('openai-codex'),
        inspection: pool.inspectionOf('codex-local'),
        env: { ...pool.context('codex-local').env, FAKE_CODEX_PREPARATION_LOG: log, FAKE_CODEX_LOG: env.FAKE_CODEX_LOG },
        model: 'gpt-oss:20b',
        localRoute: pool.localRoute(instance, 'gpt-oss:20b'),
    });
    assert.equal(check.ok, true, check.summary);
    const [call] = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(call.config.model_provider, '"ptbk_local"');
    assert.equal(call.config['model_providers.ptbk_local.base_url'], `"${ollama.url}/v1"`);
    assert.equal(call.config['model_providers.ptbk_local.wire_api'], '"responses"');
    assert.equal(call.config.forced_login_method, undefined, 'the ChatGPT/API login method is never forced or changed');
    assert.equal(call.apiKey, false, 'no ambient API key reaches the local route');
    assert.ok(!call.args.includes('--oss'), 'no --oss (it could pull models implicitly)');
});

test('local models: usage is local only for verified local execution; hardware recommendations stay honest', () => {
    assert.equal(billingOf('local', 'local'), 'local');
    assert.equal(billingOf('local', 'cloud'), 'unknown', 'a cloud model through a local runtime is not free local execution');
    assert.equal(billingOf('local', 'unknown'), 'unknown');
    assert.equal(billingOf('account'), 'subscription');

    const gib = 1024 ** 3;
    const host = (memory, disk) => ({ platform: 'darwin', architecture: 'arm64', cpuCount: 8, totalMemoryBytes: memory * gib, freeMemoryBytes: memory * gib, inferenceMemoryBytes: memory * gib, freeDiskBytes: disk * gib, accelerator: { kind: 'unified', name: 'Apple M3' }, summary: '' });
    assert.equal(recommendLocalModel(host(32, 200), 'OLLAMA', 'OPENAI_CODEX', []).combination?.model, 'gpt-oss:20b');
    assert.equal(recommendLocalModel(host(128, 500), 'OLLAMA', 'OPENAI_CODEX', []).combination?.model, 'gpt-oss:120b');
    assert.equal(recommendLocalModel(host(128, 500), 'OLLAMA', 'OPENAI_CODEX', [{ id: 'gpt-oss:20b', installed: true, locality: 'local', tools: true, vision: false }]).combination?.model, 'gpt-oss:20b', 'an already-downloaded model is preferred');
    const small = recommendLocalModel(host(8, 200), 'OLLAMA', 'OPENAI_CODEX', []);
    assert.equal(small.combination, undefined);
    assert.ok(small.incompatibility, 'too little memory is an honest incompatibility, not a degraded promise');
});

test('local models: host-wide consumers are visible across engines and maintenance of one service is serialized', async (t) => {
    const root = await temporaryDirectory(t);
    const env = { ...process.env, PTBK_HOME: join(root, 'ptbk home') };
    const release = await registerConsumer(env, { resourceKey: 'OLLAMA@loopback:11434', project: root, tool: 'codex-local', model: 'gpt-oss:20b', purpose: 'task' });
    assert.equal((await activeConsumers(env, 'OLLAMA@loopback:11434')).length, 1);
    assert.equal((await activeConsumers(env, 'OLLAMA@loopback:9999')).length, 0);
    await release();
    assert.equal((await activeConsumers(env, 'OLLAMA@loopback:11434')).length, 0);

    const order = [];
    let waited = false;
    const first = withHostOperation(env, { key: 'OLLAMA@loopback:11434', label: 'download gpt-oss:20b' }, async () => {
        order.push('first:start');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        order.push('first:end');
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const second = withHostOperation(env, { key: 'OLLAMA@loopback:11434', label: 'download gpt-oss:20b' }, async () => order.push('second'), { onWait: () => (waited = true) });
    await Promise.all([first, second]);
    assert.deepEqual(order, ['first:start', 'first:end', 'second']);
    assert.ok(waited, 'the second engine saw who holds the operation');
});

test('local models: a session continues only on its exact local binding', () => {
    const sessions = new HarnessSessions({ save: async () => undefined });
    const plugin = { id: 'openai-codex', displayName: 'OpenAI Codex' };
    const binding = (digest) => ({ runtime: 'local-ollama', runtimeVariant: 'OLLAMA', endpoint: 'http://127.0.0.1:11434/v1', runtimeVersion: '0.15.2', model: 'gpt-oss:20b', digest, locality: 'local' });
    const descriptor = (connection) => ({ key: 'chat:Plan:Chatter', agent: 'Chatter', work: { kind: 'chat', chat: 'Plan' }, tool: 'codex-local', plugin, authentication: 'local', connection });
    const first = sessions.open(descriptor(binding('a'.repeat(64))));
    sessions.capabilities(first.key, { continueInput: true });
    sessions.observe(first.key, { type: 'session', id: 'thread-1' });
    assert.equal(sessions.continuable(first.key, 'codex-local', binding('a'.repeat(64))), 'thread-1');
    assert.equal(sessions.continuable(first.key, 'codex-local', binding('b'.repeat(64))), undefined, 'another model digest never resumes the old context');
    const same = sessions.open(descriptor(binding('a'.repeat(64))));
    assert.equal(same.handle, first.handle);
    const replaced = sessions.open(descriptor(binding('b'.repeat(64))));
    assert.notEqual(replaced.handle, first.handle);
    assert.match(replaced.predecessor.reason, /local connection binding changed/);
});

test('local models: `ptbk tool setup-local` prepares, verifies and saves the runtime and connection in one commit; `tool runtime` inspects and maintains it', async (t) => {
    const { project, env } = await initializedProject(t);
    const ollama = await fakeOllama(t, { models: [CLOUD_MODEL] });
    const commitsBefore = Number((await git(project, ['rev-list', '--count', 'HEAD'])).trim());

    const refused = await ptbk(['tool', 'setup-local', '--runtime', 'ollama', '--endpoint', ollama.url, '--model', 'tiny-model:1b', '--json'], { cwd: project, env });
    assert.equal(refused.code, 3, refused.output);
    assert.equal(JSON.parse(refused.stdout).status, 'needs-consent', 'a download is never started without consent');
    assert.ok(!ollama.state.requests.some((request) => request.path === '/api/pull'));

    const setup = await ptbk(['tool', 'setup-local', '--runtime', 'ollama', '--endpoint', ollama.url, '--model', 'tiny-model:1b', '--yes', '--json'], { cwd: project, env });
    assert.equal(setup.code, 0, setup.output);
    const outcome = JSON.parse(setup.stdout);
    assert.equal(outcome.status, 'ready', outcome.summary);
    assert.equal(outcome.check.ok, true);
    assert.deepEqual(Object.fromEntries(outcome.capabilities.map((capability) => [capability.name, capability.outcome])), { 'scratch-file': 'supported', 'read-only': 'supported', continuation: 'supported', mcp: 'unknown' });
    assert.equal(outcome.saved.status, 'applied');
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    const runtime = config.tools.find((tool) => tool.type === 'INFERENCE_RUNTIME');
    const connection = config.tools.find((tool) => tool.inferenceRuntime === runtime.name);
    assert.deepEqual({ name: runtime.name, variant: runtime.variant, endpoint: runtime.endpoint }, { name: 'local-ollama', variant: 'OLLAMA', endpoint: ollama.url });
    assert.deepEqual({ name: connection.name, authentication: connection.authentication, baseUrl: connection.baseUrl }, { name: 'codex-local', authentication: 'NONE', baseUrl: 'LOCAL' });
    assert.ok(config.tools.some((tool) => tool.type === 'HARNESS' && tool.name !== 'codex-local' && tool.authentication !== 'NONE'), 'the existing subscription connection is kept');
    assert.equal(Number((await git(project, ['rev-list', '--count', 'HEAD'])).trim()), commitsBefore + 1, 'one scoped commit for both records');

    const again = await ptbk(['tool', 'setup-local', '--runtime', 'ollama', '--endpoint', ollama.url, '--model', 'tiny-model:1b', '--yes', '--json', '--quick'], { cwd: project, env });
    assert.equal(again.code, 0, again.output);
    assert.equal(JSON.parse(again.stdout).saved, undefined, 'a repeated setup reuses the records without duplicates');
    assert.equal(Number((await git(project, ['rev-list', '--count', 'HEAD'])).trim()), commitsBefore + 1);

    const models = await ptbk(['tool', 'runtime', 'local-ollama', 'models', '--json'], { cwd: project, env });
    assert.equal(models.code, 0, models.output);
    const listed = JSON.parse(models.stdout);
    assert.deepEqual(listed.models.map((model) => [model.id, model.locality]), [['gpt-oss:120b-cloud', 'cloud'], ['tiny-model:1b', 'local']]);
    assert.deepEqual(listed.dependents, ['codex-local']);

    const remove = await ptbk(['tool', 'runtime', 'local-ollama', 'remove-model', 'tiny-model:1b'], { cwd: project, env });
    assert.equal(remove.code, 3, 'deleting weights needs --yes');
    const removed = await ptbk(['tool', 'runtime', 'local-ollama', 'remove-model', 'tiny-model:1b', '--yes'], { cwd: project, env });
    assert.equal(removed.code, 0, removed.output);
    assert.ok(!ollama.state.models.some((model) => model.name === 'tiny-model:1b'));
    const stop = await ptbk(['tool', 'runtime', 'local-ollama', 'stop'], { cwd: project, env });
    assert.equal(stop.code, 3, 'a service Promptbook did not start is not stopped');
    assert.match(stop.output, /did not start/);
    const update = await ptbk(['tool', 'runtime', 'local-ollama', 'update'], { cwd: project, env });
    assert.equal(update.code, 3);
    assert.match(update.output, /does not update the shared Ollama installation/);
    assert.equal(Number((await git(project, ['rev-list', '--count', 'HEAD'])).trim()), commitsBefore + 1, 'host maintenance never commits');
});

test('local models: a local-only init checks and names through the local route, bootstraps Router with runtime=local and adds no hosted route', async (t) => {
    const directory = await temporaryDirectory(t);
    const { env } = await fakeHarness(t, directory);
    const ollama = await fakeOllama(t, { models: [LOCAL_MODEL] });
    const project = join(directory, 'local project');
    await initRepository(project);
    const log = join(directory, 'preparation.log');
    const init = await ptbk(['init', '--path', project, '--non-interactive', '--installation', 'global', '--harness', 'local-models', '--local-runtime', 'ollama', '--local-endpoint', ollama.url, '--no-start', '--intent', 'NAME_ME:Local Herbarium', '--raw'], { cwd: directory, env: { ...env, FAKE_CODEX_PREPARATION_LOG: log } });
    assert.equal(init.code, 0, init.output);
    assert.match(init.stdout, /Local models: codex-local answered through Ollama with gpt-oss:20b/);
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    const harnesses = config.tools.filter((tool) => tool.type === 'HARNESS');
    assert.deepEqual(harnesses.map((tool) => [tool.name, tool.authentication, tool.inferenceRuntime]), [['codex-local', 'NONE', 'local-ollama']], 'only the credential-free local connection: no hosted Codex route is reinserted');
    assert.ok(config.tools.some((tool) => tool.type === 'INFERENCE_RUNTIME' && tool.name === 'local-ollama' && tool.endpoint === ollama.url));
    const router = await readFile(join(project, 'agents', '.core', 'router.book'), 'utf8');
    assert.match(router, /^MODEL harness=OPENAI_CODEX model=gpt-oss:20b thinking=medium runtime=local$/m, 'Router bootstraps on the prepared local model');
    const calls = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.ok(calls.length >= 2 && calls.every((call) => call.config.model_provider === '"ptbk_local"'), 'every preparatory call (check, capability checks, naming) used the local route');
    assert.ok(calls.some((call) => call.kind === 'name'), 'the project was named through the local route');
});

test('local models: the configuration migration is additive; a legacy LOCAL route is kept with a binding diagnostic and nothing is added', () => {
    const tools = [
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'openai-codex', isEnabled: true, authentication: 'NATIVE' },
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'company-api', isEnabled: false, authentication: 'API_KEY', apiKey: '${{ env.COMPANY_KEY }}' },
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex-legacy-local', isEnabled: true, authentication: 'NATIVE', baseUrl: 'LOCAL' },
    ];
    const raw = { promptbookVersion: '0.119.0-103', tools };
    const plan = planConfigurationMigration(raw, '0.119.0-104');
    assert.equal(plan.kind, 'migrate');
    const migrated = applyConfigurationMigration(raw, plan);
    assert.deepEqual(migrated.raw.tools, tools, 'records, authentication, disabled state, names and order are unchanged; no runtime is guessed or added');
    assert.ok(migrated.problems.some((problem) => problem.severity === 'warning' && /codex-legacy-local/.test(problem.location) && /ptbk tool setup-local/.test(problem.message)));
    assert.equal(planConfigurationMigration({ ...raw, promptbookVersion: '0.119.0-104' }, '0.119.0-104').kind, 'current', 'a repeated current-version start does nothing');
});

test('local models: the running engine discovers, prepares in a background job with progress and saves the setup for every dashboard', async (t) => {
    const { project } = await initializedProject(t, { start: true });
    const ollama = await fakeOllama(t, { models: [LOCAL_MODEL] });
    const client = new ControlClient(projectAt(project), await readProcessRecord(projectAt(project)));
    const choices = { runtime: 'OLLAMA', endpoint: ollama.url, model: 'gpt-oss:20b' };
    const discovered = await client.request('local-models', { action: 'discover', choices, via: 'dashboard' }, 60_000);
    assert.deepEqual(discovered.plan.drafts.map((draft) => draft.name), ['local-ollama', 'codex-local']);
    assert.ok(discovered.description.some((line) => /Save: local-ollama/.test(line)));
    assert.ok(!ollama.state.requests.some((request) => request.path === '/api/pull' || request.path === '/api/generate'), 'discovery never downloads or runs inference');

    const started = await client.request('local-models', { action: 'setup', choices, via: 'dashboard' }, 60_000);
    assert.equal(started.job.state, 'running');
    await assert.rejects(client.request('local-models', { action: 'setup', choices, via: 'dashboard' }, 60_000), /local models operation is running/, 'one operation at a time');
    const job = await waitFor(async () => {
        const current = (await client.request('snapshot')).tools?.localJob;
        return current && current.state !== 'running' ? current : undefined;
    }, { message: 'the setup job to finish' });
    assert.equal(job.state, 'completed', `${job.message}\n${(job.notes ?? []).join('\n')}`);
    const items = (await client.request('snapshot')).tools.items;
    const runtime = items.find((item) => item.name === 'local-ollama');
    assert.equal(runtime.runtime.running, true);
    assert.deepEqual(runtime.runtime.dependents, ['codex-local']);
    assert.equal(items.find((item) => item.name === 'codex-local').state, 'usable', 'the new local route is usable at once, without a restart');
    const models = await client.request('local-models', { action: 'runtime', runtime: 'local-ollama', runtimeAction: 'models', via: 'dashboard' }, 60_000);
    assert.equal(models.outcome.status, 'completed');
    assert.deepEqual(models.outcome.models.map((model) => model.id), ['gpt-oss:20b']);
});
