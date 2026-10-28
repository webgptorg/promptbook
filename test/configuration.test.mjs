import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { compareVersions } from '../dist/common/semver.js';
import { HarnessPool } from '../dist/engine/harnesses.js';
import { canonicalizeConfig, configText, interpretConfig, parseConfigText, resolveSettings } from '../dist/project/config.js';
import { maintainProjectConfiguration } from '../dist/project/configuration.js';
import { applyConfigurationMigration, planConfigurationMigration, PRE_VERSIONING_BASELINE } from '../dist/project/migrations.js';
import { projectAt } from '../dist/project/workspace.js';
import { editDotEnv, parseEnvironmentReference, readDotEnv, resolveVariable } from '../dist/tools/environment.js';
import { parseTools } from '../dist/tools/normalize.js';
import { fakeHarness, git, initRepository, subjects, temporaryDirectory } from './helpers.mjs';

/**
 * The unversioned configuration format of engines before versioned configuration (singleton browser, harness map).
 */
const LEGACY = {
    version: 1,
    routing: { harness: 'openai-codex', model: 'gpt-x' },
    execution: { check: 'npm test', checkBefore: 'yes-and-fix', gitChanges: 'ignore', commit: true, isolate: false, questions: false, autoPull: true, autoPush: true },
    traces: { commit: true, ignoreVideos: false, recordVideo: false },
    server: { enabled: true, tunnel: { enabled: false, provider: 'cloudflare-named' } },
    service: { persist: false, qr: false, harnessUpdates: 'off' },
    discovery: { enabled: false },
    learning: { enabled: true },
    browser: { profile: 'isolated', mode: 'headful', executable: '/opt/chromium/chrome' },
    harnesses: {
        'openai-codex': { enabled: true, model: 'gpt-5-codex', thinkingLevel: 'high', apiKeyEnv: 'OPENAI_API_KEY' },
        'claude-code': { enabled: false, models: ['opus'] },
    },
    custom: { keep: true },
};

test('semantic versions: numeric prereleases, stable after prerelease, malformed rejected', () => {
    assert.equal(compareVersions('0.119.0-9', '0.119.0-10'), -1, '9 < 10 numerically, not lexicographically');
    assert.equal(compareVersions('0.119.0-10', '0.119.0'), -1, 'a prerelease precedes its stable release');
    assert.equal(compareVersions('0.119.0', '0.120.0'), -1);
    assert.equal(compareVersions('1.2.3+build.1', '1.2.3'), 0, 'build metadata does not change precedence');
    assert.equal(compareVersions('not-a-version', '1.0.0'), undefined);
});

test('migration versions: malformed identifiers are rejected and large numeric identifiers remain ordered', () => {
    for (const version of ['01.2.3', '1.02.3', '1.2.03', '1.2.3-01', '1.2.3-a..b', '1.2.3-.', '1.2.3+build..1', '1.2.3+.']) {
        assert.equal(compareVersions(version, '1.2.3'), undefined, `${version} is malformed`);
        assert.equal(planConfigurationMigration({ promptbookVersion: version }, '1.2.3').kind, 'invalid', `${version} cannot authorize a migration`);
    }
    assert.equal(compareVersions('1.2.3-9007199254740992', '1.2.3-9007199254740993'), -1);
    assert.equal(compareVersions('9007199254740992.0.0', '9007199254740993.0.0'), -1);
    assert.equal(compareVersions('1.2.3-alpha.9', '1.2.3-alpha.10'), -1);
    assert.equal(compareVersions('1.2.3-9', '1.2.3-alpha'), -1);
    assert.equal(compareVersions('1.2.3-alpha', '1.2.3-alpha.0'), -1);
    assert.equal(compareVersions('v1.2.3+build.01', '1.2.3+other'), 0, 'existing CLI prefixes and valid build identifiers stay supported');
});

test('migration planning: equal is a no-op, older engine refuses, missing version is the fixed baseline, sparse ordered steps', () => {
    const step = (target) => ({ target, title: target, migrate: () => ({ notes: [], problems: [] }) });
    const chain = [step('0.120.0-3'), step('0.119.0-22'), step('0.121.0')];
    assert.deepEqual(planConfigurationMigration({ promptbookVersion: '0.119.0-30' }, '0.119.0-30', chain), { kind: 'current', version: '0.119.0-30' });
    assert.equal(planConfigurationMigration({ promptbookVersion: '0.121.0' }, '0.119.0-30', chain).kind, 'older-engine');
    assert.equal(planConfigurationMigration({ promptbookVersion: 'banana' }, '0.119.0-30', chain).kind, 'invalid');
    assert.equal(planConfigurationMigration({ promptbookVersion: 7 }, '0.119.0-30', chain).kind, 'invalid');
    const fromBaseline = planConfigurationMigration({ tools: 'ignored shape' }, '0.120.0-5', chain);
    assert.equal(PRE_VERSIONING_BASELINE, '0.119.0-21');
    assert.equal(fromBaseline.kind, 'migrate');
    assert.equal(fromBaseline.from, PRE_VERSIONING_BASELINE, 'no shape analysis: an absent version is always the baseline');
    assert.deepEqual(fromBaseline.steps.map((item) => item.target), ['0.119.0-22', '0.120.0-3'], 'only C < target <= E, in version order');
    const gap = planConfigurationMigration({ promptbookVersion: '0.120.0-3' }, '0.120.0-9', chain);
    assert.equal(gap.kind, 'migrate');
    assert.deepEqual(gap.steps, [], 'a version-only pass has zero steps');
    const migrated = applyConfigurationMigration({ promptbookVersion: '0.120.0-3', custom: 1 }, gap);
    assert.equal(migrated.raw.promptbookVersion, '0.120.0-9', 'the coordinator stamps the final version');
});

test('first migration: browser and harness map become named tools; canonical booleans and enums; autosync off; secrets and unrelated data kept', () => {
    const plan = planConfigurationMigration(LEGACY, '0.119.0-22');
    assert.equal(plan.kind, 'migrate');
    const { raw, problems } = applyConfigurationMigration(LEGACY, plan);
    const result = canonicalizeConfig(raw).raw;
    assert.deepEqual(problems, []);
    assert.equal(result.promptbookVersion, '0.119.0-22');
    assert.equal(result.isAutoSync, false, 'legacy auto-pull/auto-push never enable synchronization');
    assert.equal(result.execution.autoPull, undefined);
    assert.equal(result.execution.autoPush, undefined);
    assert.equal(result.version, undefined, 'the former schema counter is retired');
    assert.equal(result.browser, undefined);
    assert.equal(result.harnesses, undefined);
    assert.deepEqual(result.tools, [
        { type: 'BROWSER', variant: 'CHROMIUM', name: 'project-browser', isEnabled: true, profile: { source: 'PROJECT' }, isHeadless: false, executable: '/opt/chromium/chrome' },
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'openai-codex', isEnabled: true, authentication: 'NATIVE', apiKey: '${{ env.OPENAI_API_KEY }}', model: 'gpt-5-codex', thinkingLevel: 'HIGH' },
        { type: 'HARNESS', variant: 'CLAUDE_CODE', name: 'claude-code', isEnabled: false, authentication: 'NATIVE', models: ['opus'] },
    ]);
    assert.deepEqual(result.execution, { check: 'npm test', checkBefore: 'YES_AND_FIX', gitChanges: 'IGNORE', isCommitEnabled: true, isIsolated: false, isQuestionsEnabled: false }, 'false values survive the renames');
    assert.deepEqual(result.traces, { isCommitted: true, isVideoIgnored: false, isVideoRecordingEnabled: false });
    assert.deepEqual(result.server, { isEnabled: true }, 'current normalization retires obsolete tunnels while preserving local HTTP');
    assert.deepEqual(result.service, { isPersistent: false, harnessUpdates: 'OFF' }, 'current normalization retires obsolete QR settings while preserving persistence');
    assert.deepEqual(result.discovery, { isEnabled: false });
    assert.equal(result.routing.harness, 'openai-codex', 'the former routing default stays for the 0.119.0-32 step');
    assert.equal(result.routing.model, 'gpt-x', 'provider model identifiers are not enums');
    assert.deepEqual(result.custom, { keep: true });
    // Recovery of an interrupted pass never duplicates tools.
    const again = applyConfigurationMigration({ ...result, promptbookVersion: undefined }, planConfigurationMigration({ ...result, promptbookVersion: undefined }, '0.119.0-22'));
    assert.equal(again.raw.tools.length, 3);
    for (const [source, expected] of [['global', { source: 'MANAGED_GLOBAL' }], ['user', { source: 'USER_EXISTING' }], ['/profiles/work', { source: 'CUSTOM', path: '/profiles/work' }], [undefined, { source: 'MANAGED_GLOBAL' }]]) {
        const legacy = { browser: source === undefined ? undefined : { profile: source } };
        const migrated = applyConfigurationMigration(legacy, planConfigurationMigration(legacy, '0.119.0-22')).raw;
        assert.deepEqual(migrated.tools[0].profile, expected, `browser.profile ${source}`);
        assert.equal(migrated.tools[0].isHeadless, true, 'the default headless mode is kept when omitted');
    }
});

test('first migration: collisions and unknown entries are kept for repair, never overwritten or guessed', () => {
    const legacy = { tools: [{ type: 'HARNESS', variant: 'CLAUDE_CODE', name: 'openai-codex' }], harnesses: { 'openai-codex': { enabled: true }, 'mystery-agent': { enabled: true } }, execution: { commit: false, isCommitEnabled: true } };
    const { raw, problems } = applyConfigurationMigration(legacy, planConfigurationMigration(legacy, '0.119.0-22'));
    assert.ok(problems.some((problem) => /collides/.test(problem.message)));
    assert.ok(problems.some((problem) => /mystery-agent/.test(problem.location)));
    assert.ok(problems.some((problem) => /execution\.commit/.test(problem.location)), 'conflicting old/new booleans are a repair problem');
    assert.deepEqual(Object.keys(raw.harnesses).sort(), ['mystery-agent', 'openai-codex'], 'unrepresentable legacy entries stay');
    assert.equal(raw.execution.commit, false);
    assert.equal(raw.execution.isCommitEnabled, true);
});

test('naming: canonical input round-trips unchanged; tolerant spellings are corrected; collisions, unknown variants and inline secrets are problems', () => {
    const canonical = { promptbookVersion: '1.0.0', isAutoSync: false, execution: { checkBefore: 'NO' }, tools: [{ type: 'BROWSER', variant: 'CHROME', name: 'work-browser', isEnabled: true, profile: { source: 'MANAGED_GLOBAL' }, isHeadless: true }] };
    const roundTrip = canonicalizeConfig(canonical);
    assert.deepEqual(roundTrip.corrections, []);
    assert.equal(configText(roundTrip.raw), configText(canonical));
    const sloppy = canonicalizeConfig({ IsAutoSync: 'true', execution: { 'check-before': 'yes and fail' }, tools: [{ Type: 'browser', variant: 'chrome', name: 'Work Browser', 'is-enabled': false, profile: { source: 'managed-global' } }] });
    assert.equal(sloppy.raw.isAutoSync, true);
    assert.equal(sloppy.raw.execution.checkBefore, 'YES_AND_FAIL');
    assert.deepEqual(sloppy.raw.tools[0], { type: 'BROWSER', variant: 'CHROME', name: 'work-browser', isEnabled: false, profile: { source: 'MANAGED_GLOBAL' } });
    assert.ok(sloppy.corrections.length >= 6);
    const colliding = parseTools([
        { type: 'BROWSER', variant: 'CHROME', name: 'Work Browser' },
        { type: 'BROWSER', variant: 'CHROME', name: 'work-browser' },
        { type: 'HARNESS', variant: 'TOTALLY_NEW', name: 'x' },
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'paid', authentication: 'API_KEY', apiKey: 'sk-live-123' },
    ]);
    assert.equal(colliding.tools.length, 0, 'nothing ambiguous or invalid is used');
    assert.ok(colliding.problems.some((problem) => /share the name "work-browser"/.test(problem.message)));
    assert.equal(colliding.canonical[0].name, 'Work Browser', 'colliding names are not silently renamed');
    assert.ok(colliding.problems.some((problem) => /unknown harness variant/.test(problem.message)));
    assert.ok(colliding.problems.every((problem) => !problem.message.includes('sk-live-123')), 'secrets never appear in diagnostics');
});

test('configuration coordinator: one migration commit; repeated loads are no-ops; no-commit, dirty edits and older engines never write', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    const project = projectAt(root);
    await writeFile(project.configPath, `${JSON.stringify(LEGACY, null, 4)}\n`);
    await writeFile(join(root, 'notes.md'), 'unrelated\n');
    await git(root, ['add', '-A']);
    await git(root, ['commit', '-q', '-m', 'Legacy project']);
    await writeFile(join(root, 'notes.md'), 'unrelated work in progress\n');
    const original = await readFile(project.configPath, 'utf8');

    // Read-only interpretation applies the migration in memory only.
    const interpreted = interpretConfig(parseConfigText(original), {}, '0.119.0-22');
    assert.equal(interpreted.migration.kind, 'migrate');
    assert.equal(interpreted.tools.length, 3);
    assert.equal(await readFile(project.configPath, 'utf8'), original);

    await assert.rejects(maintainProjectConfiguration(project, { commit: false, engineVersion: '0.119.0-22' }), /must be committed/);
    assert.equal(await readFile(project.configPath, 'utf8'), original, 'no-commit is diagnosed before any write');
    await writeFile(project.configPath, original.replace('"custom"', '"customized"'));
    await assert.rejects(maintainProjectConfiguration(project, { commit: true, engineVersion: '0.119.0-22' }), /uncommitted edits/);
    await writeFile(project.configPath, original);

    const outcome = await maintainProjectConfiguration(project, { commit: true, engineVersion: '0.121.0', env: { ...process.env, CODING_AGENT_GIT_NAME: 'Fixture', CODING_AGENT_GIT_EMAIL: 'f@example.test' } });
    assert.equal(outcome.migrated.from, PRE_VERSIONING_BASELINE);
    assert.deepEqual(outcome.migrated.steps, ['0.119.0-22', '0.119.0-32', '0.119.0-35'], 'every applicable sparse step, in order, in one pass');
    assert.deepEqual(await subjects(root), [`ptbk: Migrate project from ${PRE_VERSIONING_BASELINE} to 0.121.0`, 'Legacy project']);
    const body = (await git(root, ['log', '-1', '--format=%B'])).trim();
    assert.match(body, /harnesses\.openai-codex → tools "openai-codex"/);
    assert.match(body, /PTBK-Configuration-Migration: 0\.119\.0-21 -> 0\.121\.0/);
    assert.deepEqual((await git(root, ['show', '--name-only', '--format=', 'HEAD'])).trim().split('\n'), ['agents/.core/router.book', 'agents/.core/tasker.book', 'ptbk.json'], 'configuration and Books in one commit');
    assert.equal((await git(root, ['status', '--porcelain'])).trim(), 'M notes.md', 'unrelated work stays uncommitted');
    const migratedConfig = JSON.parse(await readFile(project.configPath, 'utf8'));
    assert.equal(migratedConfig.promptbookVersion, '0.121.0');
    assert.equal(migratedConfig.routing, undefined, 'former routing defaults leave ptbk.json once Router carries them');
    assert.ok(migratedConfig.tools.every((tool) => tool.model === undefined && tool.thinkingLevel === undefined && tool.models === undefined), 'no per-tool model settings remain');
    const router = await readFile(join(root, 'agents', '.core', 'router.book'), 'utf8');
    assert.match(router, /^MODEL harness=OPENAI_CODEX model=gpt-x thinking=high runtime=official$/m, 'Router is directly runnable from the former defaults');
    assert.match(router, /RULE Former ptbk\.json preference of the harness tool "openai-codex" \(OpenAI Codex\): prefer model gpt-5-codex; thinking high\./);

    assert.deepEqual(await maintainProjectConfiguration(project, { commit: true, engineVersion: '0.121.0' }), {}, 'a repeated start creates no commit');
    await assert.rejects(maintainProjectConfiguration(project, { commit: true, engineVersion: '0.120.0' }), /older/);
    assert.equal((await subjects(root)).length, 2);

    // Deterministic spelling corrections of a current configuration are their own commit, once.
    const current = JSON.parse(await readFile(project.configPath, 'utf8'));
    current.tools[0].variant = 'chromium';
    await writeFile(project.configPath, configText(current));
    await git(root, ['commit', '-q', '-am', 'Manual edit']);
    const normalized = await maintainProjectConfiguration(project, { commit: true, engineVersion: '0.121.0' });
    assert.match(normalized.normalized.corrections[0], /tools\[0\]\.variant: chromium → CHROMIUM/);
    assert.equal((await subjects(root))[0], 'ptbk: Normalize project configuration');
    assert.deepEqual(await maintainProjectConfiguration(project, { commit: true, engineVersion: '0.121.0' }), {});
});

test('environment references and .env: bounded notation, process precedence, non-destructive audited edits', async (t) => {
    const root = await temporaryDirectory(t);
    assert.equal(parseEnvironmentReference('${{ env.COMPANY_KEY }}'), 'COMPANY_KEY');
    assert.equal(parseEnvironmentReference('${{env.A1}}'), 'A1');
    assert.equal(parseEnvironmentReference('${{ env.A + B }}'), undefined, 'no expression language');
    assert.equal(parseEnvironmentReference('sk-123'), undefined);
    await writeFile(join(root, '.env'), '# my notes\r\nOTHER=1\r\nKEY=old\r\n');
    const added = await editDotEnv(root, [{ kind: 'set', name: 'NEW_KEY', value: 'secret value' }], { reason: 'add tool x', operation: 'ptbk tool add …', timeZone: 'UTC' });
    assert.equal(added.changed, true);
    const replaced = await editDotEnv(root, [{ kind: 'set', name: 'KEY', value: 'new' }], { reason: 'rotate', operation: 'ptbk tool modify x', timeZone: 'UTC' });
    assert.equal(replaced.changed, true);
    assert.equal((await editDotEnv(root, [{ kind: 'set', name: 'KEY', value: 'new' }], { reason: 'rotate', operation: 'again', timeZone: 'UTC' })).changed, false, 'a repeated edit adds no duplicate');
    await editDotEnv(root, [{ kind: 'retire', name: 'OTHER' }], { reason: 'remove tool y', operation: 'ptbk tool remove y', timeZone: 'UTC' });
    const text = await readFile(join(root, '.env'), 'utf8');
    assert.ok(text.startsWith('# my notes\r\n'), 'unrelated comments and CRLF line endings are kept');
    assert.match(text, /# \d{4}-\d{2}-\d{2}T[^ ]+ ptbk: commented out the previous value \(replaced below\) — rotate \(ptbk tool modify x\)\r\n# KEY=old\r\n# [^\r]+ ptbk: added — rotate[^\r]*\r\nKEY=new\r\n/);
    assert.match(text, /ptbk: commented out \(no remaining consumer\) — remove tool y[^\r]*\r\n# OTHER=1/);
    assert.match(text, /NEW_KEY="secret value"/);
    assert.doesNotMatch(text.split('\n').filter((line) => line.startsWith('#')).join('\n'), /secret value|new\b(?!.*replaced)/, 'audit comments never contain values');
    const dotEnv = await readDotEnv(root);
    assert.deepEqual(resolveVariable('KEY', {}, dotEnv), { name: 'KEY', source: '.env', value: 'new' });
    assert.deepEqual(resolveVariable('KEY', { KEY: 'from shell' }, dotEnv), { name: 'KEY', source: 'environment', value: 'from shell' }, 'the process environment wins');
    assert.equal(resolveVariable('OTHER', {}, dotEnv).source, 'missing', 'a retired line is inactive');
    await writeFile(join(root, '.env'), 'DUP=a\nDUP=b\n');
    assert.equal(resolveVariable('DUP', {}, await readDotEnv(root)).source, 'ambiguous');
    await assert.rejects(editDotEnv(root, [{ kind: 'set', name: 'DUP', value: 'c' }], { reason: 'x', operation: 'y' }), /several times/);
    assert.equal(await readFile(join(root, '.env'), 'utf8'), 'DUP=a\nDUP=b\n', 'an ambiguous file is left untouched');
});

test('environment precedence: an explicitly empty process value prevents use of a file credential', async (t) => {
    const root = await temporaryDirectory(t);
    await writeFile(join(root, '.env'), 'KEY=file-credential\n');
    const dotEnv = await readDotEnv(root);
    assert.deepEqual(resolveVariable('KEY', { KEY: '' }, dotEnv), { name: 'KEY', source: 'missing' });
    assert.equal(resolveVariable('KEY', { KEY: undefined }, dotEnv).value, 'file-credential', 'only an absent process value permits fallback');
    await writeFile(join(root, '.env'), 'KEY=first\nKEY=second\n');
    assert.deepEqual(resolveVariable('KEY', { KEY: '' }, await readDotEnv(root)), { name: 'KEY', source: 'missing' }, 'explicit process precedence also applies to an ambiguous file');
});

test('environment edits: literal escapes round-trip and unrelated final-newline formatting is preserved', async (t) => {
    const root = await temporaryDirectory(t);
    const original = '# user formatting\r\nOTHER=untouched';
    const audit = { reason: 'rotate fixture credential', operation: 'tool edit', timeZone: 'UTC' };
    await writeFile(join(root, '.env'), original);
    for (const value of ['literal\\nsequence', 'literal\\\\nsequence', 'quote" and \\ path', "single'quote", ' space # value ']) {
        assert.equal((await editDotEnv(root, [{ kind: 'set', name: 'KEY', value }], audit)).changed, true);
        const text = await readFile(join(root, '.env'), 'utf8');
        assert.ok(text.startsWith(original), 'unrelated content remains intact');
        assert.ok(!text.endsWith('\n'), 'an existing file without a final newline keeps that convention');
        assert.ok(!text.replaceAll('\r\n', '').includes('\n'), 'CRLF stays consistent');
        assert.equal(resolveVariable('KEY', {}, await readDotEnv(root)).value, value, 'execution receives exactly the stored credential');
        assert.equal((await editDotEnv(root, [{ kind: 'set', name: 'KEY', value }], audit)).changed, false, 'retrying the same secret is a no-op');
        assert.equal(await readFile(join(root, '.env'), 'utf8'), text, 'a retry adds no history or comments');
    }
    await editDotEnv(root, [{ kind: 'retire', name: 'KEY' }], audit);
    assert.equal(resolveVariable('KEY', {}, await readDotEnv(root)).source, 'missing');
    assert.ok(!(await readFile(join(root, '.env'), 'utf8')).endsWith('\n'));
});

test('API harness readiness: empty process credentials use the configured fallback; file credentials refresh exactly', async (t) => {
    const root = await temporaryDirectory(t);
    const { env: base } = await fakeHarness(t, root);
    const env = { ...base, KEY: '', CODEX_API_KEY: 'unrelated-ambient-credential' };
    const settings = resolveSettings({ file: { tools: ['primary', 'fallback'].map((name) => ({
        type: 'HARNESS', variant: 'OPENAI_CODEX', name, authentication: 'API_KEY',
        apiKey: name === 'primary' ? '${{ env.KEY }}' : '${{ env.FALLBACK_KEY }}',
    })) } });
    const value = 'literal\\ncredential';
    await editDotEnv(root, [{ kind: 'set', name: 'KEY', value }, { kind: 'set', name: 'FALLBACK_KEY', value: 'fallback-credential' }], { reason: 'fixture setup', operation: 'add API tools', timeZone: 'UTC' });
    const pool = new HarnessPool(root, settings, env);
    await pool.refresh();
    assert.equal(pool.inspectionOf('primary').usable, false);
    assert.equal(pool.environment(pool.instance('primary')).CODEX_API_KEY, undefined, 'neither the file nor an unrelated ambient key is sent');
    assert.equal(pool.select('openai-codex').name, 'fallback', 'normal same-variant fallback remains available');
    assert.doesNotMatch(JSON.stringify(pool.all()), /literal|fallback-credential|unrelated-ambient-credential/, 'readiness output contains no credentials');
    delete env.KEY;
    await pool.refresh();
    assert.equal(pool.select('openai-codex').name, 'primary', 'removing the process override reveals the file credential without a restart');
    assert.equal(pool.environment(pool.instance('primary')).CODEX_API_KEY, value, 'the execution environment keeps literal backslash sequences');
});

test('project migration 0.119.0-32: Manager becomes Router, references follow, task controls become one MODEL, dirty Books are protected', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    const project = projectAt(root);
    const write = async (path, text) => {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(join(root, path, '..'), { recursive: true });
        await writeFile(join(root, path), text);
    };
    const config = {
        promptbookVersion: '0.119.0-30',
        routing: { defaultAgent: 'Developer', preferences: 'Use the cheapest capable model.' },
        tools: [{ type: 'HARNESS', variant: 'CLAUDE_CODE', name: 'claude-code', isEnabled: true, authentication: 'NATIVE', model: 'opus' }],
    };
    await writeFile(project.configPath, `${JSON.stringify(config, null, 4)}\n`);
    const manager = 'AGENT Manager\nNOTE Fills missing execution choices of tasks: the responsible agent, harness, model and thinking level.\nPERSONA You are the Manager of this project\'s agents. You route work; you do not implement it.\nRULE Learned: route documentation to Copywriter.\n';
    await write('agents/.core/manager.book', manager);
    await write('agents/.core/chatter.book', 'AGENT Chatter\nTEAM Consult @Developer and {Manager} about routing.\n');
    await write('agents/developer.book', 'AGENT Developer\nMODEL gpt-5\n');
    await write('tasks/a.book', 'TASK Old routed work\nGOAL Keep it.\nTASK AGENT @Manager\nTASK HARNESS claude-code\nTASK MODEL sonnet\nTASK THINKING LEVEL high\nTASK PRIORITY 2\n');
    await write('tasks/b.book', 'TASK Account bound work\nTASK HARNESS some-tool-name\n');
    await write('chats/c.book', 'CHAT Old chat\nCHAT MEMBER @User\nCHAT MEMBER @Manager\nCHAT STATUS open\n\nCHAT MESSAGE @Manager 2026-01-01T00:00:00+00:00\nI am @Manager.\n\n');
    await git(root, ['add', '-A']);
    await git(root, ['commit', '-q', '-m', 'Project at 0.119.0-30']);
    const env = { ...process.env, CODING_AGENT_GIT_NAME: 'Fixture', CODING_AGENT_GIT_EMAIL: 'f@example.test' };

    // A Book with uncommitted edits is never rewritten (nothing is written, the pass waits).
    await writeFile(join(root, 'tasks', 'a.book'), `${await readFile(join(root, 'tasks', 'a.book'), 'utf8')}TASK NOTE editing\n`);
    await assert.rejects(maintainProjectConfiguration(project, { commit: true, engineVersion: '0.119.0-32', env }), /uncommitted edits/);
    assert.equal(JSON.parse(await readFile(project.configPath, 'utf8')).promptbookVersion, '0.119.0-30', 'no false version advance');
    await git(root, ['checkout', '--', 'tasks/a.book']);

    const outcome = await maintainProjectConfiguration(project, { commit: true, engineVersion: '0.119.0-32', env });
    assert.deepEqual(outcome.migrated.steps, ['0.119.0-32']);
    assert.equal((await subjects(root)).length, 2, 'exactly one commit for the whole pass');
    const changed = (await git(root, ['show', '--name-status', '--format=', 'HEAD'])).trim().split('\n').map((line) => line.split('\t').filter(Boolean).join(' '));
    for (const expected of ['M agents/.core/chatter.book', 'A agents/.core/tasker.book', 'M agents/developer.book', 'M chats/c.book', 'M ptbk.json', 'M tasks/a.book']) assert.ok(changed.includes(expected), `${expected} in ${changed.join(', ')}`);
    assert.ok(changed.some((line) => /^R\d* agents\/\.core\/manager\.book agents\/\.core\/router\.book$/.test(line) || line === 'A agents/.core/router.book'), 'manager.book became router.book');
    const router = await readFile(join(root, 'agents', '.core', 'router.book'), 'utf8');
    assert.match(router, /^AGENT Router$/m);
    assert.match(router, /RULE Learned: route documentation to Copywriter\./, 'customized and learned content is kept');
    assert.match(router, /PERSONA You are the Router of this project's agents/);
    assert.match(router, /^RULE Use the cheapest capable model\.$/m, 'routing.preferences became an instruction');
    assert.match(router, /^MODEL harness=CLAUDE_CODE model=opus thinking=medium runtime=official$/m, 'concrete bootstrap from the first enabled tool and plugin defaults');
    assert.match(await readFile(join(root, 'agents', '.core', 'chatter.book'), 'utf8'), /Consult @Developer and @Router about routing/);
    assert.match(await readFile(join(root, 'agents', 'developer.book'), 'utf8'), /^MODEL model=gpt-5$/m, 'an unambiguous legacy agent MODEL gets the shared syntax');
    const task = await readFile(join(root, 'tasks', 'a.book'), 'utf8');
    assert.match(task, /^TASK AGENT @Router$/m);
    assert.match(task, /^MODEL harness=CLAUDE_CODE model=sonnet thinking=high$/m, 'one MODEL with the same conjunctive meaning');
    assert.doesNotMatch(task, /TASK HARNESS|TASK MODEL|TASK THINKING LEVEL/);
    assert.match(await readFile(join(root, 'tasks', 'b.book'), 'utf8'), /TASK HARNESS some-tool-name/, 'an account-bound former control is kept for repair');
    const chat = await readFile(join(root, 'chats', 'c.book'), 'utf8');
    assert.match(chat, /^CHAT MEMBER @Router$/m);
    assert.match(chat, /CHAT MESSAGE @Manager 2026-01-01T00:00:00\+00:00\nI am @Manager\./, 'chat history is never rewritten');
    const migratedConfig = JSON.parse(await readFile(project.configPath, 'utf8'));
    assert.deepEqual(migratedConfig.routing, { defaultAgent: 'Developer' });
    assert.equal(migratedConfig.tools[0].model, undefined);
    assert.match((await git(root, ['log', '-1', '--format=%B'])).trim(), /Kept for repair:[\s\S]*tasks\/b\.book/);
    assert.deepEqual(await maintainProjectConfiguration(project, { commit: true, engineVersion: '0.119.0-32', env }), {}, 'a repeated pass is a no-op');
});
