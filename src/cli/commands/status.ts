import { EXIT } from '../../common/errors.js';
import type { ServiceSnapshot } from '../../engine/snapshot.js';
import { lookupService } from '../../service/control.js';
import { selectedProject } from '../common.js';
import type { CommandContext } from '../context.js';
import { renderServiceResult, stoppedSnapshot } from '../service-view.js';

/**
 * `ptbk status` / `ptbk show`: one snapshot of the existing service; never starts anything.
 *
 * @private command
 */
export default async function status(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const lookup = await lookupService(project);
    if (lookup.state === 'running') {
        const snapshot = await lookup.client.request<ServiceSnapshot>('snapshot');
        await renderServiceResult(context, snapshot, { client: lookup.client, next: snapshot.service.mode === 'daemon' ? ['ptbk dashboard', 'ptbk stop'] : ['ptbk dashboard'] });
        return EXIT.success;
    }
    const snapshot = await stoppedSnapshot(project);
    if (lookup.state === 'unreachable') {
        await renderServiceResult(context, snapshot, {
            outcome: { title: 'Service unreachable', message: `A ptbk process (PID ${lookup.record.pid}) is recorded but does not answer: ${lookup.reason}. Its state is unknown.`, tone: 'error' },
            next: ['ptbk status (retry)', 'ptbk restart'],
        });
        return EXIT.failure;
    }
    await renderServiceResult(context, snapshot, {
        outcome: { title: 'Not running', message: `No ptbk service is running for this project${lookup.stale ? ' (a stale record was ignored)' : ''}.`, tone: 'muted' },
        next: ['ptbk start', 'ptbk list'],
    });
    return EXIT.success;
}
