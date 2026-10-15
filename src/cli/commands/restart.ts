import { EXIT } from '../../common/errors.js';
import type { ServiceSnapshot } from '../../engine/snapshot.js';
import { launchDaemon, stopDaemon } from '../../service/launcher.js';
import { readLaunchMetadata } from '../../service/records.js';
import { selectedProject, settingOverrides, tasksOverride, validateCombinations } from '../common.js';
import { option, type CommandContext } from '../context.js';
import { renderServiceResult } from '../service-view.js';

/**
 * `ptbk restart`: stop (recoverably) and start the daemon with its previous invocation overrides plus new flags.
 *
 * @private command
 */
export default async function restart(context: CommandContext): Promise<number> {
    validateCombinations(context);
    const project = await selectedProject(context);
    const previous = await readLaunchMetadata(project);
    const stopped = await stopDaemon(project, { cancelCurrent: true, intentional: false });
    if (!stopped.stopped) {
        context.terminal.write(`${stopped.message}\n`);
        return EXIT.incomplete;
    }
    const overrides = { ...(previous?.cli ?? {}), ...settingOverrides(context) };
    const cliHarnesses = option<string[]>(context, 'harness') ?? previous?.cliHarnesses;
    const persistent = overrides['service.persist'] !== false;
    const result = await launchDaemon(project, { cli: overrides, cliHarnesses, tasksDirectory: tasksOverride(context) ?? previous?.tasksDirectory, persistent, env: context.env });
    let snapshot = await result.lookup.client.request<ServiceSnapshot>('snapshot');
    const deadline = Date.now() + 25_000;
    while (snapshot.connection.remote.state === 'connecting' && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        snapshot = await result.lookup.client.request<ServiceSnapshot>('snapshot');
    }
    await renderServiceResult(context, snapshot, {
        client: result.lookup.client,
        outcome: { title: 'Restarted', message: `${stopped.wasRunning ? 'The previous service stopped; ' : 'No service was running; '}the agenda runs again in the background (PID ${snapshot.service.pid}).${result.persistence ? ` ${result.persistence.note}` : ''}`, tone: 'success' },
        next: ['ptbk dashboard', 'ptbk stop'],
    });
    return EXIT.success;
}
