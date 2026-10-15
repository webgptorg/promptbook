import { EXIT } from '../../common/errors.js';
import { stopDaemon } from '../../service/launcher.js';
import { selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { renderServiceResult, stoppedSnapshot } from '../service-view.js';

/**
 * `ptbk stop`: stop the daemon safely; an intentional stop also disables automatic startup.
 *
 * @private command
 */
export default async function stop(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const result = await stopDaemon(project, { cancelCurrent: flag(context, 'after-task') !== true, intentional: true, timeoutMs: option<number>(context, 'timeout') });
    const snapshot = await stoppedSnapshot(project);
    if (!result.stopped) {
        await renderServiceResult(context, snapshot, { outcome: { title: 'Stopping', message: `${result.message} Run \`ptbk status\` to follow it.`, tone: 'attention' }, next: ['ptbk status'] });
        return EXIT.incomplete;
    }
    await renderServiceResult(context, snapshot, {
        outcome: {
            title: result.wasRunning ? 'Stopped' : 'Not running',
            message: `${result.message}${result.wasRunning ? ' Interrupted work keeps its recovery record.' : ''} Automatic startup is disabled until the next \`ptbk start\`.`,
            tone: result.wasRunning ? 'success' : 'muted',
        },
        next: ['ptbk start'],
    });
    return EXIT.success;
}
