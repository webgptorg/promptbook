import assert from 'node:assert/strict';
import { mkdir, readFile, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { HealthSubEngine } from '../dist/engine/health.js';
import { projectAt } from '../dist/project/workspace.js';
import { findGenerated, git, initializedProject, ptbk, subjects, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * A Health sub-engine over scripted host samples (no real measurement, no timers).
 */
function scripted(directory, options = {}) {
    const state = { disk: 10_000, memory: 8_000, load5: 0.5, reachable: true, limits: { disk: 500, memory: 512, source: 'engine defaults' }, ...options };
    const log = [];
    let pauseChanges = 0;
    const health = new HealthSubEngine({
        project: projectAt(directory),
        env: {},
        limits: () => state.limits,
        onChange: () => undefined,
        onPauseChange: () => pauseChanges++,
        log: (text, level) => log.push({ text, level }),
        probes: {
            sample: async () => ({
                at: new Date().toISOString(),
                disk: { freeMiB: state.disk, totalMiB: 100_000, paths: [{ path: directory, freeMiB: state.disk, totalMiB: 100_000 }] },
                memory: { ramAvailableMiB: state.memory - 100, ramTotalMiB: 16_000, swapFreeMiB: 100, swapTotalMiB: 1000, availableMiB: state.memory },
                cpu: { cores: 4, load1: state.load5, load5: state.load5, load15: state.load5, state: state.load5 / 4 >= 2 ? 'high' : 'normal' },
            }),
            connectivity: async () => ({ reachable: state.reachable, target: 'example.test:443', ...(state.reachable ? {} : { error: 'offline' }) }),
        },
    });
    return { health, state, log, pauseChanges: () => pauseChanges };
}

test('health: a soft disk incident pauses, survives polling with hysteresis, is overridable per incident and recurs as a new incident', async (t) => {
    const directory = await temporaryDirectory(t);
    const { health, state, log } = scripted(directory);
    await health.sampleNow();
    assert.equal(health.view().status, 'ok');
    assert.equal(health.view().summary, 'System OK', 'healthy state is terse');
    assert.deepEqual(health.pauseReasons(), []);

    state.disk = 300;
    await health.sampleNow();
    const [reason] = health.pauseReasons();
    assert.equal(reason.kind, 'health');
    assert.equal(reason.severity, 'soft');
    assert.equal(reason.removable, true);
    assert.match(reason.summary, /Low free disk: 300 MiB free .*limit 500 MiB/);
    const first = reason.incident;

    // Near the threshold (inside the hysteresis band) the incident stays the same one; no new pause per poll.
    state.disk = 510;
    await health.sampleNow();
    await health.sampleNow();
    assert.equal(health.pauseReasons()[0]?.incident, first, 'no recovery without a clear margin');

    const overridden = health.override(first);
    assert.equal(overridden.applied, true);
    assert.deepEqual(health.pauseReasons(), [], 'the overridden soft incident no longer pauses');
    state.disk = 200;
    await health.sampleNow();
    await health.sampleNow();
    assert.deepEqual(health.pauseReasons(), [], 'polling never recreates the overridden pause while the same incident continues');
    assert.equal(health.view().incidents[0].id, first);
    assert.ok(health.view().incidents[0].overriddenAt);

    state.disk = 5000;
    await health.sampleNow();
    assert.equal(health.view().incidents.length, 1, 'one recovered sample is not enough');
    await health.sampleNow();
    assert.equal(health.view().incidents.length, 0, 'clear recovery closes the incident');
    assert.ok(log.some((entry) => /resolved/.test(entry.text)));

    state.disk = 100;
    await health.sampleNow();
    const [again] = health.pauseReasons();
    assert.ok(again, 'a later drop pauses again');
    assert.notEqual(again.incident, first, 'as a new incident');
});

test('health: actual exhaustion is a hard pause without override; zero disables only the preventive threshold', async (t) => {
    const directory = await temporaryDirectory(t);
    const { health, state } = scripted(directory, { limits: { disk: 0, memory: 0, source: 'ptbk.json limit' } });
    state.disk = 300;
    state.memory = 200;
    await health.sampleNow();
    assert.deepEqual(health.pauseReasons(), [], 'limits of zero disable the soft thresholds');

    state.disk = 4;
    await health.sampleNow();
    const [hard] = health.pauseReasons();
    assert.equal(hard.severity, 'hard');
    assert.equal(hard.removable, false);
    assert.throws(() => health.override(hard.incident), /cannot be overridden/);
    assert.equal(health.pauseReasons().length, 1, 'refused override changes nothing');
    assert.equal(health.view().status, 'hard');

    state.memory = 3;
    await health.sampleNow();
    assert.deepEqual(
        health.pauseReasons().map((reason) => reason.summary.split(':')[0]),
        ['Disk full', 'Memory exhausted'],
        'several incidents coexist',
    );
    state.disk = 9000;
    state.memory = 9000;
    await health.sampleNow();
    await health.sampleNow();
    assert.deepEqual(health.pauseReasons(), [], 'hard conditions clear by themselves once resolved');
});

test('health: CPU and connectivity are observed without pausing; project cache cleanup previews and keeps recent entries', async (t) => {
    const directory = await temporaryDirectory(t);
    const { health, state } = scripted(directory);
    state.load5 = 12;
    state.reachable = false;
    await health.sampleNow();
    await health.checkConnectivity();
    await health.checkConnectivity();
    const view = health.view();
    assert.equal(view.status, 'warning');
    assert.deepEqual(view.incidents.map((incident) => [incident.resource, incident.severity, incident.pauses]).sort(), [
        ['cpu', 'warning', false],
        ['network', 'warning', false],
    ]);
    assert.deepEqual(health.pauseReasons(), [], 'no invented automatic pause thresholds for CPU or connectivity');
    assert.equal(health.override(view.incidents[0].id).applied, false, 'warnings are not pause overrides');

    const cache = join(directory, '.ptbk', 'tmp');
    await mkdir(join(cache, 'recordings', 'old'), { recursive: true });
    await writeFile(join(cache, 'recordings', 'old', 'frame.jpg'), 'x'.repeat(4096));
    await writeFile(join(cache, 'prompt-old.md'), 'old prompt');
    await writeFile(join(cache, 'prompt-now.md'), 'current prompt');
    const past = new Date(Date.now() - 3_600_000);
    await utimes(join(cache, 'recordings', 'old', 'frame.jpg'), past, past);
    await utimes(join(cache, 'recordings', 'old'), past, past);
    await utimes(join(cache, 'recordings'), past, past);
    await utimes(join(cache, 'prompt-old.md'), past, past);
    const preview = await health.cachePreview();
    assert.equal(preview.path, '.ptbk/tmp');
    assert.deepEqual(preview.entries.filter((entry) => !entry.kept).map((entry) => entry.name).sort(), ['prompt-old.md', 'recordings']);
    assert.match(preview.entries.find((entry) => entry.name === 'prompt-now.md').kept, /may be in use/);
    const cleaned = await health.cleanCache();
    assert.equal(cleaned.applied, true);
    assert.equal(await readFile(join(cache, 'prompt-now.md'), 'utf8'), 'current prompt', 'recent entries are kept');
    await assert.rejects(readFile(join(cache, 'prompt-old.md')));
    assert.equal(health.view().lastAction.action, 'health-clean-cache');
    const swap = await health.swapPlan();
    assert.equal(swap.supported, process.platform === 'linux', 'swap remediation exists only on Linux; elsewhere guidance');
    assert.ok(swap.note);
});

test('health: low disk first reclaims the owned cache by itself; only an incident without a remaining remedy needs a person', async (t) => {
    const directory = await temporaryDirectory(t);
    const { health, state } = scripted(directory);
    const cache = join(directory, '.ptbk', 'tmp');
    await mkdir(cache, { recursive: true });
    await writeFile(join(cache, 'prompt-old.md'), 'x'.repeat(8192));
    const past = new Date(Date.now() - 3_600_000);
    await utimes(join(cache, 'prompt-old.md'), past, past);
    state.disk = 300;
    await health.sampleNow();
    await waitFor(async () => !(await readFile(join(cache, 'prompt-old.md')).then(() => true, () => false)), { timeoutMs: 5_000 });
    await waitFor(() => /Automatically cleaned/.test(health.view().incidents[0]?.remedy ?? ''), { timeoutMs: 5_000 });
    const [incident] = health.view().incidents;
    assert.match(incident.remedy, /8\.0 KiB freed|freed/);
    assert.match(incident.needsAction, /Free disk space/, 'capacity is still short after the autonomous remedy: one actionable request');
    // CPU and connectivity are observed, never a request on their own.
    state.load5 = 12;
    await health.sampleNow();
    assert.equal(health.view().incidents.find((item) => item.resource === 'cpu').needsAction, undefined);
});

test('health: a soft health pause stops new claims, composes with a manual pause and resumes only when every reason is gone', async (t) => {
    const { project, env } = await initializedProject(t, { check: 'process.exit(0);\n' });
    const path = join(project, 'ptbk.json');
    const config = JSON.parse(await readFile(path, 'utf8'));
    // A preventive limit far above any real free disk: an ordinary soft incident from actual measurements.
    config.limit = { disk: 1_000_000_000 };
    await writeFile(path, `${JSON.stringify(config, null, 4)}\n`);
    await git(project, ['commit', '-q', '-m', 'Fixture health limit', '--', 'ptbk.json']);
    await ptbk(['add', 'Healthy work', '--agent', 'Developer', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const status = async () => JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);

    const paused = await waitFor(async () => {
        const snapshot = await status();
        return snapshot.service.state === 'pause' && snapshot.service.pauseReasons?.some((reason) => reason.kind === 'health') ? snapshot : undefined;
    }, { message: 'the soft health pause' });
    assert.equal(paused.health.status, 'soft');
    assert.equal(paused.health.limits.disk, 1_000_000_000);
    assert.ok(paused.health.disk.freeMiB > 0, 'actual free disk is measured');
    assert.ok(paused.health.memory.ramTotalMiB > 0, 'RAM is reported');
    const incident = paused.service.pauseReasons.find((reason) => reason.kind === 'health');
    assert.equal(incident.severity, 'soft');
    assert.equal(findGenerated(await subjects(project), 'Healthy work', 'ptbk: '), undefined, 'no task is claimed while Health pauses');

    const raw = await ptbk(['status', '--raw'], { cwd: project, env });
    assert.match(raw.stdout, /Pause reasons: Health soft — Low free disk/);
    assert.match(raw.stdout, /^HEALTH$/m);

    const resumed = await ptbk(['resume', '--raw'], { cwd: project, env });
    assert.notEqual(resumed.code, 0, 'generic Resume does not clear Health');
    assert.match(resumed.stdout, /Still paused/);
    assert.match(resumed.stdout, /No manual pause is active/);

    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0, 'a manual reason is added on top');
    assert.deepEqual((await status()).service.pauseReasons.map((reason) => reason.kind), ['manual', 'health']);

    const host = await import('../dist/service/control.js');
    const lookup = await host.lookupService(projectAt(project));
    const override = await lookup.client.request('health-override', { incident: incident.incident });
    assert.equal(override.applied, true, override.outcome);
    const manualOnly = await status();
    assert.deepEqual(manualOnly.service.pauseReasons.map((reason) => reason.kind), ['manual'], 'the override removes only the health reason');
    assert.equal(manualOnly.service.state, 'pause', 'the manual reason still holds');
    assert.equal(JSON.parse(await readFile(path, 'utf8')).limit.disk, 1_000_000_000, 'the override never changes ptbk.json');
    assert.equal(findGenerated(await subjects(project), 'Healthy work', 'ptbk: '), undefined);

    const running = await ptbk(['resume', '--raw'], { cwd: project, env });
    assert.equal(running.code, 0, running.output);
    assert.equal((await status()).service.state, 'running');
    await waitFor(async () => findGenerated(await subjects(project), 'Healthy work', 'ptbk: '), { message: 'work to continue once every reason is gone' });
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});
