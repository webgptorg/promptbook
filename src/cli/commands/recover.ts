import { EXIT, PtbkError } from '../../common/errors.js';
import { Agenda } from '../../engine/agenda.js';
import { StateStore } from '../../engine/state.js';
import { lookupService } from '../../service/control.js';
import { acquireProjectLock } from '../../service/records.js';
import { shortId } from '../../common/ids.js';
import { selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * `ptbk recover`: inspect (read-only) or explicitly resolve interrupted/failed work.
 *
 * @private command
 */
export default async function recover(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const state = new StateStore(project.runtime.state);
    const record = await state.readActive();
    const blockers = await state.readBlockers();
    const { terminal } = context;
    const [reference] = context.positionals;
    const action = option<'resume' | 'retry' | 'acknowledge'>(context, 'action');
    if (!reference || !action) {
        if (!record && !Object.keys(blockers).length) {
            terminal.write('No interrupted or failed work is recorded.\n');
            return EXIT.success;
        }
        if (record && (!reference || reference === record.taskRef || reference === record.sourcePath)) {
            const lines = [
                `Task: ${record.taskTitle} (${record.taskRef}) — ${record.kind}`,
                `Phase: ${record.phase}${record.failure ? ` — ${record.failure}` : ''}`,
                `Attempts: ${record.attempt} implementation/repair, ${record.technicalRetries} technical retries`,
                `Routing: ${record.routing.agent} on ${record.routing.harness}${record.routing.model ? ` ${record.routing.model}` : ''}`,
                `Commit mode: ${record.noCommit ? 'no-commit' : 'automatic'}${record.commitSha ? `; committed ${record.commitSha}` : ''}`,
                `Pending user request: ${record.requestId ?? record.recoveryRequestId ?? 'none'}`,
                `Engine-created files: ${record.createdPaths.join(', ') || 'none'}`,
                ...record.history.map((attempt) => `  attempt ${attempt.attempt}: ${attempt.outcome} — ${attempt.diagnostic}${attempt.trace ? ` (${attempt.trace})` : ''}`),
                '',
                `Actions: ptbk recover ${record.taskRef} --action resume|retry|acknowledge`,
            ];
            terminal.write(`${lines.join('\n')}\n`);
        }
        for (const [ref, blocker] of Object.entries(blockers)) if (!reference || reference === ref) terminal.write(`Blocked ${ref}: ${blocker.reason} (${blocker.kind}, ${blocker.at})\n`);
        return EXIT.success;
    }
    if (flag(context, 'dry-run')) {
        terminal.write(`Dry run: would apply "${action}" to ${reference}${record ? ` (currently ${record.phase})` : ''}. Acknowledgement records a failure; it is not success.\n`);
        return EXIT.success;
    }
    const lookup = await lookupService(project);
    if (lookup.state === 'running') {
        const result = await lookup.client.request<{ message: string }>('recover', { taskRef: reference, action });
        terminal.write(`${result.message}\n`);
        return EXIT.success;
    }
    if (!record && !blockers[reference]) throw new PtbkError(`No interrupted or failed work is recorded for ${reference}.`, { kind: 'not-found' });
    const instanceId = shortId(12);
    const release = await acquireProjectLock(project, instanceId, 'recovery');
    try {
        const agenda = new Agenda({ project, mode: 'run', instanceId, env: context.env, cli: { 'server.enabled': false }, persistent: null });
        await agenda.initialize();
        const message = await agenda.recover(reference, action);
        terminal.write(`${message}${action === 'resume' || action === 'retry' ? ' The work continues on the next `ptbk start` (or `ptbk run --git-changes continue`).' : ''}\n`);
    } finally {
        await release();
    }
    return EXIT.success;
}
