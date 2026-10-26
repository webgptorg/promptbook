import { resolve } from 'node:path';
import { setting, type EffectiveSettings } from '../project/config.js';
import { AgentCatalog } from '../project/agents.js';
import { inspectGit } from '../project/git.js';
import type { Project } from '../project/workspace.js';
import { evaluateQueue, type EvaluatedTask } from '../tasks/eligibility.js';
import { isRecurring, nameKey } from '../tasks/model.js';
import { findTask, readTaskQueue } from '../tasks/sources.js';
import { captureSnapshot } from './executor.js';
import { originTarget, workKindOf } from './generated.js';
import { HarnessPool } from './harnesses.js';
import { resolveRoute, type RouteResolution } from './routing.js';
import { StateStore, parkedReadiness } from './state.js';

/**
 * Read-only evaluation of a project's queue.
 *
 * @private queue preview
 */
export type QueuePreview = {
    readonly evaluated: readonly EvaluatedTask[];
    readonly routes: ReadonlyMap<string, RouteResolution>;
    readonly problems: readonly string[];
    readonly pool: HarnessPool;
};

/**
 * Evaluates readiness exactly like execution would, without writing anything (no IDs, no runtime files).
 *
 * @private queue preview
 */
export async function previewQueue(
    project: Project,
    options: { settings: EffectiveSettings; tasksDirectory?: string; env?: NodeJS.ProcessEnv },
): Promise<QueuePreview> {
    const { settings } = options;
    const env = options.env ?? process.env;
    const timeZone = setting<string>(settings, 'timezone');
    const tasksDirectory = options.tasksDirectory ?? resolve(project.root, setting<string>(settings, 'paths.tasks'));
    const catalog = await AgentCatalog.load(project.root, setting<string>(settings, 'paths.agents'), setting<string>(settings, 'paths.tasks'));
    const queue = await readTaskQueue({ root: project.root, tasksDirectory, explicit: Boolean(options.tasksDirectory), timeZone, index: catalog.index });
    const pool = new HarnessPool(project.root, settings, env);
    await pool.refresh(undefined, true);
    const state = new StateStore(project.runtime.state);
    const blockers = await state.readBlockers().catch(() => ({}));
    const activations = await state.readActivations().catch(() => ({}) as Record<string, number>);
    // Checkpointed tasks wait for the user's reply in their chat (or, from an older engine's task worktree, for a merge).
    const { awaitingUser, integrations } = parkedReadiness(await state.readParked().catch(() => []));
    const active = await state.readActiveRecords().catch(() => []);
    const uncommitted = new Set<string>();
    const gitInfo = await inspectGit(project.root);
    if (gitInfo.state === 'repository' && setting<boolean>(settings, 'execution.isCommitEnabled')) {
        const dirty = await captureSnapshot({ project, repositoryRoot: gitInfo.root });
        for (const path of Object.keys(dirty)) uncommitted.add(resolve(project.root, path));
    }
    const assignmentFor = new Map<string, string>();
    for (const task of queue.tasks) {
        if (workKindOf(task) !== 'assignment' || task.status === 'done') continue;
        const target = originTarget(task);
        const found = target ? findTask(queue.tasks, target).task : undefined;
        if (found) assignmentFor.set(found.key, task.title);
    }
    const routes = new Map<string, RouteResolution>();
    const now = Date.now();
    const evaluated = await evaluateQueue(queue.tasks, {
        now,
        timeZone,
        activeKeys: new Set(active.map((record) => record.taskKey || nameKey(record.taskTitle))),
        awaitingUser,
        recovery: new Map([...Object.entries(blockers).map(([ref, blocker]) => [ref, (blocker as { reason: string }).reason] as const), ...integrations]),
        uncommittedSources: uncommitted,
        activation: (task) => (isRecurring(task) ? (activations[task.key] ?? now) : now),
        route: async (task) => {
            const resolution = await resolveRoute(task, { catalog, pool, settings });
            routes.set(task.ref, resolution);
            return resolution.kind === 'routable' ? { kind: 'routable' } : resolution;
        },
        assignmentFor,
    });
    return { evaluated, routes, problems: queue.problems, pool };
}
