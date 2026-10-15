import { EXIT, PtbkError } from '../../common/errors.js';
import { lookupService } from '../../service/control.js';
import { runDashboard } from '../../ui/dashboard.js';
import { selectedProject } from '../common.js';
import { flag, type CommandContext } from '../context.js';
import { controlSource } from '../sources.js';

/**
 * `ptbk dashboard`: attach a live view to the existing service (never starts or initializes anything).
 *
 * @private command
 */
export default async function dashboard(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const lookup = await lookupService(project);
    if (lookup.state === 'stopped') {
        throw new PtbkError('No ptbk service is running for this project.', {
            kind: 'not-found',
            project: project.root,
            effect: 'Nothing was started; the dashboard only attaches to an existing service.',
            next: ['Start the agenda with `ptbk start`, then run `ptbk dashboard` again.'],
        });
    }
    if (lookup.state === 'unreachable') {
        throw new PtbkError('The recorded ptbk service does not answer.', { kind: 'technical', project: project.root, reason: lookup.reason, next: ['Run `ptbk status` to inspect it, or `ptbk restart`.'] });
    }
    await runDashboard(context.terminal, controlSource(lookup.client), { noQr: flag(context, 'qr') === false });
    return EXIT.success;
}
