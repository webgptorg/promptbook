import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { git, initializedProject, ptbk, subjects, waitFor } from './helpers.mjs';

/**
 * Fixture check accepting every output.
 */
const CHECK = 'process.exit(0);\n';

/**
 * Parsed project status.
 */
async function status(project, env) {
    const result = await ptbk(['status', '--json'], { cwd: project, env });
    assert.equal(result.code, 0, result.output);
    return JSON.parse(result.stdout);
}

/**
 * Saved tools of the project.
 */
async function savedTools(project) {
    return JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8')).tools;
}

test('tool management (stopped project): canonical records, scoped commits, protections, secrets only in .env', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const before = (await subjects(project)).length;
    const add = await ptbk(['tool', 'add', 'browser', '--variant', 'chrome', '--name', 'Work Browser', '--profile-source', 'project', '--is-headless', 'false', '--description', 'LinkedIn account', '--raw'], { cwd: project, env });
    assert.equal(add.code, 0, add.output);
    assert.deepEqual((await savedTools(project))[2], { type: 'BROWSER', variant: 'CHROME', name: 'work-browser', description: 'LinkedIn account', isEnabled: true, profile: { source: 'PROJECT' }, isHeadless: false }, 'tolerant input, canonical saved output');
    assert.equal((await subjects(project))[0], 'PTBK: Add browser tool work-browser');

    const secret = 'sk-fixture-secret-123';
    const api = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'company-api', '--authentication', 'API_KEY', '--api-key-env', 'COMPANY_OPENAI_API_KEY', '--api-key-stdin', '--raw'], { cwd: project, env, input: secret });
    assert.equal(api.code, 0, api.output);
    assert.doesNotMatch(api.output, new RegExp(secret));
    assert.equal((await savedTools(project))[3].apiKey, '${{ env.COMPANY_OPENAI_API_KEY }}', 'only the reference is saved');
    const dotEnv = await readFile(join(project, '.env'), 'utf8');
    assert.match(dotEnv, new RegExp(`^COMPANY_OPENAI_API_KEY=${secret}$`, 'm'));
    assert.match(dotEnv, /^# \S+ ptbk: added — add harness tool company-api/m, 'the addition is annotated with a timestamp and reason');
    const history = await git(project, ['log', '-p']);
    assert.doesNotMatch(history, new RegExp(secret), 'the secret never enters Git');
    assert.equal((await git(project, ['check-ignore', '.env'])).trim(), '.env');
    const list = await ptbk(['tool', 'list', '--json'], { cwd: project, env });
    assert.doesNotMatch(list.stdout, new RegExp(secret));
    const listed = JSON.parse(list.stdout);
    assert.equal(listed.items.find((item) => item.name === 'company-api').state, 'usable', 'the API instance is ready from its .env reference');
    assert.match(listed.items.find((item) => item.name === 'company-api').fields.apiKey, /COMPANY_OPENAI_API_KEY from the project's \.env/);

    const count = (await subjects(project)).length;
    assert.equal((await ptbk(['tool', 'enable', 'company-api', '--raw'], { cwd: project, env })).code, 0, 'a no-op succeeds');
    assert.equal((await subjects(project)).length, count, 'a no-op creates no commit');
    assert.equal((await ptbk(['tool', 'move', 'company-api', '--before', 'openai-codex', '--raw'], { cwd: project, env })).code, 0);
    assert.deepEqual((await savedTools(project)).map((tool) => tool.name), ['project-browser', 'company-api', 'openai-codex', 'work-browser']);
    assert.equal((await ptbk(['tool', 'modify', 'work-browser', '--rename', 'linkedin-browser', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await savedTools(project))[3].name, 'linkedin-browser');

    // Disabling keeps credentials; the last enabled harness needs its own confirmation.
    assert.equal((await ptbk(['tool', 'disable', 'company-api', '--raw'], { cwd: project, env })).code, 0);
    assert.match(await readFile(join(project, '.env'), 'utf8'), /^COMPANY_OPENAI_API_KEY=/m, 'disable never retires credentials');
    const last = await ptbk(['tool', 'disable', 'openai-codex', '--raw'], { cwd: project, env });
    assert.equal(last.code, 3, last.output);
    assert.match(last.output, /last enabled harness\. The engine keeps running, but cannot start ordinary new work/);
    assert.match(last.output, /ptbk tool disable openai-codex --yes/);
    assert.equal((await savedTools(project)).find((tool) => tool.name === 'openai-codex').isEnabled, true, 'nothing was written');
    assert.equal((await ptbk(['tool', 'disable', 'openai-codex', '--yes', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['tool', 'enable', 'openai-codex', '--raw'], { cwd: project, env })).code, 0);

    // Removing the only consumer of an engine-added key retires it (commented out, never deleted).
    assert.equal((await ptbk(['tool', 'remove', 'company-api', '--raw'], { cwd: project, env })).code, 0);
    const retired = await readFile(join(project, '.env'), 'utf8');
    assert.match(retired, /^# COMPANY_OPENAI_API_KEY=/m);
    assert.match(retired, /ptbk: commented out \(no remaining consumer\) — remove tool company-api/);

    assert.equal((await ptbk(['tool', 'add', 'HARNESS', '--variant', 'NOT_A_HARNESS', '--name', 'x', '--raw'], { cwd: project, env })).code, 2, 'an unknown variant is refused');
    assert.notEqual((await ptbk(['tool', 'disable', 'project-browser', '--no-commit', '--raw'], { cwd: project, env })).code, 0, 'saved tool management never runs uncommitted');
    const added = (await subjects(project)).length - before;
    assert.equal(added, 8, 'every real change is one commit');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
});

test('tool management keeps someone else’s uncommitted edit of ptbk.json out of its commit', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    config.routing.preferences = 'Prefer the cheapest model.';
    await writeFile(join(project, 'ptbk.json'), `${JSON.stringify(config, null, 4)}\n`);
    const add = await ptbk(['tool', 'add', 'BROWSER', '--variant', 'CHROME', '--name', 'second-browser', '--raw'], { cwd: project, env });
    assert.equal(add.code, 0, add.output);
    const committed = JSON.parse(await git(project, ['show', 'HEAD:ptbk.json']));
    assert.equal(committed.routing.preferences, undefined, 'the unrelated edit is not swept into the tool commit');
    assert.equal(committed.tools.at(-1).name, 'second-browser');
    const working = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.equal(working.routing.preferences, 'Prefer the cheapest model.', 'the edit stays in the working tree');
    assert.equal(working.tools.at(-1).name, 'second-browser');
    assert.match(await git(project, ['status', '--porcelain']), /M ptbk\.json/);
});

test('live tools: a running engine waits for tools without stopping, and resumes when one is enabled from another terminal', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    assert.equal((await ptbk(['tool', 'remove', 'openai-codex', '--yes', '--raw'], { cwd: project, env })).code, 0);
    await ptbk(['add', 'Write the welcome page', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const started = await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    assert.match(started.output, /Waiting for tools|waits for tools/i, 'start reports the running service with its resource wait');
    const waiting = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.tools?.waiting && snapshot.wait?.kind === 'tools' ? snapshot : undefined;
    }, { message: 'the tool wait', timeoutMs: 60_000 });
    assert.equal(waiting.service.state, 'running', 'missing tools are a running wait, not a pause or stop');
    assert.match(waiting.tools.waiting.reason, /no harness tool is configured/i);
    const added = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'openai-codex', '--raw'], { cwd: project, env });
    assert.equal(added.code, 0, added.output);
    await waitFor(async () => (await subjects(project)).some((subject) => /^PTBK: Write the welcome page/.test(subject)), { message: 'the task result after the tool was added', timeoutMs: 90_000 });
    const history = await subjects(project);
    assert.ok(history.indexOf('PTBK: Add harness tool openai-codex') > history.findIndex((subject) => /^PTBK: Write the welcome page/.test(subject)), 'the tool commit precedes the result');
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('live tools: a browser added during a task serves that task; an in-use tool needs --force or a whole-engine stop', async (t) => {
    const { project, env: base } = await initializedProject(t, { check: CHECK });
    const env = { ...base, FAKE_CODEX_SLOW_MS: '9000' };
    assert.equal((await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'codex-second', '--raw'], { cwd: project, env })).code, 0);
    await ptbk(['add', 'Publish the post SLOW_WORK LIST_BROWSERS', '--agent', 'Developer', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const running = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.current?.taskTitle.startsWith('Publish the post') && snapshot.current.phase === 'executing' ? snapshot : undefined;
    }, { message: 'the slow task', timeoutMs: 60_000 });
    const tool = running.current.tool;
    assert.equal(tool, 'openai-codex', 'the first usable instance of the variant serves the work');
    assert.ok(running.tools.items.find((item) => item.name === tool).inUse);

    const refused = await ptbk(['tool', 'disable', tool, '--raw'], { cwd: project, env });
    assert.equal(refused.code, 3, refused.output);
    assert.match(refused.output, /in use by active work/);
    assert.match(refused.output, new RegExp(`ptbk tool disable ${tool} --force`));
    assert.match(refused.output, /ptbk stop --force/);
    assert.doesNotMatch(refused.output, /--force-stop/);
    assert.equal((await savedTools(project)).find((item) => item.name === tool).isEnabled, true, 'a refused change writes nothing');

    const browser = await ptbk(['tool', 'add', 'BROWSER', '--variant', 'CHROME', '--name', 'facebook-browser', '--description', 'Facebook page account', '--raw'], { cwd: project, env });
    assert.equal(browser.code, 0, browser.output);
    const forced = await ptbk(['tool', 'disable', tool, '--force', '--raw'], { cwd: project, env });
    assert.equal(forced.code, 0, forced.output);

    await waitFor(async () => (await subjects(project)).some((subject) => /^PTBK: Publish the post/.test(subject)), { message: 'the task result', timeoutMs: 90_000 });
    const listed = await readFile(join(project, 'output', 'browsers.txt'), 'utf8');
    assert.match(listed, /facebook-browser: Facebook page account/, 'the browser added during the task was available to it');
    const history = await subjects(project);
    const result = history.findIndex((subject) => /^PTBK: Publish the post/.test(subject));
    assert.ok(history.indexOf('PTBK: Add browser tool facebook-browser') > result && history.indexOf(`PTBK: Disable tool ${tool}`) > result, 'tool commits are separate and earlier');
    const resultSha = (await git(project, ['log', '--format=%H', '--grep', '^PTBK: Publish the post'])).trim().split('\n')[0];
    assert.doesNotMatch(await git(project, ['show', '--name-only', '--format=', resultSha]), /ptbk\.json/, 'the result commit does not restore or include configuration');
    const saved = await savedTools(project);
    assert.equal(saved.find((item) => item.name === tool).isEnabled, false, 'the saved change survives the task completion');
    assert.ok(saved.some((item) => item.name === 'facebook-browser'));
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('same-variant fallback: a quota failure of the first instance moves the work to the next one promptly', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    const api = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'codex-api', '--authentication', 'API_KEY', '--api-key-env', 'FALLBACK_KEY', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'fallback-secret' });
    assert.equal(api.code, 0, api.output);
    await ptbk(['add', 'Summarize the news QUOTA_NATIVE', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const started = Date.now();
    const run = await ptbk(['run', '--raw', '--limit', '1', '--harness', 'openai-codex'], { cwd: project, env });
    assert.equal(run.code, 0, run.output);
    assert.ok(Date.now() - started < 120_000, 'no wait through the exhausted account’s reset');
    assert.match(run.output, /same-variant fallback/);
    const turns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((turn) => turn.title.startsWith('Summarize the news'));
    assert.deepEqual(turns.map((turn) => turn.api), [false, true], 'native first, then the configured API fallback');
    assert.equal(turns[1].apiKey, 'fallback-secret', 'the instance gets exactly its own credential');
    assert.ok((await subjects(project)).some((subject) => /^PTBK: Summarize the news/.test(subject)));
});
