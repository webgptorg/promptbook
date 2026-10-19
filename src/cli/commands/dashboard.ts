import { EXIT, PtbkError, usageError } from '../../common/errors.js';
import { projectAt } from '../../project/workspace.js';
import { lookupService } from '../../service/control.js';
import { runDashboard } from '../../ui/dashboard.js';
import { runGlobalDashboard } from '../../ui/global-dashboard.js';
import { selectedProject } from '../common.js';
import { flag, type CommandContext } from '../context.js';
import { controlSource } from '../sources.js';

/**
 * `ptbk dashboard --global`: the host-wide live table of running engines, independent of the current directory. It
 * never initializes or selects that directory, never starts a worker and never acquires a project lock; attaching
 * opens the selected project's ordinary dashboard and returns to the table.
 */
async function globalDashboard(context: CommandContext): Promise<number> {
    for (const name of ['path', 'tasks']) {
        if (context.explicit.has(name)) throw usageError(`--global observes every project; --${name} would select one project.`, 'dashboard', 'Use `ptbk dashboard --path <dir>` for one project, or `ptbk dashboard --global` for all of them.');
    }
    const noQr = flag(context, 'qr') === false;
    await runGlobalDashboard(
        context.terminal,
        async (row) => {
            // Resolve the target from verified discovery information, never from the launch directory.
            const project = projectAt(row.entry.projectRoot);
            const lookup = await lookupService(project);
            if (lookup.state !== 'running') return `${row.entry.projectName} is no longer running${lookup.state === 'unreachable' ? ` (${lookup.reason})` : ''}; nothing was started.`;
            if (lookup.record.instanceId !== row.entry.instanceId) return `${row.entry.projectName} is now owned by another engine instance; select its new row to attach.`;
            await runDashboard(context.terminal, controlSource(lookup.client), { noQr });
            return undefined;
        },
        context.env,
    );
    return EXIT.success;
}

/**
 * `ptbk dashboard`: attach a live view to the existing service (never starts or initializes anything); with
 * `--global`, the host-wide overview of every running engine.
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
            next: ['Start the agenda with `ptbk start`, then run `ptbk dashboard` again.', 'See every running project with `ptbk dashboard --global`.'],
        });
    }
    if (lookup.state === 'unreachable') {
        throw new PtbkError('The recorded ptbk service does not answer.', { kind: 'technical', project: project.root, reason: lookup.reason, next: ['Run `ptbk status` to inspect it, or `ptbk restart`.'] });
    }
    await runDashboard(context.terminal, controlSource(lookup.client), { noQr: flag(context, 'qr') === false });
    return EXIT.success;
}
