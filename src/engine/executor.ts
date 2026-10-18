import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, hashFileIfExists, isPathInside, readTextIfExists, toProjectRelative } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { creationTimestamp, formatIsoWithOffset } from '../common/time.js';
import { ENGINE_VERSION } from '../common/version.js';
import { appendCommitment } from '../book/edit.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import { runCheck } from '../project/checks.js';
import type { AgentCatalog, EffectiveAgent } from '../project/agents.js';
import { BookIndex } from '../project/books.js';
import { EXPERT_DOCUMENTATION_DIRECTORY } from '../project/expert.js';
import { commitPaths, findCommitWithTrailer, gitStatus, readAtHead, stageableFiles } from '../project/git.js';
import type { Project } from '../project/workspace.js';
import { runHarness, type HarnessRunResult } from '../harness/run.js';
import { readTaskBook, stampBookCompletion } from '../tasks/book-task.js';
import { setMarkdownControl } from '../tasks/markdown.js';
import { assignmentText, isRecurring, type Task } from '../tasks/model.js';
import { parseBook } from '../book/parse.js';
import { normalizeAgentName } from '../book/references.js';
import { ToolBridge, type BridgeTool } from './bridge.js';
import { createLearningTask, isTeacher } from './generated.js';
import type { HarnessPool } from './harnesses.js';
import { buildTaskPrompt } from './prompt.js';
import type { ChatStore } from '../chats/store.js';
import { taskChats } from '../chats/task-chats.js';
import { parseAgentReport, type AgentReport } from './result.js';
import type { RouteResolution } from './routing.js';
import type { ActiveRecord, ResultRecord, RoutingSelection, StateStore, WorkKind } from './state.js';
import { teamTools, type ConsultationBudget } from './team.js';
import { TaskTrace, traceHeader } from './task-trace.js';
import { recordDiagnostic } from './traces.js';

/**
 * Routable resolution of a task.
 *
 * @private task execution
 */
export type RoutableTask = Extract<RouteResolution, { kind: 'routable' }>;

/**
 * Live progress reported by the executor.
 *
 * @private task execution
 */
export type ExecutionEvent =
    | { readonly type: 'phase'; readonly phase: ActiveRecord['phase'] | 'repairing'; readonly detail?: string }
    | { readonly type: 'attempt'; readonly attempt: number; readonly budget: number }
    | { readonly type: 'activity'; readonly text: string; readonly level?: 'info' | 'warning' | 'error' }
    | { readonly type: 'model'; readonly model: string };

/**
 * Waiting reported to the supervisor (skippable pacing/backoff waits only).
 *
 * @private task execution
 */
export type ExecutionWait = { readonly kind: 'error-backoff' | 'pacing'; readonly reason: string };

/**
 * Services the executor needs from its supervisor.
 *
 * @private task execution
 */
export type ExecutionHooks = {
    /** Progress events. */
    readonly emit: (event: ExecutionEvent) => void;
    /** Skippable wait honoring stop/cancellation. */
    readonly wait: (ms: number, info: ExecutionWait) => Promise<'elapsed' | 'skipped' | 'cancelled'>;
    /** Serializes Git operations with concurrent authoring. */
    readonly gitLock: <T>(action: () => Promise<T>) => Promise<T>;
    /** Absolute paths written by concurrent authoring (never attributed to the task). */
    readonly excludedPaths: () => ReadonlySet<string>;
    /** Additional tools (project browser); a human-only step becomes a chat waiting for the user, like `ask_user`. */
    readonly extraTools?: (context: { readonly chats: ReturnType<typeof taskChats>; readonly agent: string; readonly onUserChat: (chat: { chat: string; awaited: number }) => void; readonly trace: TaskTrace; readonly attempt: string }) => BridgeTool[];
    /** Finalizes evidence that belongs in the result commit (browser recordings of this task). */
    readonly finalizeEvidence?: (trace: TaskTrace) => Promise<void>;
};

/**
 * Everything the executor works with.
 *
 * @private task execution
 */
export type ExecutionEnvironment = {
    readonly project: Project;
    readonly settings: EffectiveSettings;
    readonly catalog: AgentCatalog;
    readonly pool: HarnessPool;
    readonly state: StateStore;
    /** The project's chats (human-facing questions are committed per message). */
    readonly chats: ChatStore;
    /** Normalized names of every Book (new chats get distinct names). */
    readonly takenNames: () => ReadonlySet<string>;
    /** Git working tree root. */
    readonly repositoryRoot: string;
    /** Owning process instance. */
    readonly instanceId: string;
    /** Automatic commits enabled. */
    readonly commit: boolean;
    /** Agents may ask the user. */
    readonly questionsAllowed: boolean;
    /** Time zone. */
    readonly timeZone: string;
    /** Absolute task source directory. */
    readonly tasksDirectory: string;
    /** Cancellation of owned work. */
    readonly signal: AbortSignal;
    /** Supervisor services. */
    readonly hooks: ExecutionHooks;
    /** Environment for harnesses and checks. */
    readonly env: NodeJS.ProcessEnv;
};

/**
 * Report validation hook of generated work (Manager decision, Teacher scope, ...).
 *
 * @private task execution
 */
export type ReportValidation = { readonly ok: true; readonly apply?: () => Promise<readonly string[]> } | { readonly ok: false; readonly feedback: string };

/**
 * One piece of work to execute.
 *
 * @private task execution
 */
export type WorkItem = {
    /** Task. */
    readonly task: Task;
    /** Kind of work. */
    readonly kind: WorkKind;
    /** Resolved routing. */
    readonly route: RoutableTask;
    /** Recurring slot (epoch ms). */
    readonly slot?: number;
    /** Additional instructions (generated work). */
    readonly extraPrompt?: string;
    /** Engine-created files belonging to this work (absolute). */
    readonly createdPaths: readonly string[];
    /** Other tasks this work changes on purpose (e.g. the target of an assignment), by name, for commit metadata. */
    readonly relatedTaskNames?: readonly string[];
    /** Validates a `done` report and returns extra edits to apply. */
    readonly validateReport?: (report: AgentReport, changedPaths: readonly string[]) => Promise<ReportValidation>;
    /** Create a Teacher follow-up on success (optionally decided from the changed paths). */
    readonly learning: boolean | ((changedPaths: readonly string[]) => boolean);
    /** Recovery record to resume. */
    readonly resume?: ActiveRecord;
    /** Fixed check override for this work (fix command, temporary --check). */
    readonly check?: string | null;
    /** Run identifier chosen by the caller (isolated worktrees are named after it). */
    readonly runId?: string;
    /** Isolated worktree path (recorded for recovery). */
    readonly worktree?: string;
    /** Integrates a committed isolated result into the original branch; returns the integrated commit. */
    readonly integrate?: (sha: string | undefined) => Promise<string | undefined>;
};

/**
 * Terminal outcome of executing one work item.
 *
 * @private task execution
 */
export type ExecutionOutcome =
    | { readonly kind: 'completed'; readonly commit?: string; readonly summary: string; readonly changedPaths: readonly string[]; readonly report?: AgentReport }
    | { readonly kind: 'awaiting-user'; readonly chat: string }
    | { readonly kind: 'failed'; readonly reason: string; readonly trace?: string }
    | { readonly kind: 'setup'; readonly reason: string; readonly next?: string }
    | { readonly kind: 'quota'; readonly reason: string; readonly retryAfterMs: number }
    | { readonly kind: 'interrupted' }
    | { readonly kind: 'persistence-failed'; readonly reason: string };

/**
 * Initial quota backoff when the provider gives no reset time.
 */
const QUOTA_BACKOFF_MS = 15 * 60_000;

/**
 * Maximal time of one harness turn.
 */
const TURN_TIMEOUT_MS = 4 * 3_600_000;

/**
 * Converts an absolute path to the project-relative key used in records.
 */
function relativeKey(environment: ExecutionEnvironment, path: string): string {
    return toProjectRelative(environment.project.root, path);
}

/**
 * Captures dirty project paths (project-relative) with fingerprints, excluding runtime storage.
 *
 * @private task execution
 */
export async function captureSnapshot(environment: Pick<ExecutionEnvironment, 'project' | 'repositoryRoot'>, excluded: ReadonlySet<string> = new Set()): Promise<Record<string, string | null>> {
    const snapshot: Record<string, string | null> = {};
    const runtimeDirectory = join(environment.project.root, '.ptbk');
    // Task traces are engine-owned evidence staged per task and trace policy, never "unrelated" or task changes.
    const tracesDirectory = join(environment.project.root, 'traces');
    for (const entry of await gitStatus(environment.project.root, environment.repositoryRoot)) {
        if (isPathInside(runtimeDirectory, entry.path) || isPathInside(tracesDirectory, entry.path) || excluded.has(entry.path)) continue;
        if (!isPathInside(environment.project.root, entry.path)) continue;
        snapshot[toProjectRelative(environment.project.root, entry.path)] = (await hashFileIfExists(entry.path)) ?? null;
    }
    return snapshot;
}

/**
 * Paths whose fingerprint changed since the pre-task snapshot.
 *
 * @private task execution
 */
export function changedPaths(before: Readonly<Record<string, string | null>>, after: Readonly<Record<string, string | null>>): string[] {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((path) => before[path] !== after[path]).sort();
}

/**
 * Normalizes CRLF to LF in changed text files whose committed version used LF.
 */
async function normalizeLineEndings(environment: ExecutionEnvironment, paths: readonly string[]): Promise<void> {
    for (const relativePath of paths) {
        const absolutePath = resolve(environment.project.root, relativePath);
        const content = await readFile(absolutePath).catch(() => undefined);
        if (!content || content.includes(0) || !content.includes('\r\n')) continue;
        const committed = await readAtHead(environment.repositoryRoot, absolutePath);
        if (committed !== undefined && committed.includes('\r\n')) continue;
        await writeFile(absolutePath, content.toString('utf8').replace(/\r\n/g, '\n'));
    }
}

/**
 * Applies the completion record (and recurring anchor) to the task source, returning a revert function.
 */
async function applyCompletion(environment: ExecutionEnvironment, item: WorkItem, at: number, activation: number | undefined): Promise<{ paths: string[]; revert: () => Promise<void> }> {
    const task = item.task;
    const original = await readFile(task.source.path, 'utf8');
    let updated: string;
    if (task.source.kind === 'book') {
        const current = readTaskBook({ source: original, path: task.source.path, relativePath: task.source.relativePath, order: 0, timeZone: environment.timeZone });
        if (!current || current.key !== task.key) {
            throw new PtbkError('The task source changed identity during execution.', {
                kind: 'conflict',
                task: task.ref,
                reason: `${task.source.relativePath} no longer declares the task "${task.title}".`,
                preserved: 'All changes were preserved; no completion was recorded.',
                next: [`Inspect ${task.source.relativePath} and run \`ptbk recover ${task.ref}\`.`],
            });
        }
        updated = original;
        if (isRecurring(task) && task.after === undefined && activation !== undefined) updated = appendCommitment(updated, 'TASK AFTER', formatIsoWithOffset(activation, environment.timeZone));
        updated = stampBookCompletion(updated, at, environment.timeZone);
    } else {
        const annotation = `done ${formatIsoWithOffset(at, environment.timeZone)} by ${item.route.selection.agent} (${item.route.selection.harness}${item.route.selection.model ? ` ${item.route.selection.model}` : ''})`;
        updated = setMarkdownControl(original, { hash: task.source.sectionHash }, 'x', annotation);
    }
    await writeFile(task.source.path, updated);
    return { paths: [task.source.relativePath], revert: async () => writeFile(task.source.path, original) };
}

/**
 * Task names declared in a task source text (a Book, or the sections of a Markdown file).
 */
function declaredTaskNames(path: string, source: string): string[] {
    if (!source) return [];
    if (path.toLowerCase().endsWith('.book')) {
        const document = parseBook(source);
        return document.kind === 'task' && document.name ? [document.name] : [];
    }
    return [];
}

/**
 * Problems of task Books newly written by the agent: each must be a canonical `TASK <name>` Book whose name no other
 * Book of the project already uses (a new task must not shadow an existing definition or be born shadowed).
 */
async function newTaskBookProblems(environment: ExecutionEnvironment, changed: readonly string[]): Promise<string[]> {
    const fresh = changed.filter((path) => /\.book$/i.test(path) && isPathInside(environment.tasksDirectory, resolve(environment.project.root, path)));
    if (!fresh.length) return [];
    const index = await BookIndex.load(environment.project.root, { agents: setting<string>(environment.settings, 'paths.agents'), tasks: setting<string>(environment.settings, 'paths.tasks') });
    const problems: string[] = [];
    for (const relativePath of fresh) {
        const absolutePath = resolve(environment.project.root, relativePath);
        if ((await readAtHead(environment.repositoryRoot, absolutePath)) !== undefined) continue;
        const source = await readFile(absolutePath, 'utf8').catch(() => undefined);
        if (source === undefined) continue;
        const document = parseBook(source);
        if (document.kind !== 'task') {
            const errors = document.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').map((diagnostic) => diagnostic.message);
            if (document.kind !== 'agent' && document.kind !== 'chat') problems.push(`${relativePath} is not a valid task Book${errors.length ? `: ${errors.join(' ')}` : ''}. Start it with \`TASK <name>\` and put the description under GOAL.`);
            continue;
        }
        const others = index.all().filter((entry) => entry.normalized === normalizeAgentName(document.name) && entry.path !== absolutePath);
        if (others.length) problems.push(`The new task "${document.name}" in ${relativePath} has the same name as ${others.map((entry) => entry.relativePath).join(', ')}; give it a distinct name (include its creation date/time).`);
        const errors = document.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
        if (errors.length) problems.push(`${relativePath}: ${errors.map((diagnostic) => `line ${diagnostic.line}: ${diagnostic.message}`).join(' ')}`);
    }
    return problems;
}

/**
 * Task names of a commit beyond the executing task: follow-ups created by the work and other tasks it changed.
 */
async function commitTaskNames(environment: ExecutionEnvironment, task: Task, owned: readonly string[], related: readonly string[]): Promise<{ created: string[]; related: string[] }> {
    const created = new Map<string, string>();
    const touched = new Map<string, string>(related.map((name) => [normalizeAgentName(name), name]));
    for (const relativePath of owned) {
        if (!/\.book$/i.test(relativePath)) continue;
        const absolutePath = resolve(environment.project.root, relativePath);
        const current = await readFile(absolutePath, 'utf8').catch(() => undefined);
        if (current === undefined) continue;
        const before = new Set(declaredTaskNames(absolutePath, (await readAtHead(environment.repositoryRoot, absolutePath)) ?? '').map(normalizeAgentName));
        for (const name of declaredTaskNames(absolutePath, current)) {
            const key = normalizeAgentName(name);
            if (key === task.key) continue;
            if (before.has(key)) touched.set(key, name);
            else created.set(key, name);
        }
    }
    return { created: [...created.values()], related: [...touched.entries()].filter(([key]) => key !== task.key && !created.has(key)).map(([, name]) => name) };
}

/**
 * Trace files eligible for the task's result commit under the saved trace policy (never ignored evidence).
 */
async function traceCommitPaths(environment: ExecutionEnvironment, trace: TaskTrace): Promise<string[]> {
    if (!environment.commit || !setting<boolean>(environment.settings, 'traces.commit')) return [];
    await trace.flush();
    return await stageableFiles(environment.project.root, trace.relativeDirectory);
}

/**
 * Executes one work item through the common lifecycle: run the agent, verify the reported outcome and project
 * checks on the content to be committed, stamp completion and follow-ups, and commit one result with its task ID
 * and policy-eligible traces.
 *
 * @private task execution
 */
export async function executeWork(environment: ExecutionEnvironment, item: WorkItem): Promise<ExecutionOutcome> {
    const { project, settings, state, hooks } = environment;
    const task = item.task;
    if (!task.key) throw new PtbkError(`"${task.title}" has no usable name.`, { kind: 'internal', task: task.ref });
    const selection: RoutingSelection = item.route.selection;
    const repairBudget = Math.max(1, setting<number>(settings, 'execution.repairAttempts'));
    const technicalBudget = setting<number>(settings, 'execution.technicalRetries');
    const check = item.check !== undefined ? item.check : (setting<string | null | undefined>(settings, 'execution.check') ?? undefined);
    const occurrence = item.slot !== undefined ? formatIsoWithOffset(item.slot, environment.timeZone) : undefined;
    const now = new Date().toISOString();
    let record: ActiveRecord = item.resume ?? {
        version: 1,
        runId: item.runId ?? shortId(10),
        worktree: item.worktree,
        taskRef: task.ref,
        taskKey: task.key,
        taskTitle: task.title,
        sourcePath: task.source.relativePath,
        sectionHash: task.source.sectionHash,
        occurrence,
        kind: item.kind,
        phase: 'claimed',
        attempt: 0,
        technicalRetries: 0,
        routing: selection,
        preSnapshot: await captureSnapshot(environment, new Set([...hooks.excludedPaths(), ...item.createdPaths.map((path) => resolve(path))])),
        createdPaths: item.createdPaths.map((path) => relativeKey(environment, path)),
        completionApplied: false,
        noCommit: !environment.commit,
        instanceId: environment.instanceId,
        startedAt: now,
        updatedAt: now,
        history: [],
    };
    const save = async (changes: Partial<ActiveRecord>): Promise<void> => {
        record = { ...record, ...changes, instanceId: environment.instanceId };
        await state.writeActive(record);
    };
    await save({});
    const trace = await TaskTrace.open(project, task.title);
    if (trace.problem) hooks.emit({ type: 'activity', text: `Evidence limitation: ${trace.problem}`, level: 'warning' });
    const runLabel = `run ${record.runId}${occurrence ? ` · occurrence ${occurrence}` : ''}`;
    if (!item.resume) {
        await trace.section(`Task {{${task.title}}} · ${runLabel}`, [traceHeader({ title: task.title, source: task.source.relativePath }), `Kind: ${item.kind}${task.origin ? ` · origin: ${task.origin}` : ''}${task.parent ? ` · parent: ${task.parent}` : ''}`]);
        await trace.event('started', { runId: record.runId, occurrence, kind: item.kind, title: task.title, source: task.source.relativePath, origin: task.origin, parent: task.parent, assignment: assignmentText(task), engineVersion: ENGINE_VERSION });
    } else {
        await trace.event('resumed', { runId: record.runId, occurrence: record.occurrence, phase: record.phase, attempt: record.attempt, engineVersion: ENGINE_VERSION });
    }
    const agent: EffectiveAgent = item.route.agent;
    const budget: ConsultationBudget = { calls: 0 };
    const pending: { chat?: { chat: string; awaited: number } } = {};
    const resetPending = (): void => {
        pending.chat = undefined;
    };
    const chats = taskChats(environment.chats, { name: task.title, key: task.key }, { takenNames: environment.takenNames });
    let lastResult: HarnessRunResult | undefined;
    let lastReport: AgentReport | undefined;
    const contextFile = setting<string | null>(settings, 'paths.context');
    const context = contextFile ? await readTextIfExists(resolve(project.root, contextFile)) : undefined;

    const changed = async (): Promise<string[]> => changedPaths(record.preSnapshot, await captureSnapshot(environment, hooks.excludedPaths()));
    const finishResult = async (outcome: ResultRecord['outcome'], summary: string, commit?: string): Promise<void> => {
        await state.appendResult({
            taskRef: task.ref,
            taskName: task.title,
            title: task.title,
            kind: item.kind,
            outcome,
            agent: selection.agent,
            harness: selection.harness,
            model: lastResult?.model ?? selection.model,
            thinkingLevel: selection.thinkingLevel,
            commit,
            attempts: record.attempt,
            summary,
            startedAt: record.startedAt,
            endedAt: new Date().toISOString(),
            trace: trace.reference,
            occurrence: record.occurrence,
            engineVersion: ENGINE_VERSION,
            harnessVersion: item.route.inspection.version,
            usage: lastResult?.usage,
            costUsd: lastResult?.costUsd,
        });
    };
    const fail = async (reason: string): Promise<ExecutionOutcome> => {
        await save({ phase: 'failed', failure: reason });
        await finishResult('failed', reason);
        await trace.event('failed', { runId: record.runId, reason });
        await recordDiagnostic(project, { phase: 'task execution', message: reason, details: { task: task.ref, trace: trace.reference } });
        hooks.emit({ type: 'activity', text: `Failed: ${reason}`, level: 'error' });
        return { kind: 'failed', reason, trace: trace.reference };
    };

    // Resume an awaiting-user checkpoint only with a real reply in its chat.
    if (record.phase === 'awaiting-user' && record.waitingChat) {
        const stored = await environment.chats.find(record.waitingChat);
        const reply = stored?.chat.messages.slice(record.awaitedMessages ?? 0).find((message) => message.senderKey === 'user');
        // A valid answer reopens the chat; resolving it without an answer lets the task continue with what it has.
        if (!stored || stored.chat.status === 'waiting-for-user' || (!reply && stored.chat.status !== 'resolved')) return { kind: 'awaiting-user', chat: record.waitingChat };
        await trace.event('user-reply', { chat: stored.chat.name, at: reply?.at, reply: reply?.text ?? '(resolved without a reply)' });
        await save({ phase: 'executing', waitingChat: undefined, awaitedMessages: undefined, chats: [...new Set([...(record.chats ?? []), stored.chat.name])] });
        // The agent's question is answered: the chat's action state is resolved (a later message reopens the conversation).
        await environment.chats.setStatus(stored.chat.name, 'resolved').catch(() => undefined);
    }

    if (record.phase === 'failed') return { kind: 'failed', reason: record.failure ?? 'The task needs recovery.', trace: trace.reference };
    if (record.phase === 'committed' || record.phase === 'synchronizing') {
        await state.clearActive();
        return { kind: 'completed', commit: record.commitSha, summary: 'Recovered a committed result.', changedPaths: [] };
    }
    let skipAgent = record.phase === 'checking' || record.phase === 'finalizing' || record.phase === 'committing';
    if (record.history.length && record.phase === 'executing' && !record.feedback && !record.chats?.length) {
        record = { ...record, feedback: 'A previous attempt was interrupted. The working tree may contain its partial changes: inspect them and continue. Do not repeat external actions without verifying their current state.' };
    }

    for (;;) {
        if (environment.signal.aborted) {
            await save({});
            await trace.event('interrupted', { runId: record.runId, phase: record.phase });
            return { kind: 'interrupted' };
        }
        if (!skipAgent) {
            const attempt = record.attempt + 1;
            if (attempt > repairBudget) return await fail(`The requested outcome was not accepted after ${repairBudget} attempts. Last problem: ${record.feedback ?? 'unknown'}`);
            await save({ phase: 'executing', attempt });
            hooks.emit({ type: 'phase', phase: attempt > 1 ? 'repairing' : 'executing', detail: attempt > 1 ? `repair attempt ${attempt}/${repairBudget}` : undefined });
            hooks.emit({ type: 'attempt', attempt, budget: repairBudget });
            const attemptLabel = `${record.runId}-a${attempt}${record.technicalRetries ? `-t${record.technicalRetries}` : ''}`;
            const conversations: Array<{ chat: string; messages: Array<{ sender: string; text: string }> }> = [];
            for (const name of record.chats ?? []) {
                const stored = await environment.chats.find(name);
                if (stored) conversations.push({ chat: stored.chat.name, messages: stored.chat.messages.map((message) => ({ sender: message.sender, text: message.text })) });
            }
            const tools: BridgeTool[] = [];
            const plugin = item.route.plugin;
            if (plugin.capabilities.mcp) {
                tools.push(
                    ...teamTools({
                        project,
                        catalog: environment.catalog,
                        pool: environment.pool,
                        settings,
                        chats,
                        task: { ref: task.ref, title: task.title, occurrence: record.occurrence },
                        trace,
                        agentName: agent.name,
                        harness: selection.harness,
                        depth: 0,
                        budget,
                        questionsAllowed: environment.questionsAllowed,
                        signal: environment.signal,
                        onUserChat: (chat) => {
                            pending.chat = chat;
                        },
                        onActivity: (text) => hooks.emit({ type: 'activity', text }),
                    }),
                    ...(hooks.extraTools?.({ chats, agent: agent.name, onUserChat: (chat) => (pending.chat = chat), trace, attempt: attemptLabel }) ?? []),
                );
            }
            const prompt = buildTaskPrompt({
                agent,
                task,
                projectRoot: project.root,
                tasksDirectory: toProjectRelative(project.root, environment.tasksDirectory),
                context: context !== undefined && contextFile ? { name: contextFile, content: context } : undefined,
                check: check ?? undefined,
                tools: { team: tools.some((tool) => tool.name === 'consult'), askUser: tools.some((tool) => tool.name === 'ask_user'), browser: tools.some((tool) => tool.name.startsWith('browser_')) },
                feedback: record.feedback,
                attempt,
                extra: item.extraPrompt,
                conversations,
                creationStamp: creationTimestamp(Date.now(), environment.timeZone),
            });
            const bridge = tools.length ? await ToolBridge.start(tools) : undefined;
            const promptDirectory = await ensureDirectory(project.runtime.temporary);
            const promptFile = join(promptDirectory, `prompt-${record.runId}-${attempt}.md`);
            await writeFile(promptFile, prompt);
            const harnessLabel = `${plugin.displayName} ${item.route.inspection.version ?? ''}`.trim();
            await trace.section(`Attempt ${attempt}/${repairBudget}${record.technicalRetries ? ` (technical retry ${record.technicalRetries})` : ''} · ${runLabel}`, [
                `Agent: ${agent.name} · Harness: ${harnessLabel} · Model: ${selection.model ?? '(harness default)'} · Thinking: ${selection.thinkingLevel ?? '(default)'}`,
                `Started: ${new Date().toISOString()}`,
                '',
                '## Prompt',
                '',
                bridge ? prompt.split(bridge.secret).join('[REDACTED]') : prompt,
                '## Harness output (as exposed to Promptbook; hidden reasoning is never captured)',
                '',
            ]);
            await trace.event('attempt-started', {
                runId: record.runId,
                attempt,
                occurrence: record.occurrence,
                technicalRetry: record.technicalRetries,
                agent: agent.name,
                harness: selection.harness,
                harnessVersion: item.route.inspection.version,
                model: selection.model ?? null,
                thinkingLevel: selection.thinkingLevel ?? null,
                engineVersion: ENGINE_VERSION,
            });
            resetPending();
            try {
                lastResult = await runHarness(
                    plugin,
                    {
                        projectRoot: project.root,
                        cwd: project.root,
                        prompt,
                        promptFile,
                        model: selection.model,
                        thinkingLevel: selection.thinkingLevel,
                        readOnly: false,
                        mcp: bridge?.launch(),
                        env: environment.env,
                        timeoutMs: TURN_TIMEOUT_MS,
                        stallTimeoutMs: setting<number>(settings, 'execution.stallTimeout'),
                        signal: environment.signal,
                        allowCredits: setting<boolean>(settings, 'execution.allowCredits'),
                        authentication: item.route.inspection.authentication,
                        readableDirectories: agent.name === 'Expert' || agent.chain.includes('Expert') ? [EXPERT_DOCUMENTATION_DIRECTORY] : [],
                        onEvent: (event) => {
                            if (event.type === 'activity') hooks.emit({ type: 'activity', text: event.text });
                            else if (event.type === 'error') hooks.emit({ type: 'activity', text: event.text, level: 'warning' });
                            else if (event.type === 'model') hooks.emit({ type: 'model', model: event.model });
                        },
                        onOutput: (stream, line) => trace.output(stream, bridge ? line.split(bridge.secret).join('[REDACTED]') : line),
                    },
                    item.route.inspection.executablePath ?? plugin.executable,
                );
            } finally {
                await bridge?.close();
                await rm(promptFile, { force: true });
            }
            await trace.text(`\n## Attempt outcome\n\n${lastResult.outcome}: ${lastResult.diagnostic}\nExit code: ${String(lastResult.exitCode)} · duration ${Math.round(lastResult.durationMs / 1000)}s${lastResult.model ? ` · model ${lastResult.model}` : ''}`);
            await trace.event('attempt-finished', {
                runId: record.runId,
                attempt,
                outcome: lastResult.outcome,
                diagnostic: lastResult.diagnostic,
                exitCode: lastResult.exitCode,
                durationMs: lastResult.durationMs,
                model: lastResult.model ?? null,
                usage: lastResult.usage ?? null,
                costUsd: lastResult.costUsd ?? null,
            });
            const history = [...record.history, { attempt, outcome: lastResult.outcome, diagnostic: lastResult.diagnostic, trace: trace.reference, occurrence: record.occurrence, at: new Date().toISOString() }];
            await save({ history, feedback: undefined });
            const waitAfterPrompt = setting<number>(settings, 'execution.waitAfterPrompt');
            if (waitAfterPrompt > 0 && !environment.signal.aborted) await hooks.wait(waitAfterPrompt, { kind: 'pacing', reason: 'Pause after a harness call (--wait-after-prompt).' });

            if (lastResult.outcome === 'cancelled' || environment.signal.aborted) {
                await save({ attempt: attempt - 1 });
                await trace.event('interrupted', { runId: record.runId, attempt });
                return { kind: 'interrupted' };
            }
            if (lastResult.outcome === 'authentication') {
                environment.pool.invalidate(selection.harness);
                await save({ attempt: attempt - 1 });
                return { kind: 'setup', reason: lastResult.diagnostic, next: plugin.loginHint };
            }
            if (lastResult.outcome === 'quota') {
                await save({ attempt: attempt - 1 });
                await trace.event('waiting', { reason: 'provider quota', diagnostic: lastResult.diagnostic, retryAfterMs: QUOTA_BACKOFF_MS });
                return { kind: 'quota', reason: lastResult.diagnostic, retryAfterMs: QUOTA_BACKOFF_MS };
            }
            const report = parseAgentReport(lastResult.messages);
            if (pending.chat && (!report || report.status === 'waiting-for-user')) {
                await save({ phase: 'awaiting-user', waitingChat: pending.chat.chat, awaitedMessages: pending.chat.awaited, chats: [...new Set([...(record.chats ?? []), pending.chat.chat])], attempt: attempt - 1 });
                hooks.emit({ type: 'phase', phase: 'awaiting-user', detail: `{{${pending.chat.chat}}}` });
                await trace.event('awaiting-user', { runId: record.runId, chat: pending.chat.chat });
                await finishResult('awaiting-user', `Waiting for the user's reply in the chat {{${pending.chat.chat}}}.`);
                return { kind: 'awaiting-user', chat: pending.chat.chat };
            }
            if (lastResult.outcome !== 'completed') {
                const technical = record.technicalRetries + 1;
                if (technical > technicalBudget) return await fail(`${lastResult.diagnostic} (technical retries exhausted)`);
                await save({ technicalRetries: technical, attempt: attempt - 1, feedback: `The previous run ended with a technical failure (${lastResult.diagnostic}). Continue the task.` });
                hooks.emit({ type: 'activity', text: `${lastResult.diagnostic} — technical retry ${technical}/${technicalBudget}`, level: 'warning' });
                await trace.event('technical-retry', { runId: record.runId, retry: technical, budget: technicalBudget, diagnostic: lastResult.diagnostic });
                const waited = await hooks.wait(setting<number>(settings, 'execution.waitAfterError'), { kind: 'error-backoff', reason: `Technical failure: ${lastResult.diagnostic}` });
                if (waited === 'cancelled') return { kind: 'interrupted' };
                continue;
            }
            if (!report) {
                await save({ feedback: 'Your final message did not end with the required PTBK_RESULT line, so the outcome could not be verified. Verify the result and end with the completion line.' });
                await trace.event('repair-needed', { attempt, reason: 'missing completion report' });
                continue;
            }
            lastReport = report;
            await trace.event('report', { attempt, status: report.status, summary: report.summary, reason: report.reason });
            if (pending.chat && report.status !== 'waiting-for-user') {
                // The question no longer blocks the task; the chat stays as an ordinary open conversation.
                await environment.chats.setStatus(pending.chat.chat, 'open').catch(() => undefined);
            }
            if (report.status === 'blocked') return await fail(`${agent.name} reported the task as blocked: ${report.reason ?? report.summary}`);
            if (report.status === 'waiting-for-user') {
                await save({ feedback: 'You reported waiting-for-user without calling ask_user. Ask through the tool only for a genuine blocker, or complete the task.' });
                continue;
            }
            if (item.validateReport) {
                const validation = await item.validateReport(report, await changed());
                if (!validation.ok) {
                    await save({ feedback: validation.feedback });
                    await trace.event('repair-needed', { attempt, reason: validation.feedback });
                    continue;
                }
                const extra = (await validation.apply?.()) ?? [];
                if (extra.length) await save({ createdPaths: [...new Set([...record.createdPaths, ...extra.map((path) => relativeKey(environment, path))])] });
            }
            const followUpProblems = await newTaskBookProblems(environment, await changed());
            if (followUpProblems.length) {
                const feedback = `Fix the new task Books before the result is accepted:\n${followUpProblems.map((problem) => `- ${problem}`).join('\n')}`;
                await save({ feedback });
                await trace.event('repair-needed', { attempt, reason: feedback });
                continue;
            }
            const migrateCommand = setting<string | undefined>(settings, 'execution.migrateCommand');
            if (setting<boolean>(settings, 'execution.autoMigrate') && migrateCommand) {
                hooks.emit({ type: 'activity', text: `Running migration hook: ${migrateCommand}` });
                const migration = await runCheck(project.root, migrateCommand, { env: environment.env, signal: environment.signal });
                await trace.event('migration-hook', { command: migrateCommand, passed: migration.passed, exitCode: migration.exitCode });
                if (!migration.passed) {
                    await save({ feedback: `The migration hook \`${migrateCommand}\` failed:\n\n${migration.output}` });
                    continue;
                }
            }
            if (setting<boolean>(settings, 'execution.normalizeLineEndings')) await normalizeLineEndings(environment, await changed());
        }
        skipAgent = false;

        // Finalize: completion record + follow-ups, then checks on exactly that content.
        if (!record.completionApplied) {
            await save({ phase: 'finalizing' });
            hooks.emit({ type: 'phase', phase: 'finalizing' });
            const activation = isRecurring(task) ? (await state.readActivations())[task.key] : undefined;
            const originalSource = await readFile(task.source.path, 'utf8');
            try {
                await applyCompletion(environment, item, Date.now(), activation);
            } catch (error) {
                return await fail(errorMessage(error));
            }
            const created: string[] = [];
            const wantsLearning = typeof item.learning === 'function' ? item.learning(await changed()) : item.learning;
            if (wantsLearning && setting<boolean>(settings, 'learning.enabled') && agent.definition && !isTeacher(agent.name) && agent.learning.open) {
                const learning = await createLearningTask({
                    projectRoot: project.root,
                    tasksDirectory: environment.tasksDirectory,
                    task,
                    taskRef: task.ref,
                    agent,
                    trace: trace.reference,
                    occurrence: record.occurrence,
                    timeZone: environment.timeZone,
                    taken: environment.takenNames(),
                });
                created.push(relativeKey(environment, learning.path));
            }
            await save({ completionApplied: true, completionBackup: { source: originalSource, created }, createdPaths: [...new Set([...record.createdPaths, ...created])] });
        }
        const revertCompletion = async (): Promise<void> => {
            const backup = record.completionBackup;
            if (backup) {
                await writeFile(task.source.path, backup.source);
                for (const path of backup.created) await rm(resolve(project.root, path), { force: true });
            }
            await save({ completionApplied: false, completionBackup: undefined, createdPaths: record.createdPaths.filter((path) => !backup?.created.includes(path)) });
        };

        if (check) {
            await save({ phase: 'checking' });
            hooks.emit({ type: 'phase', phase: 'checking', detail: check });
            hooks.emit({ type: 'activity', text: `Running check: ${check}` });
            const result = await runCheck(project.root, check, { env: environment.env, signal: environment.signal });
            await trace.section(`Check \`${check}\` (${result.passed ? 'passed' : 'failed'}, exit ${String(result.exitCode)})`, [result.output]);
            await trace.event('check', { command: check, passed: result.passed, exitCode: result.exitCode, durationMs: result.durationMs, failure: result.failure });
            if (environment.signal.aborted) return { kind: 'interrupted' };
            if (result.failure && !result.passed && result.exitCode === null) {
                hooks.emit({ type: 'activity', text: `Check could not run: ${result.failure}`, level: 'error' });
            }
            if (!result.passed) {
                hooks.emit({ type: 'activity', text: `Check failed (exit ${String(result.exitCode)})`, level: 'warning' });
                await revertCompletion();
                await save({ phase: 'executing', feedback: `The project check \`${check}\` failed (exit ${String(result.exitCode)}${result.failure ? `, ${result.failure}` : ''}). Fix the cause without weakening the check:\n\n\`\`\`\n${result.output.slice(-12_000)}\n\`\`\`` });
                if (record.attempt >= repairBudget) return await fail(`The project check \`${check}\` still fails after ${repairBudget} attempts.`);
                continue;
            }
            hooks.emit({ type: 'activity', text: `Check passed (${Math.round(result.durationMs / 1000)}s)` });
        }

        // Persist: one scoped commit with the result, completion, follow-ups and policy-eligible traces.
        const owned = await changed();
        if (environment.commit) {
            await save({ phase: 'committing' });
            hooks.emit({ type: 'phase', phase: 'committing' });
            const existing = await findCommitWithTrailer(environment.repositoryRoot, 'PTBK-Run', record.runId);
            let sha = existing;
            if (!sha) {
                try {
                    await hooks.finalizeEvidence?.(trace).catch((error: unknown) => hooks.emit({ type: 'activity', text: `Evidence limitation: ${errorMessage(error)}`, level: 'warning' }));
                    const names = await commitTaskNames(environment, task, owned, item.relatedTaskNames ?? []);
                    await trace.event('committing', { runId: record.runId, paths: owned, createdTasks: names.created, relatedTasks: names.related });
                    const evidence = await traceCommitPaths(environment, trace);
                    const outcome = await hooks.gitLock(() =>
                        commitPaths({
                            projectRoot: project.root,
                            repositoryRoot: environment.repositoryRoot,
                            paths: [...owned.map((path) => resolve(project.root, path)), ...evidence],
                            subject: task.title,
                            body: assignmentText(task),
                            trailers: {
                                'Task-Name': task.title,
                                'Created-Task-Name': names.created,
                                'Related-Task-Name': names.related,
                                'PTBK-Run': record.runId,
                                ...(record.occurrence ? { 'PTBK-Occurrence': record.occurrence } : {}),
                            },
                            temporaryDirectory: project.runtime.temporary,
                            env: environment.env,
                        }),
                    );
                    sha = outcome.committed ? outcome.sha : undefined;
                } catch (error) {
                    const reason = errorMessage(error);
                    const details = error instanceof PtbkError ? error.details.reason : undefined;
                    await save({ phase: 'committing', failure: details ?? reason });
                    await trace.event('commit-failed', { runId: record.runId, reason: details ?? reason }, { local: true });
                    await recordDiagnostic(project, { phase: 'commit', message: reason, details: { task: task.ref, reason: details } });
                    hooks.emit({ type: 'activity', text: `Commit failed: ${details ?? reason}`, level: 'error' });
                    return { kind: 'persistence-failed', reason: details ?? reason };
                }
            }
            if (item.integrate) {
                await save({ phase: 'synchronizing', commitSha: sha });
                hooks.emit({ type: 'phase', phase: 'synchronizing', detail: 'integrating the isolated result' });
                try {
                    sha = await item.integrate(sha);
                } catch (error) {
                    return await fail(`Integration of the isolated result failed: ${errorMessage(error)}`);
                }
            }
            await save({ phase: 'committed', commitSha: sha });
            // Recorded after the snapshot: the commit cannot contain its own hash.
            await trace.event('committed', { runId: record.runId, occurrence: record.occurrence, commit: sha ?? null }, { local: true });
            const summary = lastReport?.summary || 'Completed.';
            await finishResult('completed', summary, sha);
            await state.clearActive();
            hooks.emit({ type: 'activity', text: `Committed ${sha ? sha.slice(0, 8) : '(no changes)'} PTBK: ${task.title}` });
            return { kind: 'completed', commit: sha, summary, changedPaths: owned, report: lastReport };
        }
        await hooks.finalizeEvidence?.(trace).catch(() => undefined);
        const after = await captureSnapshot(environment, hooks.excludedPaths());
        await state.addOwnedUncommitted(Object.fromEntries(owned.map((path) => [path, after[path] ?? null])));
        const summary = lastReport?.summary || 'Completed (uncommitted).';
        await trace.event('completed-uncommitted', { runId: record.runId, occurrence: record.occurrence, paths: owned });
        await finishResult('completed-uncommitted', summary);
        await state.clearActive();
        hooks.emit({ type: 'activity', text: `Checked but not committed (--no-commit): ${owned.length} path(s)` });
        return { kind: 'completed', summary, changedPaths: owned, report: lastReport };
    }
}
