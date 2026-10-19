import { EXIT } from '../../common/errors.js';
import { lookupService } from '../../service/control.js';
import { stopService } from '../../service/launcher.js';
import { selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { liveSnapshot, renderServiceResult, stoppedSnapshot } from '../service-view.js';

/**
 * `ptbk stop`: the engine's shared stop operation. Graceful by default (`stopping`: the current task settles, then
 * orderly shutdown and owned cleanup); `--force`/`-F` interrupts owned work immediately with best-effort cleanup.
 * Completion is reported only after the owner ended; a still-draining service is reported as pending.
 *
 * @private command
 */
export default async function stop(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const force = flag(context, 'force') === true;
    const result = await stopService(project, { force, timeoutMs: option<number>(context, 'timeout') });
    if (!result.stopped) {
        const lookup = await lookupService(project);
        const snapshot = lookup.state === 'running' ? await liveSnapshot(project, lookup) : await stoppedSnapshot(project);
        await renderServiceResult(context, snapshot, {
            client: lookup.state === 'running' ? lookup.client : undefined,
            outcome: { title: 'Stopping', message: `${result.message} It exits once that work settles; \`ptbk resume\` cancels the stop, \`ptbk stop --force\` interrupts the work.`, tone: 'attention' },
            next: ['ptbk status', 'ptbk resume', 'ptbk stop --force'],
        });
        return EXIT.incomplete;
    }
    const snapshot = await stoppedSnapshot(project);
    await renderServiceResult(context, snapshot, {
        outcome: {
            title: result.wasRunning ? (force ? 'Force-stopped' : 'Stopped') : 'Not running',
            message: `${result.message}${result.wasRunning ? ` ${force ? 'Interrupted work keeps its recovery record; nothing was marked done.' : 'Unfinished work keeps its recovery record.'}` : ''} Automatic startup is disabled until the next \`ptbk start\` (or a successful \`ptbk init\`).`,
            tone: result.wasRunning ? 'success' : 'muted',
        },
        next: ['ptbk start'],
    });
    return EXIT.success;
}
