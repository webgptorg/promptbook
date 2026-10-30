import { EXIT, PtbkError, usageError } from '../../common/errors.js';
import { projectAt } from '../../project/workspace.js';
import { lookupService } from '../../service/control.js';
import { runDashboard } from '../../ui/dashboard.js';
import { runGlobalDashboard } from '../../ui/global-dashboard.js';
import { selectedProject } from '../common.js';
import { flag, type CommandContext } from '../context.js';
import { attachDashboard } from '../dashboard-handoff.js';
import { newProjectFromGlobalDashboard } from './init.js';
import { delegateToEngine } from '../engine-delegation.js';
import { controlSource } from '../sources.js';

/**
 * `ptbk dashboard --global`: the host-wide table of known projects (stopped ones included) and their live engines,
 * independent of the current directory. It never initializes or selects that directory and never acquires a project
 * lock; attaching opens the selected project's ordinary dashboard and returns to the table, and its explicit
 * individual/bulk lifecycle controls and stopped-entry removal use the shared operations.
 */
async function globalDashboard(context: CommandContext): Promise<number> {
    for (const name of ['path', 'tasks']) {
        if (context.explicit.has(name)) throw usageError(`--global observes every project; --${name} would select one project.`, 'dashboard', 'Use `ptbk dashboard --path <dir>` for one project, or `ptbk dashboard --global` for all of them.');
    }
    await runGlobalDashboard(
        context.terminal,
        async (row) => {
            // Resolve the target from verified discovery information, never from the launch directory.
            const project = projectAt(row.projectRoot);
            const lookup = await lookupService(project);
            if (lookup.state !== 'running') return `${row.projectName} is no longer running${lookup.state === 'unreachable' ? ` (${lookup.reason})` : ''}; nothing was started.`;
            if (lookup.record.instanceId !== row.engine?.instanceId) return `${row.projectName} is now owned by another engine instance; press Enter again to attach to it.`;
            if (!lookup.engine.compatible) {
                // Another engine version renders its own dashboard, so the view keeps that engine's version and shape.
                await delegateToEngine(project, lookup, ['dashboard', '--path', project.root], context.cwd, context.env);
                return undefined;
            }
            await runDashboard(context.terminal, controlSource(lookup.client));
            return undefined;
        },
        context.env,
        // New project: the same initializer as `ptbk init`, limited to a new child of the shared projects home.
        { create: async () => await newProjectFromGlobalDashboard(context) },
    );
    return EXIT.success;
}

/**
 * `ptbk dashboard`: attach a live view to the existing service (never starts or initializes anything); with
 * `--global`, the host-wide overview of every known project. A service of an incompatible ptbk version is shown by
 * its own installation.
 *
 * @private command
 */
export default async function dashboard(context: CommandContext): Promise<number> {
    if (flag(context, 'global')) return await globalDashboard(context);
    const project = await selectedProject(context);
    const lookup = await lookupService(project);
    if (lookup.state === 'stopped') {
        throw new PtbkError('No ptbk service is running for this project.', {
            kind: 'not-found',
            project: project.root,
            effect: 'Nothing was started; the dashboard only attaches to an existing service.',
            next: ['Start the agenda with `ptbk start`, then run `ptbk dashboard` again.', 'See every known project with `ptbk dashboard --global`.'],
        });
    }
    if (lookup.state === 'unreachable') {
        throw new PtbkError('The recorded ptbk service does not answer.', { kind: 'technical', project: project.root, reason: lookup.reason, next: ['Run `ptbk status` to inspect it, or `ptbk restart`.'] });
    }
    return (await attachDashboard(context, project, lookup, context.argv)) || EXIT.success;
}
