import { EXIT, PtbkError } from '../../common/errors.js';
import { lookupService, type ServiceLookup } from '../../service/control.js';
import { launchDaemon, restartService, stopService } from '../../service/launcher.js';
import { registerPersistence, unregisterPersistence } from '../../service/persistence.js';
import { readLaunchMetadata } from '../../service/records.js';
import { browserOverrides, selectedProject, settingOverrides, tasksOverride, validateCombinations } from '../common.js';
import { option, type CommandContext } from '../context.js';
import { attachDashboard, wantsDashboardHandoff } from '../dashboard-handoff.js';
import { liveSnapshot, renderServiceResult } from '../service-view.js';

/**
 * Explicit options that change a restart's launch configuration (presentation/selection options do not).
 */
function launchChanges(context: CommandContext): string[] {
    return [...context.explicit].filter((name) => !['path', 'raw', 'no-ui', 'interactive', 'non-interactive', 'terminal-title', 'json', 'daemon', 'timeout', 'dashboard'].includes(name));
}

/**
 * `ptbk restart`: the engine's shared restart — drain like a graceful stop (`stopping` with restart intent), release
 * ownership, then exactly one replacement starts with the same project, effective configuration and installation.
 * Newly given flags replace the saved launch overrides of a daemon. Nothing running: starts the daemon. An ordinary
 * interactive terminal then opens the replacement's dashboard.
 *
 * @private command
 */
export default async function restart(context: CommandContext): Promise<number> {
    validateCombinations(context);
    const project = await selectedProject(context);
    const previous = await readLaunchMetadata(project);
    const overrides = { ...(previous?.cli ?? {}), ...settingOverrides(context) };
    const cliHarnesses = option<string[]>(context, 'harness') ?? previous?.cliHarnesses;
    const cliBrowser = browserOverrides(context) ?? previous?.cliBrowser;
    const persistent = overrides['service.isPersistent'] !== false;
    const tasksDirectory = tasksOverride(context) ?? previous?.tasksDirectory;
    const lookup = await lookupService(project);
    if (lookup.state === 'unreachable') {
        throw new PtbkError('The recorded ptbk service does not answer, so it was not restarted.', { kind: 'conflict', project: project.root, reason: lookup.reason, effect: 'Nothing was stopped or started.', next: ['Run `ptbk status` again shortly.'] });
    }
    let message: string;
    let replacement: Extract<ServiceLookup, { state: 'running' }>;
    if (lookup.state === 'running') {
        if (lookup.record.mode !== 'daemon' && launchChanges(context).length) {
            throw new PtbkError(`The ${lookup.record.mode} service keeps its own invocation options; new options cannot be applied by restarting it.`, {
                kind: 'usage',
                project: project.root,
                next: ['Restart without options (`ptbk restart`), or stop it and start it again with the new options.'],
            });
        }
        const result = await restartService(project, lookup, { launch: { cli: overrides, cliHarnesses, cliBrowser, tasksDirectory, persistent }, timeoutMs: option<number>(context, 'timeout') });
        if (result.kind === 'pending') {
            const current = await lookupService(project);
            const view = current.state === 'running' ? await liveSnapshot(project, current) : undefined;
            if (view) await renderServiceResult(context, view, { client: current.state === 'running' ? current.client : undefined, outcome: { title: 'Restart pending', message: `${result.message} \`ptbk resume\` cancels it.`, tone: 'attention' }, next: ['ptbk status', 'ptbk resume'] });
            else context.terminal.write(`${result.message}\n`);
            return EXIT.incomplete;
        }
        if (result.kind === 'unsupported') {
            // An engine that predates the shared restart: stop it gracefully, then launch exactly one replacement.
            const stopped = await stopService(project, { force: false, timeoutMs: option<number>(context, 'timeout') });
            if (!stopped.stopped) {
                context.terminal.write(`${stopped.message}\n`);
                return EXIT.incomplete;
            }
            const launched = await launchDaemon(project, { cli: overrides, cliHarnesses, cliBrowser, tasksDirectory, persistent, env: context.env });
            replacement = launched.lookup;
            message = `The previous service (an older engine) stopped; one replacement runs in the background (PID ${launched.lookup.record.pid}).`;
        } else {
            replacement = result.lookup;
            if (result.lookup.record.mode === 'daemon') {
                if (persistent) await registerPersistence(project, previous?.nodePath ?? process.execPath, previous?.env.PATH ?? previous?.env.Path ?? '').catch(() => undefined);
                else await unregisterPersistence(project).catch(() => undefined);
            }
            message = `The previous ${result.previous.mode} service (PID ${result.previous.pid}) finished its current work and released the project; one replacement runs (PID ${result.lookup.record.pid}).`;
        }
    } else {
        const launched = await launchDaemon(project, { cli: overrides, cliHarnesses, cliBrowser, tasksDirectory, persistent, env: context.env });
        replacement = launched.lookup;
        message = `No service was running; the agenda runs in the background (PID ${launched.lookup.record.pid}).${launched.persistence ? ` ${launched.persistence.note}` : ''}`;
    }
    if (wantsDashboardHandoff(context)) {
        const { style } = context.terminal;
        context.terminal.write(`${style.bold(style.success('Restarted.'))} ${message} ${style.muted('Opening the dashboard (leaving it keeps the service running)…')}\n`);
        return (await attachDashboard(context, project, replacement)) || EXIT.success;
    }
    const snapshot = await liveSnapshot(project, replacement);
    await renderServiceResult(context, snapshot, { client: replacement.client, outcome: { title: 'Restarted', message, tone: 'success' }, next: ['ptbk dashboard', 'ptbk stop'] });
    return EXIT.success;
}
