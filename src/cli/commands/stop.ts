import { EXIT } from '../../common/errors.js';
import { lookupService } from '../../service/control.js';
import { stopService } from '../../service/launcher.js';
import { readLaunchMetadata } from '../../service/records.js';
import { selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { liveSnapshot, renderServiceResult, stoppedSnapshot } from '../service-view.js';

/**
 * `ptbk stop`: the engine's shared stop operation. Graceful by default (`stopping`: the current task settles, then
 * orderly shutdown and owned cleanup); `--force`/`-F` immediately ends the engine and every execution process it owns,
 * also when the engine does not answer (after verifying its identity). Completion is reported only after the owner
 * ended; a still-draining service is reported as pending and an unverifiable owner as unconfirmed.
 *
 * @private command
 */
export default async function stop(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const force = flag(context, 'force') === true;
    const result = await stopService(project, { force, timeoutMs: option<number>(context, 'timeout') });
    const warnings = result.warnings?.length ? ` ${result.warnings.join(' ')}` : '';
    if (result.unconfirmed) {
        const lookup = await lookupService(project);
        const snapshot = lookup.state === 'running' ? await liveSnapshot(project, lookup) : await stoppedSnapshot(project);
        await renderServiceResult(context, snapshot, {
            client: lookup.state === 'running' ? lookup.client : undefined,
            outcome: { title: 'Force stop not confirmed', message: `${result.message}${warnings} No replacement is started, and a later OS startup restores it only paused.`, tone: 'error' },
            next: ['ptbk status', 'ptbk stop --force'],
        });
        return EXIT.failure;
    }
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
    // A persistent service stays registered: the next OS startup makes it available again, paused.
    const persistent = (await readLaunchMetadata(project).catch(() => undefined))?.persistent === true;
    const restore = persistent ? ' It is not respawned; the next OS startup restores it only paused (queued tasks wait for `ptbk resume`), and `ptbk start` runs it again sooner.' : ' It stays stopped until `ptbk start`.';
    await renderServiceResult(context, snapshot, {
        outcome: {
            title: result.wasRunning ? (force ? 'Force-stopped' : 'Stopped') : 'Not running',
            message: `${result.message}${result.wasRunning ? ` ${force ? 'Interrupted work keeps its recovery record; nothing was marked done.' : 'Unfinished work keeps its recovery record.'}` : ''}${warnings}${restore}`,
            tone: result.wasRunning ? 'success' : 'muted',
        },
        next: ['ptbk start'],
    });
    return EXIT.success;
}
