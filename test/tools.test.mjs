import assert from 'node:assert/strict';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseQuotaReset } from '../dist/harness/quota-reset.js';
import { toolInventory } from '../dist/tools/readiness.js';
import { drive, findGenerated, git, initializedProject, ptbk, subjects, waitFor } from './helpers.mjs';

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

test('retained revisions in the inventory: actual type/variant and owner, separate from a same-name saved tool, never counted for readiness', () => {
    const project = { root: '/projects/site', name: 'site', runtime: { root: '/projects/site/.ptbk', temporary: '/projects/site/.ptbk/tmp', browserProfile: '/projects/site/.ptbk/browser/profile' } };
    const pool = { inspectionOf: () => ({ usable: true, summary: 'Ready.' }), credential: () => undefined, runtimes: { observation: () => undefined } };
    const browser = { type: 'BROWSER', variant: 'CHROME', name: 'work-browser', isEnabled: true, profile: { source: 'MANAGED_GLOBAL' }, isHeadless: true };
    const browsers = new Map([['work-browser', { usable: true, summary: 'Ready.' }]]);
    const acquired = { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'openai-codex', isEnabled: true, authentication: 'NATIVE', accountProfile: 'company' };
    const settings = (tools) => ({ tools, diagnostics: [], overriddenTools: new Set() });
    const inventory = (tools, retained) => toolInventory({ project, settings: settings(tools), env: {}, pool, browsers, inUse: new Set(), retained });

    // Removed: one entry with its acquired identity, and new work waits for a harness.
    const removed = inventory([browser], [{ name: 'openai-codex', record: acquired, owner: 'Draft the release notes' }]);
    const [entry] = removed.items.filter((item) => item.name === 'openai-codex');
    assert.deepEqual([entry.type, entry.variant, entry.variantLabel, entry.retained, entry.inUse, entry.isEnabled, entry.owner], ['HARNESS', 'OPENAI_CODEX', 'OpenAI Codex', true, true, false, 'Draft the release notes']);
    assert.equal(entry.fields.accountProfile, 'company', 'the effective account reference of the acquired revision');
    assert.match(entry.summary, /^Removed from ptbk\.json; current work only: "Draft the release notes"/);
    assert.match(removed.waiting?.reason ?? '', /no harness tool is configured/i, 'a retained revision never satisfies readiness');

    // Replaced by a same-name tool: two distinct entries, the saved one first and selectable.
    const replacement = { ...acquired, accountProfile: 'personal' };
    const replaced = inventory([browser, replacement], [{ name: 'openai-codex', record: acquired, owner: 'Draft the release notes' }]);
    const both = replaced.items.filter((item) => item.name === 'openai-codex');
    assert.equal(both.length, 2);
    assert.equal(both[0].retained, undefined);
    assert.equal(both[0].fields.accountProfile, 'personal');
    assert.equal(both[1].retained, true);
    assert.match(both[1].summary, /^Changed in ptbk\.json/);
    assert.notEqual(both[1].revision, undefined);
    assert.equal(replaced.waiting, undefined);

    // A replacement of another type keeps both identities.
    const crossType = inventory([browser, { ...browser, name: 'openai-codex' }], [{ name: 'openai-codex', record: acquired }]);
    assert.deepEqual(crossType.items.filter((item) => item.name === 'openai-codex').map((item) => `${item.type}:${item.retained ?? false}`), ['BROWSER:false', 'HARNESS:true']);
    assert.match(crossType.items.find((item) => item.retained).summary, /Replaced in ptbk\.json by a BROWSER tool/);
});

test('retained revisions: a chat reply and its TEAM consultation hold the revision they acquired; a forced change retains it for that chat only', async (t) => {
    const { directory, project, env: base } = await initializedProject(t, { check: CHECK });
    const barrier = join(directory, 'consultation barrier');
    await writeFile(barrier, 'hold the advisor until the held revision is inspected\n');
    const env = { ...base, FAKE_CODEX_CONSULT_BARRIER: barrier };
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    // The onboarding review also uses openai-codex: only the chat may hold it here.
    await waitFor(async () => findGenerated(await subjects(project), 'Review the initialized project', 'ptbk: '), { message: 'the onboarding review result', timeoutMs: 60_000 });
    await waitFor(async () => {
        const idle = await status(project, env);
        return !idle.current && !idle.tools.items.some((item) => item.inUse) ? idle : undefined;
    }, { message: 'no active work', timeoutMs: 60_000 });
    const asked = ptbk(['chat', 'Which approach should we take? CONSULT_TEAM', '--raw'], { cwd: project, env });
    await waitFor(async () => (await readFile(`${barrier}.reached`, 'utf8').catch(() => '')).includes('consultation'), { message: 'the consultation turn', timeoutMs: 60_000 });

    let snapshot = await status(project, env);
    assert.equal(snapshot.tools.items.find((item) => item.name === 'openai-codex' && !item.retained).inUse, true, 'a chat reply and its consultation are active work');
    const refused = await ptbk(['tool', 'modify', 'openai-codex', '--description', 'Another account', '--raw'], { cwd: project, env });
    assert.equal(refused.code, 3, refused.output);
    assert.match(refused.output, /in use by active work/);

    const forced = await ptbk(['tool', 'modify', 'openai-codex', '--description', 'Another account', '--force', '--raw'], { cwd: project, env });
    assert.equal(forced.code, 0, forced.output);
    snapshot = await status(project, env);
    const entries = snapshot.tools.items.filter((item) => item.name === 'openai-codex');
    assert.equal(entries.length, 2, `the saved and the held revision are distinct: ${JSON.stringify(entries)}`);
    const saved = entries.find((item) => !item.retained);
    const held = entries.find((item) => item.retained);
    assert.equal(saved.inUse, false, 'the changed saved tool is not held by the chat that acquired the old revision');
    assert.deepEqual([held.type, held.variant, held.inUse], ['HARNESS', 'OPENAI_CODEX', true]);
    assert.match(held.owner, /^chat \{/, held.owner);
    assert.match(held.summary, /^Changed in ptbk\.json/);

    await rm(barrier);
    const reply = await asked;
    assert.equal(reply.code, 0, reply.output);
    assert.match(reply.stdout, /Developer advises: Fixture advice/);
    await waitFor(async () => !(await status(project, env)).tools.items.some((item) => item.retained), { message: 'the held revision is released with the reply', timeoutMs: 30_000 });
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('retained revisions: a helper call (the project brief) holds the revision it acquired; a forced change retains it for that call only', async (t) => {
    const { directory, project, env: base } = await initializedProject(t, { check: CHECK });
    const barrier = join(directory, 'brief barrier');
    await writeFile(barrier, 'hold the brief until the held revision is inspected\n');
    const env = { ...base, FAKE_CODEX_BRIEF_BARRIER: barrier, PTBK_REPORT_INTERVAL_MS: '600000' };
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await readFile(`${barrier}.reached`, 'utf8').catch(() => '')).includes('brief'), { message: 'the brief turn', timeoutMs: 90_000 });
    // The onboarding review also uses openai-codex: wait until only the brief can hold it.
    await waitFor(async () => findGenerated(await subjects(project), 'Review the initialized project', 'ptbk: '), { message: 'the onboarding review result', timeoutMs: 60_000 });
    await waitFor(async () => !(await status(project, env)).current, { message: 'no task running beside the brief', timeoutMs: 60_000 });

    let snapshot = await status(project, env);
    assert.equal(snapshot.tools.items.find((item) => item.name === 'openai-codex' && !item.retained).inUse, true, 'the brief is active work of its harness');
    const refused = await ptbk(['tool', 'modify', 'openai-codex', '--description', 'Another account', '--raw'], { cwd: project, env });
    assert.equal(refused.code, 3, refused.output);
    assert.match(refused.output, /in use by active work/);

    const forced = await ptbk(['tool', 'modify', 'openai-codex', '--description', 'Another account', '--force', '--raw'], { cwd: project, env });
    assert.equal(forced.code, 0, forced.output);
    snapshot = await status(project, env);
    const held = snapshot.tools.items.find((item) => item.name === 'openai-codex' && item.retained);
    assert.ok(held, `the held revision stays visible: ${JSON.stringify(snapshot.tools.items.map((item) => [item.name, item.retained, item.owner]))}`);
    assert.deepEqual([held.type, held.variant, held.inUse, held.owner], ['HARNESS', 'OPENAI_CODEX', true, 'Project brief']);
    assert.equal(snapshot.tools.items.find((item) => item.name === 'openai-codex' && !item.retained).inUse, false, 'the changed saved tool is not held by the brief');

    await rm(barrier);
    await waitFor(async () => (await status(project, env)).report?.brief, { message: 'the brief', timeoutMs: 60_000 });
    await waitFor(async () => !(await status(project, env)).tools.items.some((item) => item.retained), { message: 'the held revision is released with the brief', timeoutMs: 30_000 });
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('quota resets: the wait a provider reports is understood in its usual forms; nothing is invented', () => {
    const now = Date.UTC(2026, 9, 30, 10, 0, 0);
    const minutes = 60_000;
    const cases = [
        ["You've hit your usage limit. Upgrade to Pro (https://openai.com/chatgpt/pricing), or try again in 2 days 3 hours 5 minutes.", now + (2 * 24 * 60 + 3 * 60 + 5) * minutes],
        ['Rate limit reached for gpt-4o in organization org-x on tokens per min (TPM): Limit 30000, Used 29000. Please try again in 6.5s.', now + 6_500],
        ['Please try again in 1m30s.', now + 90_000],
        [`Claude AI usage limit reached|${now / 1000 + 7200}`, now + 120 * minutes],
        ['Claude usage limit reached. Your limit will reset at 5pm (America/New_York).', Date.UTC(2026, 9, 30, 21, 0)],
        ['5-hour limit reached ∙ resets 3am (Europe/Prague)', Date.UTC(2026, 9, 31, 2, 0)],
        ["You've hit your usage limit. Try again at Nov 3rd, 2026 2:28 PM.", new Date(2026, 10, 3, 14, 28).getTime()],
        ['Quota exceeded for quota metric. {"retryDelay": "41s"}', now + 41_000],
        ['429 Too Many Requests. Retry-After: 30', now + 30_000],
        ['Rate limited; the limit resets at 2026-10-30T12:00:00Z.', Date.UTC(2026, 9, 30, 12, 0)],
        ['Monthly quota exhausted; it resets in 30 days.', now + 7 * 24 * 60 * minutes],
    ];
    for (const [text, expected] of cases) assert.equal(parseQuotaReset(text, now), expected, text);
    for (const text of ["You've hit your usage limit. Try again later.", 'insufficient_quota', 'Claude AI usage limit reached|1000000000', 'Rate limit: try again at 10']) {
        assert.equal(parseQuotaReset(text, now), undefined, `${text} states no future reset`);
    }
});

test('quota resets: without a fallback, a task waits exactly until the reset its provider reported, without probing before it', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Summarize the news QUOTA_RESET', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const run = await drive(project, env, async ({ output }) => /resumes in 2d 3h/.test(output), { message: 'the reported reset as the wait' });
    assert.match(run.output, /try again in 2 days 3 hours.*; "Summarize the news QUOTA_RESET[^"]*" resumes in 2d 3h/);
    const turns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((turn) => turn.title.startsWith('Summarize the news'));
    assert.equal(turns.length, 1, 'no further paid probe before the reset');
});

test('tool management (stopped project): canonical records, scoped commits, protections, secrets only in .env', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const before = (await subjects(project)).length;
    const add = await ptbk(['tool', 'add', 'browser', '--variant', 'chrome', '--name', 'Work Browser', '--profile-source', 'project', '--is-headless', 'false', '--description', 'LinkedIn account', '--raw'], { cwd: project, env });
    assert.equal(add.code, 0, add.output);
    assert.deepEqual((await savedTools(project)).find((tool) => tool.name === 'work-browser'), { type: 'BROWSER', variant: 'CHROME', name: 'work-browser', description: 'LinkedIn account', isEnabled: true, profile: { source: 'PROJECT' }, isHeadless: false }, 'tolerant input, canonical saved output');
    assert.equal((await subjects(project))[0], 'ptbk: Add browser tool work-browser');

    const secret = 'sk-fixture-secret-123';
    const api = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'company-api', '--authentication', 'API_KEY', '--api-key-env', 'COMPANY_OPENAI_API_KEY', '--api-key-stdin', '--raw'], { cwd: project, env, input: secret });
    assert.equal(api.code, 0, api.output);
    assert.doesNotMatch(api.output, new RegExp(secret));
    assert.equal((await savedTools(project)).find((tool) => tool.name === 'company-api').apiKey, '${{ env.COMPANY_OPENAI_API_KEY }}', 'only the reference is saved');
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
    assert.deepEqual((await savedTools(project)).map((tool) => tool.name), ['project-browser', 'company-api', 'openai-codex', 'computer-control', 'work-browser']);
    assert.equal((await ptbk(['tool', 'modify', 'work-browser', '--rename', 'linkedin-browser', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await savedTools(project)).at(-1).name, 'linkedin-browser');

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

test('tool management: a secret-only rotation first saves and commits the effective .env ignore rule; failures leave the previous secret', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const add = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'company-api', '--authentication', 'API_KEY', '--api-key-env', 'COMPANY_KEY', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'sk-first' });
    assert.equal(add.code, 0, add.output);
    // .env becomes untracked but not ignored (the rule was removed and committed), with unrelated uncommitted work.
    const ignore = (await readFile(join(project, '.gitignore'), 'utf8')).split('\n').filter((line) => line.trim() !== '.env').join('\n');
    await writeFile(join(project, '.gitignore'), ignore);
    await git(project, ['add', '.gitignore']);
    await git(project, ['commit', '-q', '-m', 'Stop ignoring .env']);
    assert.equal((await git(project, ['check-ignore', '.env']).catch(() => '')).trim(), '', '.env is not ignored');
    await writeFile(join(project, 'unrelated.md'), 'unrelated uncommitted work\n');
    const config = await readFile(join(project, 'ptbk.json'), 'utf8');
    const count = (await subjects(project)).length;

    const rotated = await ptbk(['tool', 'modify', 'company-api', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'sk-second' });
    assert.equal(rotated.code, 0, rotated.output);
    assert.equal((await git(project, ['check-ignore', '.env'])).trim(), '.env', 'the effective ignore rule exists');
    assert.equal((await subjects(project)).length, count + 1, 'the versioned protection change has its scoped commit');
    assert.match((await subjects(project))[0], /ignore \.env before storing its secret/);
    assert.deepEqual((await git(project, ['show', '--name-only', '--format=', 'HEAD'])).trim().split('\n'), ['.gitignore'], 'only the ignore rule is committed');
    assert.match(await git(project, ['status', '--porcelain']), /\?\? unrelated\.md/, 'unrelated work stays uncommitted');
    assert.equal(await readFile(join(project, 'ptbk.json'), 'utf8'), config, 'no tool field changed');
    assert.match(await readFile(join(project, '.env'), 'utf8'), /^COMPANY_KEY=sk-second$/m);
    assert.doesNotMatch(await git(project, ['log', '-p']), /sk-first|sk-second/);

    const again = await ptbk(['tool', 'modify', 'company-api', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'sk-third' });
    assert.equal(again.code, 0, again.output);
    assert.equal((await subjects(project)).length, count + 1, 'with protection present a secret-only rotation creates no empty commit');
    assert.match(await readFile(join(project, '.env'), 'utf8'), /# \S+ ptbk: commented out the previous value \(replaced below\)[^\n]*\n# COMPANY_KEY=sk-second\n# \S+ ptbk: added[^\n]*\nCOMPANY_KEY=sk-third$/m, 'the audit is recorded inside .env');

    // Protection that cannot be established: the previous secret stays and no success is reported.
    await writeFile(join(project, '.gitignore'), `${ignore}\n.env\n!.env\n`);
    await git(project, ['add', '.gitignore']);
    await git(project, ['commit', '-q', '-m', 'Re-include .env']);
    const before = await readFile(join(project, '.env'), 'utf8');
    const refused = await ptbk(['tool', 'modify', 'company-api', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'sk-fourth' });
    assert.notEqual(refused.code, 0, refused.output);
    assert.match(refused.output, /could not make Git ignore \.env, so the secret was not stored/);
    assert.doesNotMatch(refused.output, /Added \.env to \.gitignore/);
    assert.equal(await readFile(join(project, '.env'), 'utf8'), before, 'the previous secret file is unchanged');

    // A failed protection write (read-only project directory) also leaves the previous secret in place.
    if (process.platform !== 'win32' && process.getuid?.() !== 0) {
        await writeFile(join(project, '.gitignore'), ignore);
        await git(project, ['add', '.gitignore']);
        await git(project, ['commit', '-q', '-m', 'Stop ignoring .env again']);
        await chmod(project, 0o555);
        try {
            const blocked = await ptbk(['tool', 'modify', 'company-api', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'sk-fifth' });
            assert.notEqual(blocked.code, 0, blocked.output);
            assert.match(blocked.output, /could not make Git ignore \.env/);
        } finally {
            await chmod(project, 0o755);
        }
        assert.equal(await readFile(join(project, '.env'), 'utf8'), before, 'an injected protection-write failure stores nothing');
        assert.equal(await readFile(join(project, '.gitignore'), 'utf8'), ignore);
    }
});

test('tool management: removing the last tool of an engine-added key keeps it while ptbk.json (committed or working copy) still uses it', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const addTool = async (name) => {
        const added = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', name, '--authentication', 'API_KEY', '--api-key-env', 'SHARED_KEY', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'sk-shared' });
        assert.equal(added.code, 0, added.output);
    };
    const setCheck = async (check, commit) => {
        const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
        config.execution.check = check;
        await writeFile(join(project, 'ptbk.json'), `${JSON.stringify(config, null, 4)}\n`);
        if (commit) {
            await git(project, ['add', 'ptbk.json']);
            await git(project, ['commit', '-q', '-m', 'Check uses the key']);
        }
    };
    await addTool('api-one');
    await setCheck('node -e "process.exit(process.env.SHARED_KEY === undefined ? 0 : 0)" && node check.mjs', true);
    const removed = await ptbk(['tool', 'remove', 'api-one', '--raw'], { cwd: project, env });
    assert.equal(removed.code, 0, removed.output);
    assert.match(await readFile(join(project, '.env'), 'utf8'), /^SHARED_KEY=sk-shared$/m, 'a check command is a consumer');
    assert.match(removed.output, /SHARED_KEY stays active in \.env: ptbk\.json still uses it/);

    // Only an uncommitted working-copy edit uses it.
    await setCheck('node check.mjs', true);
    await addTool('api-two');
    await setCheck('echo $SHARED_KEY && node check.mjs', false);
    const working = await ptbk(['tool', 'remove', 'api-two', '--raw'], { cwd: project, env });
    assert.equal(working.code, 0, working.output);
    assert.match(working.output, /uncommitted working copy/);
    assert.match(await readFile(join(project, '.env'), 'utf8'), /^SHARED_KEY=sk-shared$/m);

    // Proven unused: retired by commenting, history preserved.
    await setCheck('node check.mjs', false);
    await addTool('api-three');
    const unused = await ptbk(['tool', 'remove', 'api-three', '--raw'], { cwd: project, env });
    assert.equal(unused.code, 0, unused.output);
    const text = await readFile(join(project, '.env'), 'utf8');
    assert.match(text, /^# SHARED_KEY=sk-shared$/m);
    assert.doesNotMatch(text, /^SHARED_KEY=/m);
});

test('tool management keeps someone else’s uncommitted edit of ptbk.json out of its commit', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    config.execution.waitAfterError = '15m';
    await writeFile(join(project, 'ptbk.json'), `${JSON.stringify(config, null, 4)}\n`);
    const add = await ptbk(['tool', 'add', 'BROWSER', '--variant', 'CHROME', '--name', 'second-browser', '--raw'], { cwd: project, env });
    assert.equal(add.code, 0, add.output);
    const committed = JSON.parse(await git(project, ['show', 'HEAD:ptbk.json']));
    assert.equal(committed.execution.waitAfterError, undefined, 'the unrelated edit is not swept into the tool commit');
    assert.equal(committed.tools.at(-1).name, 'second-browser');
    const working = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.equal(working.execution.waitAfterError, '15m', 'the edit stays in the working tree');
    assert.equal(working.tools.at(-1).name, 'second-browser');
    assert.match(await git(project, ['status', '--porcelain']), /M ptbk\.json/);
});

test('tool setup checks a native harness in its own account context like init; signed out is reported with its sign-in, never waited on', { skip: process.platform === 'win32' }, async (t) => {
    const { project, env: base } = await initializedProject(t, { check: CHECK });
    // The default context is signed in; the new company account context has its own, still missing, sign-in.
    const auth = join(project, '..', 'codex-auth');
    await writeFile(auth, 'signed in\n');
    const env = { ...base, FAKE_CODEX_AUTH_FILE: auth };
    const before = (await subjects(project)).length;
    const added = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'codex-company', '--account-profile', 'company', '--raw'], { cwd: project, env, input: '' });
    assert.equal(added.code, 0, added.output);
    assert.match(added.output, /codex-company: Installed but not logged in\. → Sign in from an interactive terminal: ptbk tool enable codex-company\n/, 'the default sign-in is not mistaken for this account context');
    assert.equal((await subjects(project)).length, before + 1, 'the addition is saved and committed; nothing waits for a sign-in');
    const shown = JSON.parse((await ptbk(['tool', 'show', 'codex-company', '--json'], { cwd: project, env })).stdout);
    assert.equal(shown.nextAction, 'Sign in from an interactive terminal: ptbk tool enable codex-company', 'the inventory names this context, not `codex login` of the default one');

    // Once that account context is signed in, enabling the enabled tool checks it again and commits nothing.
    const accountHome = join(env.PTBK_HOME, 'harness-accounts', 'openai-codex', 'company');
    await mkdir(accountHome, { recursive: true });
    await writeFile(join(accountHome, 'codex-auth'), 'signed in\n');
    const enabled = await ptbk(['tool', 'enable', 'codex-company', '--raw'], { cwd: project, env });
    assert.equal(enabled.code, 0, enabled.output);
    assert.match(enabled.output, /codex-company: Ready \(ChatGPT account login/);
    assert.equal((await subjects(project)).length, before + 1, 'a readiness check commits nothing');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
});

test('live tools: a running engine waits for tools without stopping, and resumes when one is enabled from another terminal', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    assert.equal((await ptbk(['tool', 'remove', 'openai-codex', '--yes', '--raw'], { cwd: project, env })).code, 0);
    await ptbk(['add', 'Write the welcome page', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const started = await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
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
    await waitFor(async () => (await subjects(project)).some((subject) => /^ptbk: Write the welcome page/.test(subject)), { message: 'the task result after the tool was added', timeoutMs: 90_000 });
    const history = await subjects(project);
    assert.ok(history.indexOf('ptbk: Add harness tool openai-codex') > history.findIndex((subject) => /^ptbk: Write the welcome page/.test(subject)), 'the tool commit precedes the result');
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('live tools: a browser added during a task serves that task; an in-use tool needs --force or a whole-engine stop', async (t) => {
    const { directory, project, env: base } = await initializedProject(t, { check: CHECK });
    // Hold the turn until both tool changes finish; their CLI processes can outlast a fixed sleep on Windows.
    const barrier = join(directory, 'live tool changes');
    await writeFile(barrier, 'wait for the browser addition and in-use harness disable\n');
    const env = { ...base, FAKE_CODEX_SLOW_MS: '0', FAKE_CODEX_WORK_BARRIER: barrier };
    assert.equal((await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'codex-second', '--raw'], { cwd: project, env })).code, 0);
    await ptbk(['add', 'Publish the post SLOW_WORK LIST_BROWSERS', '--agent', 'Developer', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
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
    assert.equal((await status(project, env)).current?.taskTitle, running.current.taskTitle, 'the same task is still executing after both tool changes');
    await rm(barrier);

    await waitFor(async () => (await subjects(project)).some((subject) => /^ptbk: Publish the post/.test(subject)), { message: 'the task result', timeoutMs: 90_000 });
    const listed = await readFile(join(project, 'output', 'browsers.txt'), 'utf8');
    assert.match(listed, /facebook-browser: Facebook page account/, 'the browser added during the task was available to it');
    const history = await subjects(project);
    const result = history.findIndex((subject) => /^ptbk: Publish the post/.test(subject));
    assert.ok(history.indexOf('ptbk: Add browser tool facebook-browser') > result && history.indexOf(`ptbk: Disable tool ${tool}`) > result, 'tool commits are separate and earlier');
    const resultSha = (await git(project, ['log', '--format=%H', '--grep', '^`ptbk` .*Publish the post'])).trim().split('\n')[0];
    assert.doesNotMatch(await git(project, ['show', '--name-only', '--format=', resultSha]), /ptbk\.json/, 'the result commit does not restore or include configuration');
    const saved = await savedTools(project);
    assert.equal(saved.find((item) => item.name === tool).isEnabled, false, 'the saved change survives the task completion');
    assert.ok(saved.some((item) => item.name === 'facebook-browser'));
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('retained revisions: a removed acquired harness keeps its actual identity while draining; a same-name replacement is separate and survives the old work', async (t) => {
    const { directory, project, env: base } = await initializedProject(t, { check: CHECK });
    const barrier = join(directory, 'retained revision');
    await writeFile(barrier, 'hold the turn until the retained revision and its replacement are inspected\n');
    const env = { ...base, FAKE_CODEX_SLOW_MS: '0', FAKE_CODEX_WORK_BARRIER: barrier };
    assert.equal((await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'codex-second', '--raw'], { cwd: project, env })).code, 0);
    await ptbk(['add', 'Draft the release notes SLOW_WORK', '--agent', 'Developer', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const running = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.current?.taskTitle.startsWith('Draft the release notes') && snapshot.current.phase === 'executing' ? snapshot : undefined;
    }, { message: 'the slow task', timeoutMs: 60_000 });
    assert.equal(running.current.tool, 'openai-codex');
    const owner = running.current.taskTitle;
    // Other work that acquired the same revision (e.g. the onboarding review on a slow runner) is listed too.
    const pattern = owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const owns = (text) => (text ?? '').split(', ').includes(owner);

    const removed = await ptbk(['tool', 'remove', 'openai-codex', '--force', '--raw'], { cwd: project, env });
    assert.equal(removed.code, 0, removed.output);
    let snapshot = await status(project, env);
    const [retained, ...others] = snapshot.tools.items.filter((item) => item.name === 'openai-codex');
    assert.equal(others.length, 0);
    assert.deepEqual([retained.type, retained.variant, retained.retained, retained.inUse, retained.isEnabled], ['HARNESS', 'OPENAI_CODEX', true, true, false], 'never a placeholder browser');
    assert.ok(owns(retained.owner), `the owning work is named: ${retained.owner}`);
    assert.match(retained.summary, /Removed from ptbk\.json; current work only/);
    assert.ok(retained.revision);
    assert.equal(snapshot.tools.items.filter((item) => item.type === 'HARNESS' && item.state === 'usable').map((item) => item.name).join(), 'codex-second', 'not counted as an available harness');
    assert.ok(!snapshot.tools.items.some((item) => item.type === 'BROWSER' && item.name === 'openai-codex'));
    const listed = await ptbk(['tool', 'list', '--raw'], { cwd: project, env });
    assert.match(listed.output, new RegExp(`openai-codex HARNESS OPENAI_CODEX · draining: old configuration, current work only \\([^\\n]*${pattern}`));
    const shown = await ptbk(['tool', 'show', 'openai-codex', '--raw'], { cwd: project, env });
    assert.match(shown.output, /\(HARNESS OPENAI_CODEX\), retained revision/);
    assert.match(shown.output, new RegExp(`Held by\\s+[^\\n]*${pattern}`));

    // An identical record added under the same name is a new revision: it never revives or retargets the old use.
    const replaced = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'openai-codex', '--raw'], { cwd: project, env });
    assert.equal(replaced.code, 0, replaced.output);
    snapshot = await status(project, env);
    const both = snapshot.tools.items.filter((item) => item.name === 'openai-codex');
    assert.equal(both.length, 2, `saved and retained revisions are distinct entries: ${JSON.stringify(both)}`);
    const saved = both.find((item) => !item.retained);
    assert.equal(saved.inUse, false, 'the old work does not hold the replacement');
    assert.equal(saved.isEnabled, true);
    assert.ok(owns(both.find((item) => item.retained).owner));
    const modified = await ptbk(['tool', 'modify', 'openai-codex', '--description', 'Replacement account', '--raw'], { cwd: project, env });
    assert.equal(modified.code, 0, `the replacement needs no in-use acknowledgement: ${modified.output}`);
    await rm(barrier);

    await waitFor(async () => (await subjects(project)).some((subject) => /^ptbk: Draft the release notes/.test(subject)), { message: 'the task result', timeoutMs: 90_000 });
    snapshot = await waitFor(async () => {
        const current = await status(project, env);
        return current.tools.items.some((item) => item.retained) ? undefined : current;
    }, { message: 'every old revision to be released', timeoutMs: 60_000 });
    const after = snapshot.tools.items.filter((item) => item.name === 'openai-codex');
    assert.equal(after.length, 1);
    assert.equal(after[0].description, 'Replacement account', 'completing the old work neither removed nor changed the replacement');
    assert.equal((await savedTools(project)).filter((item) => item.name === 'openai-codex').length, 1);
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('same-variant fallback: a technical failure of the first instance continues on the ready next one, within the same budget and without a wait', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    const api = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'codex-api', '--authentication', 'API_KEY', '--api-key-env', 'FALLBACK_KEY', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'fallback-secret' });
    assert.equal(api.code, 0, api.output);
    // Repeating the failed route would wait this long between technical retries.
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    config.execution.waitAfterError = '15m';
    await writeFile(join(project, 'ptbk.json'), `${JSON.stringify(config, null, 4)}\n`);
    await git(project, ['commit', '-q', '-am', 'Long technical backoff']);
    await ptbk(['add', 'Summarize the news TECHNICAL_NATIVE', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const started = Date.now();
    const run = await drive(project, env, async () => findGenerated(await subjects(project), 'Summarize the news TECHNICAL_NATIVE', 'ptbk: '), { args: ['--harness', 'openai-codex'], message: 'the result through the technical fallback' });
    assert.equal(run.code, 0, run.output);
    assert.ok(Date.now() - started < 120_000, 'no technical backoff against the failed route while a fallback is ready');
    assert.match(run.output, /continues with the same-variant fallback "codex-api"/);
    assert.match(run.output, /technical retry 1\//, 'the switch consumes the shared technical budget');
    const turns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((turn) => turn.title.startsWith('Summarize the news'));
    assert.deepEqual(turns.map((turn) => turn.api), [false, true], 'the failed native route is not repeated before the fallback');
    assert.equal(turns[1].apiKey, 'fallback-secret');
    assert.ok(!turns.some((turn) => turn.agent === 'Fixer'), 'no Fixer handover while a fallback is ready');
    assert.ok((await subjects(project)).some((subject) => /^ptbk: Summarize the news/.test(subject)));
});

test('same-variant fallback: a quota failure of the first instance moves the work to the next one promptly', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    const api = await ptbk(['tool', 'add', 'HARNESS', '--variant', 'OPENAI_CODEX', '--name', 'codex-api', '--authentication', 'API_KEY', '--api-key-env', 'FALLBACK_KEY', '--api-key-stdin', '--raw'], { cwd: project, env, input: 'fallback-secret' });
    assert.equal(api.code, 0, api.output);
    await ptbk(['add', 'Summarize the news QUOTA_NATIVE', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const started = Date.now();
    const run = await drive(project, env, async () => findGenerated(await subjects(project), 'Summarize the news QUOTA_NATIVE', 'ptbk: '), { args: ['--harness', 'openai-codex'], message: 'the result through the fallback' });
    assert.equal(run.code, 0, run.output);
    assert.ok(Date.now() - started < 120_000, 'no wait through the exhausted account’s reset');
    assert.match(run.output, /same-variant fallback/);
    const turns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((turn) => turn.title.startsWith('Summarize the news'));
    assert.deepEqual(turns.map((turn) => turn.api), [false, true], 'native first, then the configured API fallback');
    assert.equal(turns[1].apiKey, 'fallback-secret', 'the instance gets exactly its own credential');
    assert.ok((await subjects(project)).some((subject) => /^ptbk: Summarize the news/.test(subject)));
});
