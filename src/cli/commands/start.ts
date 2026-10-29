import { EXIT, PtbkError } from '../../common/errors.js';
import { requireEngineUpdate } from '../compatibility.js';
import { clockTime } from '../../common/time.js';
import { loadSettings, setting } from '../../project/config.js';
import { assessReadiness, type ReadinessProblem } from '../../project/readiness.js';
import type { Project } from '../../project/workspace.js';
import { lookupService } from '../../service/control.js';
import { ServiceHost } from '../../service/host.js';
import { launchDaemon } from '../../service/launcher.js';
import { readLaunchMetadata, restoreDiscoveryEnvironment } from '../../service/records.js';
import { installPausedStart, readOperatorIntent, startupWorkIntent } from '../../engine/operator-intent.js';
import { runDashboard } from '../../ui/dashboard.js';
import { confirm } from '../../ui/prompts.js';
import { browserOverrides, selectedProject, settingOverrides, tasksOverride, validateCombinations } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { attachDashboard, wantsDashboardHandoff } from '../dashboard-handoff.js';
import { liveSnapshot, renderServiceResult } from '../service-view.js';
import { hostSource } from '../sources.js';
import { initializeProject } from './init.js';
import { ownerSignals } from '../lifecycle.js';

/**
 * Explains readiness problems with concrete repair actions.
 */
function describeProblems(problems: readonly ReadinessProblem[]): string {
    return problems.map((problem) => `- ${problem.message} → ${problem.action}`).join('\n');
}

/**
 * Ensures the project is ready, offering the shared init workflow when interactive.
 *
 * Returns false when setup stays incomplete.
 */
async function ensureReady(context: CommandContext, project: Project, overrides: Record<string, unknown>, cliHarnesses: readonly string[] | undefined, cliBrowser = browserOverrides(context)): Promise<boolean> {
    let settings = await loadSettings(project, { env: context.env, cli: overrides, cliHarnesses, cliBrowser });
    if (settings.migration.kind === 'older-engine') await requireEngineUpdate(context, settings.migration.saved);
    let readiness = await assessReadiness(project, settings, context.env);
    if (readiness.ready) return true;
    const { terminal } = context;
    if (!terminal.interactive) {
        throw new PtbkError('The project is not ready to start.', {
            kind: 'incomplete',
            project: project.root,
            reason: describeProblems(readiness.problems),
            effect: 'No service was started.',
            next: [
                'Run `ptbk init` (or `ptbk init --non-interactive` with the needed flags).',
                ...(readiness.problems.some((problem) => problem.area === 'check') ? ['Set ptbk.json execution.check, or run `ptbk init --check "<command>"`.'] : []),
            ],
        });
    }
    terminal.write(`${terminal.style.warning('The project is not ready to start:')}\n${describeProblems(readiness.problems)}\n\n`);
    const answer = await confirm(terminal, { frame: { title: 'ptbk start', step: 'Setup required' }, question: 'Run the setup wizard for this project now?', defaultYes: true, yesLabel: 'Yes, complete the missing setup', noLabel: 'No, do not start' });
    if (answer !== true) return false;
    const result = await initializeProject(context, { projectRoot: project.root, fromStart: true });
    if (result.outcome !== 'ready') return false;
    settings = await loadSettings(project, { env: context.env, cli: overrides, cliHarnesses, cliBrowser });
    readiness = await assessReadiness(project, settings, context.env);
    if (!readiness.ready) terminal.write(`${terminal.style.error('Setup is still incomplete:')}\n${describeProblems(readiness.problems)}\n`);
    return readiness.ready;
}

/**
 * Restores a persisted service at OS startup/login: idempotent and never prompts. Every still-registered persistent
 * project becomes available again; only one that was running (or paused by Health alone) when the host terminated it
 * may continue its work after current checks. Deliberately stopped, force-stopped or panicked projects, and ones whose
 * previous process disappeared ambiguously, start directly paused (see {@link startupWorkIntent}).
 */
async function resumeService(context: CommandContext, project: Project): Promise<number> {
    const launch = await readLaunchMetadata(project);
    if (!launch) {
        context.terminal.write('No launch metadata; nothing to restore.\n');
        return EXIT.success;
    }
    if (!launch.persistent) {
        context.terminal.write('Persistence is disabled (--no-persist); not restoring.\n');
        return EXIT.success;
    }
    const lookup = await lookupService(project);
    if (lookup.state === 'running') return EXIT.success;
    const work = startupWorkIntent(launch, readOperatorIntent(project));
    const env = restoreDiscoveryEnvironment(launch.env, launch.nodePath);
    const result = await launchDaemon(project, { cli: launch.cli, cliHarnesses: launch.cliHarnesses, cliBrowser: launch.cliBrowser, tasksDirectory: launch.tasksDirectory, persistent: true, env, paused: work === 'running' ? undefined : work });
    const how = work === 'inactive' ? ' paused (it was stopped before; Resume runs its queued work)' : work === 'unexpected-loss' ? ' paused (the previous process ended unexpectedly; Resume runs its queued work)' : '';
    context.terminal.write(`Restored ptbk service${how} (PID ${result.lookup.record.pid}).\n`);
    return EXIT.success;
}

/**
 * Runs the agenda in this terminal (live dashboard when interactive, plain events otherwise). This invocation owns
 * the engine: termination drains gracefully, and a restart starts exactly one replacement here (never a daemon).
 */
async function runForeground(context: CommandContext, project: Project, overrides: Record<string, unknown>, cliHarnesses: readonly string[] | undefined): Promise<number> {
    const { terminal } = context;
    const live = terminal.pretty && terminal.interactive;
    // The manual reason holds before the engine's first scheduling opportunity (a restart keeps the saved intent).
    if (flag(context, 'paused')) installPausedStart(project, 'start-paused');
    for (;;) {
        const host = new ServiceHost({
            project,
            mode: 'foreground',
            env: context.env,
            cli: overrides,
            cliHarnesses,
            cliBrowser: browserOverrides(context),
            tasksDirectory: tasksOverride(context),
            persistent: false,
            persistenceNote: 'Foreground: stops with this terminal; no restart persistence.',
            onEvent: live ? undefined : (text, level) => terminal.write(`${clockTime()} ${level === 'info' ? '' : `${level.toUpperCase()}: `}${text}\n`),
        });
        await host.start();
        const removeSignals = ownerSignals(host.agenda, (line) => terminal.write(line));
        let outcome: string;
        try {
            const agenda = host.runAgenda();
            if (live) {
                // The owning view stays until the engine ends (Q/Ctrl+C request a graceful stop inside it).
                await runDashboard(terminal, hostSource(host));
                host.agenda.requestStop({});
            }
            const summary = await agenda;
            outcome = summary.outcome;
            terminal.write(`${summary.message}\n`);
        } finally {
            removeSignals();
            await host.shutdown();
        }
        if (outcome !== 'restart') return EXIT.success;
        terminal.write('Restarting the foreground service with the same configuration…\n');
    }
}

/**
 * Writes the bounded launch outcome that precedes the automatic dashboard handoff (the viewer then shows live state).
 */
function handoffLine(context: CommandContext, title: string, message: string): void {
    const { style } = context.terminal;
    context.terminal.write(`${style.bold(style.success(title))} ${message} ${style.muted('Opening the dashboard (leaving it keeps the service running)…')}\n`);
}

/**
 * `ptbk start`: launch the ongoing agenda (daemon by default) or reuse the running one, then, in an ordinary
 * interactive terminal, open its project dashboard; otherwise report once.
 *
 * @private command
 */
export default async function start(context: CommandContext): Promise<number> {
    validateCombinations(context);
    const project = await selectedProject(context);
    if (flag(context, 'resume-service')) return await resumeService(context, project);
    // An explicit start from the global dashboard keeps the project's recorded launch overrides (e.g. --no-server).
    const saved = flag(context, 'saved-launch') ? await readLaunchMetadata(project) : undefined;
    const overrides = saved ? { ...saved.cli } : settingOverrides(context);
    const cliHarnesses = saved ? saved.cliHarnesses : option<string[]>(context, 'harness');
    const cliBrowser = saved ? saved.cliBrowser : browserOverrides(context);
    const tasksDirectory = saved ? saved.tasksDirectory : tasksOverride(context);
    const existing = await lookupService(project);
    if (existing.state === 'running') {
        const ignored = [...context.explicit].filter((name) => !['path', 'raw', 'no-ui', 'interactive', 'non-interactive', 'terminal-title', 'daemon', 'dashboard', 'saved-launch', 'paused'].includes(name));
        // A paused start only applies to an absent engine: the live owner keeps its state.
        const pausedNote = flag(context, 'paused') ? `; --paused applies only when no service runs, so its ${existing.record.mode} state was kept (\`ptbk pause\` pauses it)` : '';
        if (wantsDashboardHandoff(context)) {
            // Start-or-open: the running engine keeps its state and configuration; only a viewer attaches.
            handoffLine(context, 'Already running.', `PID ${existing.record.pid}${pausedNote}${ignored.length ? `; the new options (${ignored.map((name) => `--${name}`).join(', ')}) were not applied — use \`ptbk restart\`` : ''}.`);
            return (await attachDashboard(context, project, existing)) || EXIT.success;
        }
        const snapshot = await liveSnapshot(project, existing);
        await renderServiceResult(context, snapshot, {
            client: existing.client,
            outcome: {
                title: 'Already running',
                message: `The ${snapshot.service.mode} service (PID ${snapshot.service.pid}) keeps its configuration${pausedNote}${ignored.length ? `; the new options (${ignored.map((name) => `--${name}`).join(', ')}) were not applied — use \`ptbk restart\`` : ''}.`,
                tone: 'accent',
            },
            next: ['ptbk dashboard', 'ptbk stop', 'ptbk restart'],
        });
        return EXIT.success;
    }
    if (existing.state === 'unreachable') {
        throw new PtbkError('A ptbk process is recorded for this project but does not answer.', { kind: 'conflict', project: project.root, reason: existing.reason, effect: 'No second service was started.', next: ['Run `ptbk status` again shortly.'] });
    }
    if (!(await ensureReady(context, project, overrides, cliHarnesses, cliBrowser))) {
        context.terminal.write(`${context.terminal.style.warning('Not started:')} setup is incomplete. Resume with \`ptbk init\` or \`ptbk start\`.\n`);
        return EXIT.incomplete;
    }
    if (flag(context, 'foreground')) return await runForeground(context, project, overrides, cliHarnesses);
    const settings = await loadSettings(project, { env: context.env, cli: overrides, cliHarnesses, cliBrowser });
    const persistent = setting<boolean>(settings, 'service.isPersistent');
    const paused = flag(context, 'paused');
    const result = await launchDaemon(project, { cli: overrides, cliHarnesses, cliBrowser, tasksDirectory, persistent, env: context.env, paused: paused ? 'start-paused' : undefined });
    const persistence = result.persistence ? ` ${result.persistence.note}` : persistent ? '' : ' Restart persistence is disabled (--no-persist).';
    const pausedStart = paused && result.started;
    const title = result.started ? (pausedStart ? 'Started paused' : 'Started') : 'Already running';
    const message = pausedStart
        ? `The service runs in the background (PID ${result.lookup.record.pid}) with a manual pause: controls, inspection and chat work, and queued tasks wait for \`ptbk resume\`.${persistence}`
        : `The agenda runs in the background (PID ${result.lookup.record.pid}).${paused ? ' It was already running, so its state was kept.' : ''}${persistence}`;
    if (wantsDashboardHandoff(context)) {
        handoffLine(context, `${title}.`, message);
        return (await attachDashboard(context, project, result.lookup)) || EXIT.success;
    }
    const snapshot = await liveSnapshot(project, result.lookup);
    await renderServiceResult(context, snapshot, {
        client: result.lookup.client,
        outcome: { title, message, tone: pausedStart ? 'accent' : 'success' },
        next: pausedStart ? ['ptbk resume', 'ptbk dashboard', 'ptbk stop'] : ['ptbk dashboard', 'ptbk show', 'ptbk stop'],
    });
    return EXIT.success;
}
