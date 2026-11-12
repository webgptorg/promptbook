import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { ENGINE_VERSION } from '../dist/common/version.js';
import { applyConfigurationMigration, planConfigurationMigration } from '../dist/project/migrations.js';
import { interpretConfig, resolveSettings } from '../dist/project/config.js';
import { projectAt } from '../dist/project/workspace.js';
import { parseTools, serializeTool } from '../dist/tools/normalize.js';
import { applyToolOperation, recordFromDraft } from '../dist/tools/operations.js';
import { inspectComputerPlatform, baselineWait } from '../dist/tools/readiness.js';
import { git, initializedProject, initRepository, ptbk, temporaryDirectory } from './helpers.mjs';

/** Applies just the desktop-introducing upgrade to a previously current project. */
function upgrade(raw) {
    const plan = planConfigurationMigration({ promptbookVersion: '0.119.0-96', ...raw }, '0.119.0-97');
    assert.equal(plan.kind, 'migrate');
    return applyConfigurationMigration({ promptbookVersion: '0.119.0-96', ...raw }, plan);
}

test('native desktop configuration: canonical category, common fields only, no harness authentication', () => {
    const tool = recordFromDraft({ type: 'computer-control', variant: 'native', name: 'Computer Control' });
    assert.deepEqual(tool, { type: 'COMPUTER_CONTROL', variant: 'NATIVE', name: 'computer-control', isEnabled: true });
    assert.deepEqual(serializeTool(tool), tool);
    assert.deepEqual(parseTools([{ ...tool, isEnabled: false }]).tools[0], { ...tool, isEnabled: false });
    assert.throws(() => recordFromDraft({ type: 'COMPUTER_CONTROL', variant: 'NATIVE', name: 'desktop', authentication: 'NATIVE' }), /does not apply/);
    assert.throws(() => recordFromDraft({ type: 'COMPUTER_CONTROL', variant: 'CHROME', name: 'desktop' }), /Unknown computer control variant/);
    assert.ok(parseTools([{ ...tool, profile: { source: 'PROJECT' } }]).problems.some((item) => /does not apply/.test(item.message)));
});

test('desktop migration: enabled once, collision-safe name, interruption idempotence and privacy defaults', () => {
    const prior = { tools: [{ type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'computer-control', isEnabled: true, authentication: 'NATIVE' }] };
    const result = upgrade(prior);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.raw.tools[1], { type: 'COMPUTER_CONTROL', variant: 'NATIVE', name: 'computer-control-2', isEnabled: true });
    assert.deepEqual(result.raw.traces, { isVideoRecordingEnabled: false, isVideoIgnored: true });
    assert.equal(upgrade({ ...result.raw, promptbookVersion: '0.119.0-96' }).raw.tools.length, 2, 'recovery before version stamping does not duplicate it');
    const deleted = { ...result.raw, tools: result.raw.tools.filter((tool) => tool.type !== 'COMPUTER_CONTROL') };
    assert.equal(planConfigurationMigration(deleted, '0.119.0-97').kind, 'current', 'saved migration version protects intentional removal');
    assert.equal(interpretConfig({ raw: deleted, exists: true, diagnostics: [] }, {}, '0.119.0-97').tools.some((tool) => tool.type === 'COMPUTER_CONTROL'), false);
});

test('desktop migration: existing disabled/invalid records and explicit recording choices are preserved', () => {
    const disabled = { Type: 'computer-control', variant: 'NATIVE', name: 'my-desktop', isEnabled: false, futureOption: 'retained' };
    const raw = { tools: [disabled], traces: { isVideoRecordingEnabled: true, isVideoIgnored: false } };
    const result = upgrade(raw);
    assert.deepEqual(result.raw.tools, [disabled]);
    assert.deepEqual(result.raw.traces, raw.traces);
    assert.deepEqual(raw.tools, [disabled], 'pure migration does not mutate caller');
    const bad = upgrade({ tools: { invalid: true } });
    assert.equal(bad.problems[0].severity, 'error');
    assert.deepEqual(bad.raw.tools, { invalid: true });
    const defaults = resolveSettings({ file: {} });
    assert.equal(defaults.values['traces.isVideoRecordingEnabled'], false);
    assert.equal(defaults.values['traces.isVideoIgnored'], true);
    assert.equal(defaults.values['computer.isRecordingEnabled'], false);
    assert.equal(resolveSettings({ file: { computer: { isRecordingEnabled: true } } }).values['computer.isRecordingEnabled'], true);
});

test('desktop availability: unavailable optional desktop never blocks independent work or fabricates permissions', () => {
    assert.equal(inspectComputerPlatform('linux', 'x64').usable, false);
    assert.equal(inspectComputerPlatform('darwin', 'x64').usable, false);
    assert.equal(inspectComputerPlatform('darwin', 'arm64').usable, undefined);
    assert.equal(inspectComputerPlatform('win32', 'x64').usable, undefined);
    assert.equal(baselineWait([
        { type: 'HARNESS', state: 'usable', isEnabled: true },
        { type: 'BROWSER', state: 'usable', isEnabled: true },
        { type: 'COMPUTER_CONTROL', state: 'unavailable', isEnabled: true },
    ]), undefined);
});

test('desktop disable/remove: no retained-use or last-tool acknowledgement delays an emergency revocation', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    const project = projectAt(root);
    const native = { type: 'COMPUTER_CONTROL', variant: 'NATIVE', name: 'computer-control', isEnabled: true };
    await writeFile(join(root, 'ptbk.json'), JSON.stringify({ promptbookVersion: ENGINE_VERSION, tools: [native] }));
    await git(root, ['add', 'ptbk.json']);
    await git(root, ['commit', '-qm', 'Fixture']);
    const context = { env: process.env, inUse: new Set(['computer-control']) };
    const disabled = await applyToolOperation(project, { operation: { kind: 'disable', name: 'computer-control' } }, context);
    assert.equal(disabled.status, 'applied');
    assert.equal(JSON.parse(await readFile(project.configPath, 'utf8')).tools[0].isEnabled, false);
    assert.ok(disabled.notes.some((note) => /stops immediately/.test(note)));
    const removed = await applyToolOperation(project, { operation: { kind: 'remove', name: 'computer-control' } }, context);
    assert.equal(removed.status, 'applied');
    assert.deepEqual(JSON.parse(await readFile(project.configPath, 'utf8')).tools, []);
});


test('init: default enabled desktop is added once; an intentional removal survives reinitialization', async (t) => {
    const { project, env } = await initializedProject(t);
    const load = async () => JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    const initial = await load();
    assert.deepEqual(initial.tools.filter((tool) => tool.type === 'COMPUTER_CONTROL'), [{ type: 'COMPUTER_CONTROL', variant: 'NATIVE', name: 'computer-control', isEnabled: true }]);
    const remove = await ptbk(['tool', 'remove', 'computer-control', '--raw'], { cwd: project, env });
    assert.equal(remove.code, 0, remove.output);
    const again = await ptbk(['init', '--non-interactive', '--no-start', '--raw'], { cwd: project, env });
    assert.equal(again.code, 0, again.output);
    assert.equal((await load()).tools.some((tool) => tool.type === 'COMPUTER_CONTROL'), false);
});
