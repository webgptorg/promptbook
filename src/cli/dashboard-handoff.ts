import type { Project } from '../project/workspace.js';
import type { ServiceLookup } from '../service/control.js';
import { runDashboard } from '../ui/dashboard.js';
import { TILE_TITLES, type HomeTile } from '../ui/dashboard-home.js';
import { usageError } from '../common/errors.js';
import { flag, option, type CommandContext } from './context.js';
import { delegateToEngine } from './engine-delegation.js';
import { controlSource } from './sources.js';

/**
 * Whether a finished `start`, `restart` or `init` continues into the project dashboard: only in an ordinary suitable
 * interactive terminal, unless `--no-dashboard`, raw/`--no-ui`, `--non-interactive`, `--json` or redirected streams
 * ask for the one-shot result. The viewer never owns the daemon.
 *
 * @private dashboard handoff
 */
export function wantsDashboardHandoff(context: CommandContext): boolean {
    const { terminal } = context;
    return terminal.interactive && terminal.pretty && Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY) && flag(context, 'dashboard') !== false && flag(context, 'json') !== true;
}

/**
 * Attaches the ordinary independent project dashboard to a running service (the same viewer as `ptbk dashboard`):
 * a service of an incompatible ptbk version is shown by its own installation. Leaving it keeps the service running.
 *
 * @private dashboard handoff
 */
export async function attachDashboard(context: CommandContext, project: Project, lookup: Extract<ServiceLookup, { state: 'running' }>, args: readonly string[] = ['dashboard', '--path', project.root]): Promise<number> {
    if (!lookup.engine.compatible) return await delegateToEngine(project, lookup, args, context.cwd, context.env);
    const view = option<string>(context, 'view');
    if (view && !Object.hasOwn(TILE_TITLES, view)) throw usageError(`Unknown dashboard page \"${view}\".`, 'dashboard', `Use one of ${Object.keys(TILE_TITLES).join(', ')}.`);
    await runDashboard(context.terminal, controlSource(lookup.client), view as HomeTile | undefined);
    return 0;
}
