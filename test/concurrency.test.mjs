import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { committed, drive, generated, git, initializedProject, ptbk, subjects, withoutVisual } from './helpers.mjs';

/**
 * Adds one task (committed by `ptbk add`).
 */
async function addTask(project, env, title) {
    const added = await ptbk(['add', title, '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal(added.code, 0, added.output);
}

/**
 * Files changed by the newest commit whose subject is the generated task name.
 */
async function resultFiles(project, title) {
    const subject = await committed(project, title);
    assert.ok(subject, `the result commit of ${title}`);
    const sha = (await git(project, ['log', '--format=%H%x09%s'])).trim().split('\n').map((line) => line.split('\t').map(withoutVisual)).find(([, line]) => line === subject)[0];
    return (await git(project, ['show', '--name-only', '--format=', sha])).trim().split('\n').filter(Boolean);
}

/**
 * Sets one ptbk.json execution setting as its own commit (before the engine starts).
 */
async function setExecution(project, key, value) {
    const path = join(project, 'ptbk.json');
    const config = JSON.parse(await readFile(path, 'utf8'));
    config.execution = { ...config.execution, [key]: value };
    await writeFile(path, `${JSON.stringify(config, null, 4)}\n`);
    await git(project, ['commit', '-q', '-m', `Set execution.${key}`, '--', 'ptbk.json']);
}

/**
 * Position of the first line of the event stream matching a pattern (-1 when absent).
 */
function position(output, pattern) {
    return events(output).findIndex((line) => pattern.test(line));
}

/**
 * Event lines without their time prefix.
 */
function events(output) {
    return output.split('\n').map((line) => line.replace(/^\d\d:\d\d:\d\d /, ''));
}

test('concurrent work: independent tasks overlap in the one working tree and each result commit holds only its own files', async (t) => {
    const { project, env } = await initializedProject(t);
    await addTask(project, env, 'Write alpha SLOW_WORK');
    await addTask(project, env, 'Write beta SLOW_WORK');
    const run = await drive(project, { ...env, FAKE_CODEX_SLOW_MS: '4000' }, async () => Boolean((await committed(project, 'Write alpha SLOW_WORK')) && (await committed(project, 'Write beta SLOW_WORK'))), { message: 'both results' });
    assert.equal(run.code, 0, run.output);
    const startedAlpha = position(run.output, /^Starting "Write alpha SLOW_WORK/);
    const startedBeta = position(run.output, /^Starting "Write beta SLOW_WORK/);
    const firstCommit = position(run.output, /^Committed \S+ ptbk: `[^`]+` Write (alpha|beta) SLOW_WORK/);
    assert.ok(startedAlpha >= 0 && startedBeta >= 0 && firstCommit >= 0, run.output);
    assert.ok(Math.max(startedAlpha, startedBeta) < firstCommit, `both tasks started before either result was committed:\n${run.output}`);
    assert.match(run.output, /alongside 1 other active unit/);
    const alpha = await resultFiles(project, 'Write alpha SLOW_WORK');
    const beta = await resultFiles(project, 'Write beta SLOW_WORK');
    assert.ok(alpha.some((file) => /^output\/.*alpha.*\.txt$/.test(file)) && !alpha.some((file) => /beta/.test(file)), `alpha's commit holds only alpha's files: ${alpha.join(', ')}`);
    assert.ok(beta.some((file) => /^output\/.*beta.*\.txt$/.test(file)) && !beta.some((file) => /alpha/.test(file)), `beta's commit holds only beta's files: ${beta.join(', ')}`);
    assert.equal((await git(project, ['branch', '--list', 'ptbk/*'])).trim(), '', 'no task branches');
    assert.equal((await git(project, ['worktree', 'list', '--porcelain'])).match(/^worktree /gm).length, 1, 'no task worktrees');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
});

test('concurrent work: execution.maxConcurrentWork 1 serializes tasks', async (t) => {
    const { project, env } = await initializedProject(t);
    await setExecution(project, 'maxConcurrentWork', 1);
    await addTask(project, env, 'First serial SLOW_WORK');
    await addTask(project, env, 'Second serial SLOW_WORK');
    const run = await drive(project, { ...env, FAKE_CODEX_SLOW_MS: '1500' }, async () => Boolean((await committed(project, 'First serial SLOW_WORK')) && (await committed(project, 'Second serial SLOW_WORK'))), { message: 'both serialized results' });
    assert.equal(run.code, 0, run.output);
    const lines = events(run.output);
    // Every start (Router prerequisites included) follows the previous unit's end: never two at once.
    assert.doesNotMatch(run.output, /alongside \d+ other active unit/, run.output);
    assert.ok(lines.filter((line) => /^Starting /.test(line)).length >= 2);
});

test('concurrent work: same-file work waits for the owner of the file and then continues', async (t) => {
    const { project, env } = await initializedProject(t);
    await addTask(project, env, 'Shared one CLAIM_SHARED');
    await addTask(project, env, 'Shared two CLAIM_SHARED');
    const run = await drive(project, { ...env, FAKE_CODEX_SLOW_MS: '3000' }, async () => Boolean((await committed(project, 'Shared one CLAIM_SHARED')) && (await committed(project, 'Shared two CLAIM_SHARED'))), { message: 'both same-file results' });
    assert.equal(run.code, 0, run.output);
    assert.match(run.output, /waits for output\/shared\.txt \(being changed by "Shared (one|two) CLAIM_SHARED/, `the second claim waited visibly:\n${run.output}`);
    const shared = await readFile(join(project, 'output', 'shared.txt'), 'utf8');
    assert.ok(generated('Shared one CLAIM_SHARED').test(shared) && generated('Shared two CLAIM_SHARED').test(shared), shared);
    for (const title of ['Shared one CLAIM_SHARED', 'Shared two CLAIM_SHARED']) assert.ok((await resultFiles(project, title)).includes('output/shared.txt'), `${title} committed its change of the shared file`);
    const order = (await subjects(project)).filter((subject) => /^ptbk: Shared (one|two) CLAIM_SHARED/.test(subject));
    assert.equal(order.length, 2);
});

test('removed task worktrees: --isolate is explained before anything changes; a saved execution.isIsolated is diagnosed', async (t) => {
    const { project, env } = await initializedProject(t);
    const head = (await git(project, ['rev-parse', 'HEAD'])).trim();
    const refused = await ptbk(['start', '--foreground', '--raw', '--no-server', '--no-persist', '--isolate'], { cwd: project, env });
    assert.equal(refused.code, 2, refused.output);
    assert.match(refused.output, /--isolate is no longer supported: task worktrees were removed/);
    assert.match(refused.output, /per-file ownership/);
    assert.match(refused.output, /maxConcurrentWork/);
    assert.equal((await git(project, ['rev-parse', 'HEAD'])).trim(), head, 'nothing was committed');
    assert.equal((await git(project, ['worktree', 'list', '--porcelain'])).match(/^worktree /gm).length, 1);
    await setExecution(project, 'isIsolated', true);
    const lint = await ptbk(['lint', '--raw'], { cwd: project, env });
    assert.match(lint.output, /execution\.isIsolated[^\n]*obsolete setting/, lint.output);
    const help = await ptbk(['start', '--help'], { cwd: project, env });
    assert.doesNotMatch(help.stdout, /--isolate/, 'the removed option is not offered');
    const status = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.ok(!status.settings || status.settings.length === 0 || status.settings.some((item) => item.key === 'execution.maxConcurrentWork'), 'the shared limit is an ordinary setting');
});
