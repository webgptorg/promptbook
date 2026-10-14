import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Workspace } from './domain.js';
import { discoverAgents } from './agents.js';
import { addTask } from './authoring.js';
import { discoverTasks, updateTaskControls } from './sources.js';
import { confinePath, InputError } from './workspace.js';

/** Versioned setup evidence survives completion, archiving and deletion of local runtime state. */
interface FirstTaskRecord { version: 1; taskId: string; }

/** Save one ordinary first task; a durable marker prevents reopening or resurrecting archived work. @private */
export async function ensureFirstTask(workspace: Workspace, options: { intent?: string; harness?: string } = {}): Promise<{ paths: string[]; taskId: string }> {
    const marker = await confinePath(workspace.projectPath, join(workspace.tasksPath, 'templates', 'initialization.json'));
    try {
        const record = JSON.parse(await readFile(marker, 'utf8')) as FirstTaskRecord;
        if (record.version !== 1 || typeof record.taskId !== 'string' || !record.taskId) throw new Error('invalid first-task record');
        return { paths: [], taskId: record.taskId };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new InputError(`${marker}: ${(error as Error).message}; preserve and review the first-task evidence before resuming init.`);
    }
    let task = (await discoverTasks(workspace)).find(task => ['engine:initial-readiness', 'engine:agenda-bootstrap'].includes(task.origin ?? ''));
    const paths: string[] = [];
    if (!task) {
        const agents = await discoverAgents(workspace.projectPath);
        const agent = agents.find(agent => agent.normalizedName === 'developer') ?? agents.find(agent => !agent.hidden);
        const path = await addTask(workspace, options.intent ?? 'Inspect project readiness\n\nInspect the initialized project, its instructions, agents, task source and configured validation. Record a short readiness summary in readiness.md with the evidence available and any concrete limitations. Preserve the project purpose and existing user work. Do not implement unrelated features, deploy, or require additional credentials or external side effects.', {
            agent: options.intent ? '@Expert' : agent?.name,
            origin: options.intent ? 'engine:agenda-bootstrap' : 'engine:initial-readiness',
        });
        paths.push(path);
        task = (await discoverTasks(workspace)).find(task => task.source.path === path)!;
        if (options.harness) {
            await updateTaskControls(task, { harness: options.harness });
        }
    }
    await mkdir(join(workspace.tasksPath, 'templates'), { recursive: true });
    await writeFile(marker, `${JSON.stringify({ version: 1, taskId: task.id } satisfies FirstTaskRecord, null, 4)}\n`, { flag: 'wx' });
    return { paths: [...paths, marker], taskId: task.id };
}
