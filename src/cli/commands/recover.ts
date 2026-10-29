import { EXIT, PtbkError } from '../../common/errors.js';
import { Agenda } from '../../engine/agenda.js';
import { StateStore, isolationBranch } from '../../engine/state.js';
import { lookupService } from '../../service/control.js';
import { acquireProjectLock } from '../../service/records.js';
import { shortId } from '../../common/ids.js';
import { parseReferenceValue } from '../../book/references.js';
import { traceDirectoryOf } from '../../tasks/identity.js';
import { nameKey } from '../../tasks/model.js';
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
    const active = await state.readActiveRecords();
    const parked = await state.readParked();
    const records = [...active, ...parked];
    const blockers = await state.readBlockers();
    const { terminal } = context;
    const [reference] = context.positionals;
    const action = option<'resume' | 'retry' | 'acknowledge'>(context, 'action');
    const referenceKey = reference ? (parseReferenceValue(reference)?.normalized ?? nameKey(reference)) : undefined;
    const matches = (record: (typeof records)[number]): boolean => !reference || [record.taskRef, record.sourcePath].includes(reference.replace(/\\/g, '/')) || (record.taskKey || nameKey(record.taskTitle)) === referenceKey;
    const record = records.find(matches);
    if (!reference || !action) {
        if (!records.length && !Object.keys(blockers).length) {
            terminal.write('No interrupted or failed work is recorded.\n');
            return EXIT.success;
        }
        for (const record of records.filter(matches)) {
            const lines = [
                `Task: ${record.taskTitle} (${record.taskRef}) — ${record.kind}${active.includes(record) ? '' : ' — checkpointed (independent work continues)'}`,
                `Evidence: ${traceDirectoryOf(record.sourcePath)}/ (declared name ${record.taskTitle}, source ${record.sourcePath})`,
                `Phase: ${record.phase}${record.failure ? ` — ${record.failure}` : ''}`,
                `Attempts: ${record.attempt} implementation/repair, ${record.technicalRetries} technical retries`,
                `Routing: ${record.routing.agent} on ${record.routing.harness}${record.routing.model ? ` ${record.routing.model}` : ''}`,
                ...(record.handover ? [`Taken over by: ${record.handover.agent} after ${record.handover.from} could not (${record.handover.failure})`] : []),
                ...(record.recovery
                    ? [
                          `Automatic recovery: recheck ${record.recovery.rounds} due ${record.recovery.nextAt} (sooner when its source, tools or check change; no reply is needed)${record.recovery.equivalent ? `; the same failure repeated ${record.recovery.equivalent} time(s) under unchanged conditions` : ''}`,
                          ...record.recovery.remedies.map((remedy) => `  tried: ${remedy}`),
                      ]
                    : []),
                ...(record.worktree ? [`Task worktree of an older engine: ${record.worktree} (branch ${isolationBranch(record.runId)}); task worktrees were removed, so merge or discard that branch yourself`] : []),
                ...(record.ownedFiles?.length ? [`Owned files: ${record.ownedFiles.join(', ')}`] : []),
                `Commit mode: ${record.noCommit ? 'no-commit' : 'automatic'}${record.commitSha ? `; committed ${record.commitSha}` : ''}`,
                `Waiting for your reply: ${record.waitingChat ?? record.recoveryChat ? `chat {${record.waitingChat ?? record.recoveryChat}} (ptbk answer "${record.waitingChat ?? record.recoveryChat}")` : 'no'}`,
                `Engine-created files: ${record.createdPaths.join(', ') || 'none'}`,
                ...record.history.map((attempt) => `  attempt ${attempt.attempt}: ${attempt.outcome} — ${attempt.diagnostic}${attempt.trace ? ` (${attempt.trace})` : ''}`),
                '',
                `Actions: ptbk recover ${record.taskRef} --action resume|retry|acknowledge`,
                '',
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
        const agenda = new Agenda({ project, mode: 'maintenance', instanceId, env: context.env, cli: { 'server.isEnabled': false }, persistent: null });
        await agenda.initialize();
        const message = await agenda.recover(reference, action);
        terminal.write(`${message}${action === 'resume' || action === 'retry' ? ' The work continues on the next `ptbk start` (or `ptbk run --git-changes continue`).' : ''}\n`);
    } finally {
        await release();
    }
    return EXIT.success;
}
