import { randomUUID, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { BridgeTool } from './team.js';
import type { EligibilityContext, EligibilityResult, TaskDefinition, Workspace } from './domain.js';
import { discoverTasks, assignTaskId, recordTaskCompletion } from './sources.js';
import { evaluateEligibility } from './schedule.js';
import { prepareAgent, ensureCoreAgents } from './agents.js';
import { runHarness, redactSecrets, loadProjectSecrets, type HarnessRequest, type HarnessResult } from './harness.js';
import { runCheck, runPrivateOperation, validateCheck, type CheckResult } from './checks.js';
import { confinePath, InputError, resolveAgentSelection } from './workspace.js';
import { acquireLease, atomicWrite, listRecovery, readJournals, readLedger, saveLedger, writeJournal, type AttemptRecord, type Ledger, type RunJournal, type WorkspaceLease } from './state.js';
import { alignOwnedIndex, assertSnapshot, captureSnapshot, changedPaths, commitIdentity, commitScoped, discoverGit, git, GitPersistenceError, normalizeOwned, readFileSnapshot, sameFile, writeFileSnapshot, type GitIdentity, type GitSnapshot } from './git.js';
import { installedEngineVersion } from './version.js';
import type { FileReplacementOptions } from './file-replacement.js';

/** Shared terminal/server event, containing only redacted diagnostics. @private */
export interface EngineEvent { type: string; message: string; taskId?: string; occurrenceId?: string; time: number; [key: string]: unknown }
/** Finite run outcome, separating local completion from pending remote synchronization. @private */
export interface RunResult { completed: number; failed: number; skipped: number; commits: string[]; exitCode: 0 | 1 | 2 | 130; events: EngineEvent[]; nextWakeUp?: number; syncPending?: boolean; retainedPaths?: string[] }
/** Common execution options, with deterministic harness/time seams for offline tests. @private */
export interface RunOptions {
    harness?: string; harnessVersion?: string; model?: string; thinkingLevel?: string; agent?: string; context?: string;
    harnessConfiguration?: { apiKeyEnv?: string; configurationPath?: string };
    harnessSettings?: Record<string, { model?: string; thinkingLevel?: string; apiKeyEnv?: string; configurationPath?: string }>;
    configurationSources?: Record<string, string>;
    check?: string; checkBefore?: 'no' | 'yes-and-fail' | 'yes-and-fix'; gitChanges?: 'fail' | 'ignore' | 'continue';
    noCommit?: boolean; noAuto?: boolean; noQuestions?: boolean; autoPull?: boolean; autoPush?: boolean;
    isolate?: boolean; normalizeLineEndings?: boolean; limit?: number; minPriority?: number; maxPriority?: number;
    allowCredits?: boolean; waitBetweenPrompts?: number; waitAfterPrompt?: number; waitAfterError?: number;
    dryRun?: boolean; signal?: AbortSignal; onEvent?: (event: EngineEvent) => void; onOutput?: (text: string) => void;
    isPaused?: () => boolean; shouldStop?: () => boolean; skipWait?: () => boolean;
    onWait?: (waiting: boolean) => void;
    onTaskBoundary?: (activeOptions: RunOptions) => Promise<void> | void;
    confirm?: (step: 'task' | 'commit', message: string) => Promise<boolean>;
    runHarness?: (request: HarnessRequest) => Promise<HarnessResult>; now?: () => number;
    sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>; preserveLogs?: boolean;
    redactProjectPath?: string;
    identity?: GitIdentity; contextNoticeShown?: boolean;
    assertOwned?: () => Promise<void>;
    /** Filesystem seams for verifying task publication failures without repeating inference. */
    sourceWriteOptions?: FileReplacementOptions;
    requireAcceptance?: boolean; tools?: BridgeTool[]; requestProjectPath?: string; taskId?: string; onlyTaskId?: string;
    toolsForHarness?: (harness: string, taskId: string, occurrenceId: string) => BridgeTool[];
    verifyOutcome?: (task: TaskDefinition, response: HarnessResult, workspace: Workspace) => Promise<{ satisfied: boolean; evidence: string }>;
}
/** Initialize a finite report without any workspace side effects. @private */
function report(): RunResult { return { completed: 0, failed: 0, skipped: 0, commits: [], exitCode: 0, events: [] }; }
/** Retain the last two MiB of UTF-8 output without splitting a code point. @private */
function retainedOutput(text: string): string {
    const bytes = Buffer.from(text); const limit = 2 * 1024 * 1024;
    if (bytes.length <= limit) return text;
    const marker = '[ptbk] Earlier output truncated; retained the last output within 2 MiB.\n';
    let start = bytes.length - limit + Buffer.byteLength(marker);
    while ((bytes[start]! & 0xc0) === 0x80) start++;
    return marker + bytes.subarray(start).toString('utf8');
}
/** Publish bounded events so a long invocation cannot retain its entire raw stream. @private */
function emit(result: RunResult, options: RunOptions, type: string, message: string, task?: TaskDefinition, extra: Record<string, unknown> = {}): void {
    const selection = task && ['output', 'message', 'completed', 'failed'].includes(type) ? [...result.events].reverse().find(event => event.taskId === task.id && event.type === 'selection') : undefined;
    const event: EngineEvent = { type, message: redactSecrets(message, options.redactProjectPath), time: (options.now ?? Date.now)(), ...(task ? { taskId: task.id } : {}),
        ...(selection ? { agent: selection.agent, agentName: selection.agentName } : {}), ...extra };
    result.events.push(event); if (result.events.length > 512) result.events.shift(); options.onEvent?.(event);
}
/** Validate combinations before a lease, file mutation, provider setup, or inference. @private */
export function validateRunOptions(options: RunOptions, fix = false): void {
    for (const [name, value] of Object.entries({ agent: options.agent, harness: options.harness, model: options.model, thinkingLevel: options.thinkingLevel })) {
        if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw new InputError(`${name} must be a nonempty string; an empty override cannot bypass a task requirement.`);
    }
    if (options.thinkingLevel !== undefined && !['low', 'medium', 'high', 'xhigh', 'max'].includes(options.thinkingLevel)) throw new InputError('thinkingLevel must be low, medium, high, xhigh or max.');
    for (const [name, value] of Object.entries({ limit: options.limit, minPriority: options.minPriority, maxPriority: options.maxPriority })) {
        if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) throw new InputError(`Invalid ${name}: expected a nonnegative integer.`);
    }
    if ((options.minPriority ?? 0) > (options.maxPriority ?? Infinity)) throw new InputError('Minimum priority exceeds maximum priority.');
    if (options.noAuto && options.noQuestions) throw new InputError('--no-auto cannot be combined with --no-questions.');
    if (options.noCommit && !options.noAuto && (options.gitChanges ?? 'fail') !== 'ignore' && !options.dryRun) throw new InputError('Automatic --no-commit requires --git-changes ignore.');
    if (options.autoPull && options.noCommit && !options.dryRun) throw new InputError('--auto-pull cannot be used with --no-commit.');
    if (options.isolate && (options.noCommit || options.gitChanges === 'continue')) throw new InputError('--isolate requires commits and cannot resume with --git-changes continue.');
    if (options.gitChanges === 'continue' && (fix || options.checkBefore === 'yes-and-fix')) throw new InputError('--git-changes continue cannot be used for fix or --check-before yes-and-fix.');
    for (const [name, value] of Object.entries({ waitBetweenPrompts: options.waitBetweenPrompts, waitAfterPrompt: options.waitAfterPrompt, waitAfterError: options.waitAfterError })) {
        if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new InputError(`${name} must be a nonnegative duration.`);
    }
}
/** Wait in small cancellation/pause aware intervals; idle waiting never calls a provider. @private */
async function wait(milliseconds: number, options: RunOptions): Promise<void> {
    let remaining = milliseconds;
    if (milliseconds > 0) options.onWait?.(true);
    try {
        while (remaining > 0 || options.isPaused?.()) {
            if (options.signal?.aborted) throw new Error('Execution cancelled.');
            if (options.shouldStop?.() || options.skipWait?.()) return;
            const slice = Math.min(remaining || 100, 100);
            await (options.sleep ? options.sleep(slice, options.signal) : delay(slice, undefined, { signal: options.signal }));
            if (!options.isPaused?.()) remaining -= slice;
        }
    } finally { if (milliseconds > 0) options.onWait?.(false); }
}
/** Require a real enclosing Git checkout before any mutation or provider invocation. @private */
async function ensureGit(workspace: Workspace): Promise<void> {
    workspace.projectPath = await fs.realpath(workspace.projectPath);
    workspace.gitRoot = await discoverGit(workspace.projectPath);
    workspace.tasksPath = await confinePath(workspace.projectPath, workspace.tasksPath);
    workspace.legacyPath = await confinePath(workspace.projectPath, workspace.legacyPath);
    workspace.statePath = await confinePath(workspace.projectPath, workspace.statePath);
    if (!workspace.gitRoot) throw new Error(`No Git checkout at ${workspace.projectPath}. Run ptbk init first.`);
}
/** Guard the existing staged and unstaged baseline according to the chosen dirty policy. @private */
async function initialBoundary(workspace: Workspace, options: RunOptions): Promise<GitSnapshot> {
    const baseline = await captureSnapshot(workspace.gitRoot!);
    if ((options.gitChanges ?? 'fail') === 'fail' && baseline.dirtyPaths.length) throw new Error(`Uncommitted changes in ${baseline.dirtyPaths.join(', ')}. Commit your work or explicitly select --git-changes ignore.`);
    return baseline;
}
/** Announce actual attribution once before an inference can produce committable work. @private */
async function announceIdentity(workspace: Workspace, options: RunOptions, result: RunResult): Promise<void> {
    if (options.noCommit || options.identity) return;
    options.identity = await commitIdentity(workspace.gitRoot!);
    emit(result, options, 'git-identity', `Git identity: ${options.identity.name} <${options.identity.email}>; ${options.identity.source === 'agent' ? 'complete agent configuration' : 'user Git configuration fallback'}; signing ${options.identity.signing ? 'enabled' : 'disabled'}.`);
}
/** Validate a task still has the exact source revision selected before its claim. @private */
async function assertSource(task: TaskDefinition): Promise<void> {
    if (task.source.sectionIndex < 0) return;
    const text = await fs.readFile(task.source.path);
    if (createHash('sha256').update(text).digest('hex') !== task.source.revision) throw new Error(`Source changed concurrently for ${task.id}; no completion was published.`);
}
/** Resolve task-local selection before implicit Developer and freeze its Book for this occurrence. @private */
async function invocation(workspace: Workspace, task: TaskDefinition, options: RunOptions): Promise<{ harness: string; model?: string; agentPath: string; agentName: string; instructions: string; context: string; missingContext?: boolean }> {
    const harness = options.harness ?? task.harness;
    if (!harness) throw new Error(`Task ${task.id} has no selected harness. Use --harness or a configured task HARNESS.`);
    const agentPath = await resolveAgent(workspace, options.agent ?? task.agent ?? path.join('agents', 'developer.book'));
    const agent = await prepareAgent(agentPath, workspace.projectPath);
    const defaults = options.harnessSettings?.[harness];
    let context = options.context; let missingContext = false;
    if (context === undefined) {
        try { context = await fs.readFile(path.join(workspace.projectPath, 'AGENTS.md'), 'utf8'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; context = ''; missingContext = true; }
    }
    return { harness, model: options.model ?? task.model ?? defaults?.model ?? agent.model, agentPath, agentName: agent.name, instructions: agent.instructions, context, missingContext };
}
/** Resolve an explicit local path or an exact named local role without silent fallback. @private */
async function resolveAgent(workspace: Workspace, reference: string): Promise<string> {
    return (await resolveAgentSelection(workspace, reference)).path;
}
/** Routing includes the selected role's local aliases without compiling remote inheritance. @private */
async function selectionContext(workspace: Workspace, task: TaskDefinition, options: RunOptions): Promise<EligibilityContext> {
    const reference = options.agent ?? task.agent ?? path.join('agents', 'developer.book');
    const selection = await resolveAgentSelection(workspace, reference);
    const harness = options.harness ?? task.harness;
    const defaults = harness ? options.harnessSettings?.[harness] : undefined;
    return { now: (options.now ?? Date.now)(), timezone: workspace.timezone, harness: options.harness, model: options.model ?? task.model ?? defaults?.model ?? selection.model, agent: selection.path, agentAliases: selection.aliases, thinkingLevel: options.thinkingLevel ?? task.thinkingLevel ?? defaults?.thinkingLevel, minPriority: options.minPriority, maxPriority: options.maxPriority };
}
/** Share role/path readiness explanations between finite preview and execution without mutation. @private */
export async function taskEligibility(workspace: Workspace, task: TaskDefinition, options: RunOptions, ledger: Ledger): Promise<EligibilityResult> {
    const initial = evaluateEligibility(task, { now: (options.now ?? Date.now)(), timezone: workspace.timezone, harness: options.harness, model: options.model, thinkingLevel: options.thinkingLevel, agent: options.agent ?? task.agent, minPriority: options.minPriority, maxPriority: options.maxPriority }, ledger.tasks[task.id]);
    if (!['ready', 'filtered'].includes(initial.kind) || task.priority < (options.minPriority ?? 0) || task.priority > (options.maxPriority ?? Infinity)) return initial;
    try { return evaluateEligibility(task, await selectionContext(workspace, task, options), ledger.tasks[task.id]); }
    catch (error) { return { kind: 'blocked', reason: `Required agent is unavailable: ${(error as Error).message}` }; }
}
/** Explicitly forbid the provider from taking ownership of status or Git persistence. @private */
function promptFor(task: TaskDefinition, instructions: string, feedback?: string): string {
    return `You are implementing task ${task.id}: ${task.title}.\nDo not commit, push, change task status, or edit .ptbk operational state. The host owns Git persistence and completion. Preserve pre-existing user changes.\n\nAGENT INSTRUCTIONS\n${instructions}\n\nTASK RULES\n${task.rules.join('\n')}\n\nTASK\n${task.payload}\n\nVerify the requested outcome against the task and provide concrete evidence. Finish with PTBK_ACCEPTANCE {\"satisfied\":true,\"evidence\":\"what you verified\"} only when the requested outcome is satisfied. Use satisfied:false with the blocking reason when it is not.${feedback ? `\n\nCHECK FEEDBACK\n${feedback}\nRepair the implementation without removing assertions, reducing thresholds, disabling checks, or omitting builds merely to make validation pass.` : ''}`;
}
/** Claim one coalesced occurrence atomically within the acquired writer lease. @private */
async function claim(workspace: Workspace, task: TaskDefinition, ledger: Ledger, baseline: GitSnapshot, protectedPaths: string[], dueSlot: number, options: RunOptions): Promise<RunJournal> {
    await options.assertOwned?.();
    const now = (options.now ?? Date.now)(); const id = randomUUID();
    const occurrenceId = createHash('sha256').update(`${task.id}\0${task.scheduleRevision}\0${dueSlot}`).digest('hex').slice(0, 24);
    const old = ledger.tasks[task.id];
    const entry = old?.scheduleRevision === task.scheduleRevision ? old : { scheduleRevision: task.scheduleRevision, anchor: task.after ?? now, history: old?.history ?? [] };
    entry.timezone ??= task.scheduleTimezone ?? workspace.timezone; entry.afterRaw = task.afterRaw;
    entry.anchor ??= task.after ?? now;
    entry.claim = { id: occurrenceId, runId: id, slot: dueSlot, startedAt: now };
    const previous = entry.lastConsumedSlot ?? entry.anchor;
    const coalesced = task.repeat ? Math.max(0, Math.floor((dueSlot - previous) / task.repeat) - (entry.lastConsumedSlot === undefined ? 0 : 1)) : 0;
    entry.history.push({ id: occurrenceId, slot: dueSlot, startedAt: now, outcome: 'claimed', attempts: 0, commits: [], coalesced });
    if (entry.history.length > 100) entry.history.splice(0, entry.history.length - 100);
    ledger.tasks[task.id] = entry;
    const journal: RunJournal = { version: 1, engineVersion: await installedEngineVersion(), harnessVersion: options.harnessVersion, id, taskId: task.id, occurrenceId, task, phase: 'claimed', startedAt: now, updatedAt: now, dueSlot, baseline, protectedPaths, commits: [], attempts: 0, identity: options.identity,
        sourceSnapshot: { revision: task.source.revision, payloadHash: createHash('sha256').update(task.payload).digest('hex'), gitHead: baseline.head },
    };
    await writeJournal(workspace, journal); await saveLedger(workspace, ledger);
    return journal;
}
/** Store an execution boundary together with the actual last expected content. @private */
async function boundary(workspace: Workspace, journal: RunJournal, phase: RunJournal['phase'], options: RunOptions): Promise<void> {
    journal.phase = phase;
    if (phase === 'running') delete journal.safePhase;
    if (['implementation-ready', 'completion-ready', 'integrating'].includes(phase)) journal.safePhase = phase as RunJournal['safePhase'];
    journal.updatedAt = (options.now ?? Date.now)(); await writeJournal(workspace, journal);
}
/** Persist one accepted task result using its original assignment and private Git index. @private */
async function persistResult(workspace: Workspace, journal: RunJournal, options: RunOptions, result: RunResult): Promise<void> {
    const baseline = journal.baseline; const phase = 'result';
    await options.assertOwned?.();
    const current = await captureSnapshot(workspace.gitRoot!);
    const overlap = (await changedPaths(baseline, current)).filter((name) => journal.protectedPaths.includes(name));
    if (overlap.length) throw new Error(`Result overlaps existing user work in ${overlap.join(', ')}; original bytes and index remain in the recovery journal.`);
    journal.expected = current; journal.pendingPhase = phase; await writeJournal(workspace, journal);
    if (options.noCommit) {
        delete journal.pendingPhase; await writeJournal(workspace, journal);
        emit(result, options, 'uncommitted', 'Retained accepted result and completion without an automatic commit.', journal.task); return;
    }
    if (options.noAuto && (!options.confirm || !await options.confirm('commit', `Commit accepted result for ${journal.task.title}?`))) throw new Error('Commit confirmation was declined; accepted work is retained for recovery.');
    const description = [journal.task.payload.trim(), ...(journal.task.rules.length ? ['Task-local rules:', ...journal.task.rules] : [])].filter(Boolean).join('\n\n');
    const message = `${journal.task.title}\n\n${description}\n\nPtbk-Journal: ${journal.id}\nPtbk-Phase: ${phase}`;
    const commit = await commitScoped(baseline, message, { protectedPaths: journal.protectedPaths, expected: current, signal: options.signal });
    if (commit) { journal.commits.push(commit); result.commits.push(commit); emit(result, options, 'commit', `Saved accepted task result as ${commit}.`, journal.task, { commit }); }
    await options.assertOwned?.();
    journal.expected = await captureSnapshot(workspace.gitRoot!); delete journal.pendingPhase; delete journal.completionRollback;
    await writeJournal(workspace, journal);
}
/** Run one inference plus only safe technical retries; failures never masquerade as completion. @private */
async function infer(workspace: Workspace, journal: RunJournal, options: RunOptions, result: RunResult, feedback?: string): Promise<HarnessResult> {
    const selection = await invocation(workspace, journal.task, options);
    const defaults = options.harnessSettings?.[selection.harness];
    const thinkingLevel = options.thinkingLevel ?? journal.task.thinkingLevel ?? defaults?.thinkingLevel;
    const harnessConfiguration = options.harnessConfiguration ?? (defaults ? { apiKeyEnv: defaults.apiKeyEnv, configurationPath: defaults.configurationPath } : undefined);
    const offeredTools = [...(options.tools ?? []), ...(options.toolsForHarness?.(selection.harness, journal.taskId, journal.occurrenceId) ?? [])];
    const tools = offeredTools.length ? offeredTools : options.tools;
    if (selection.missingContext && !options.contextNoticeShown) { options.contextNoticeShown = true; emit(result, options, 'context-missing', 'Implicit AGENTS.md context is absent; proceeding with the effective agent Book and task instructions.', journal.task); }
    journal.harness = selection.harness; journal.model = selection.model;
    const instructionsHash = createHash('sha256').update(selection.instructions).digest('hex');
    if (journal.agentInstructionsHash && journal.agentInstructionsHash !== instructionsHash) throw new Error('Agent instructions changed during the active task; inspect the source before retrying.');
    journal.agent = selection.agentPath; journal.agentInstructionsHash = instructionsHash;
    emit(result, options, 'selection', `Agent ${selection.agentName}; harness ${selection.harness}; model ${selection.model ?? 'provider native (unknown)'}; thinking ${thinkingLevel ?? 'adapter default (unknown)'}.`, journal.task, { agent: selection.agentPath, agentName: selection.agentName, harness: selection.harness, model: selection.model, thinkingLevel: thinkingLevel });
    const learningSource = (await readJournals(workspace, previous => previous.followupPath?.replace(/\\/g, '/') === journal.task.source.relativePath && Boolean(previous.learningTarget)))[0];
    if (learningSource?.learningTarget) {
        const target = await prepareAgent(path.join(workspace.projectPath, learningSource.learningTarget), workspace.projectPath);
        if (!target.learning.open) {
            journal.acceptance = { satisfied: true, evidence: 'The teaching target is currently CLOSED; its Book was preserved without a provider call.' };
            journal.output = journal.acceptance.evidence; journal.attempts = 0;
            emit(result, options, 'learning-skipped', journal.acceptance.evidence, journal.task);
            await writeJournal(workspace, journal);
            return { outcome: 'success', exitCode: 0, output: journal.output, acceptance: journal.acceptance };
        }
    }
    const runner = options.runHarness ?? runHarness;
    await assertSource(journal.task);
    const before = await captureSnapshot(workspace.gitRoot!); journal.expected = before;
    await boundary(workspace, journal, 'running', options);
    const operation = await runPrivateOperation(workspace, async privateWorkspace => {
        let resumeQuota = false;
        for (let retry = 0; retry <= 3; retry++) {
            if (options.signal?.aborted || options.shouldStop?.()) return { outcome: 'cancelled', exitCode: 130, output: 'Cancelled before inference.' } as HarnessResult;
            const record: AttemptRecord = { attempt: journal.attempts, retry, startedAt: (options.now ?? Date.now)(), harness: selection.harness, model: selection.model, agent: selection.agentPath,
                thinkingLevel: thinkingLevel, ...(resumeQuota ? { sessionId: journal.sessionId } : {}),
            };
            journal.attemptHistory ??= []; journal.attemptHistory.push(record);
            if (journal.attemptHistory.length > 100) { const excess = journal.attemptHistory.length - 100; journal.attemptHistory.splice(0, excess); journal.truncatedAttempts = (journal.truncatedAttempts ?? 0) + excess; }
            await writeJournal(workspace, journal);
            emit(result, options, 'attempt', `Implementation attempt ${journal.attempts}, technical retry ${retry}${resumeQuota ? ', same Claude session' : ''}.`, journal.task, { attempt: journal.attempts, retry });
            const privateBefore = await captureSnapshot(privateWorkspace.gitRoot!, true);
            let pendingOutput = '';
            /** Buffer incomplete lines so a secret split across provider chunks cannot leak. */
            const stream = (chunk: string) => {
                pendingOutput = (pendingOutput + chunk).slice(-2 * 1024 * 1024);
                const end = pendingOutput.lastIndexOf('\n');
                if (end >= 0) { const text = redactSecrets(pendingOutput.slice(0, end + 1), options.redactProjectPath); pendingOutput = pendingOutput.slice(end + 1); options.onOutput?.(text); emit(result, options, 'output', text, journal.task, { agent: selection.agentPath, agentName: selection.agentName }); }
            };
            const response = await runner({ harness: selection.harness, harnessConfiguration, projectPath: privateWorkspace.projectPath, redactionPath: options.redactProjectPath, taskId: journal.taskId, occurrenceId: journal.occurrenceId, requestProjectPath: options.requestProjectPath ?? path.dirname(workspace.statePath), tools, prompt: `${resumeQuota ? 'Continue the same task after its confirmed usage-limit interruption. Preserve existing progress and do not repeat completed external actions.\n\n' : ''}${promptFor(journal.task, selection.instructions, feedback)}`, agentPath: /^(https:|ptbk:)/.test(selection.agentPath) ? selection.agentPath : path.join(privateWorkspace.gitRoot!, path.relative(workspace.gitRoot!, selection.agentPath)), context: selection.context, model: selection.model, thinkingLevel: thinkingLevel, allowCredits: options.allowCredits, signal: options.signal, sessionId: resumeQuota ? journal.sessionId : undefined, onOutput: stream });
            Object.assign(record, { finishedAt: (options.now ?? Date.now)(), outcome: response.outcome, exitCode: response.exitCode,
                ...(response.sessionId ? { sessionId: response.sessionId } : {}), ...(response.usage ? { usage: response.usage } : {}),
                authentication: response.authentication ?? 'unknown', harnessVersion: response.harnessVersion ?? options.harnessVersion, ...(response.effectiveModel ? { effectiveModel: response.effectiveModel } : {}),
                ...(response.outcome !== 'success' ? { reason: redactSecrets(`${response.outcome}: ${response.output}`, options.redactProjectPath).slice(0, 2048) } : {}),
            });
            if (pendingOutput) { const text = redactSecrets(pendingOutput, options.redactProjectPath); options.onOutput?.(text); emit(result, options, 'output', text, journal.task, { agent: selection.agentPath, agentName: selection.agentName }); }
            journal.externalEffects ||= response.externalEffects;
            journal.thinkingLevel = thinkingLevel;
            journal.authentication = response.authentication ?? 'unknown'; journal.effectiveModel = response.effectiveModel; journal.harnessVersion = response.harnessVersion ?? options.harnessVersion;
            journal.sessionId = response.sessionId ?? journal.sessionId;
            if (response.usage) { journal.usage ??= {}; for (const [key, value] of Object.entries(response.usage)) journal.usage[key] = (journal.usage[key] ?? 0) + value; }
            if (response.usage) emit(result, options, 'usage', 'Observed provider usage.', journal.task, { usage: response.usage, totalUsage: journal.usage, effectiveModel: response.effectiveModel });
            journal.output = retainedOutput(redactSecrets(`${journal.output ?? ''}\n${response.output}`, options.redactProjectPath));
            await writeJournal(workspace, journal);
            await assertSnapshot(before);
            const privateAfter = await captureSnapshot(privateWorkspace.gitRoot!, true);
            if (privateBefore.head !== privateAfter.head || privateBefore.index !== privateAfter.index || privateBefore.indexFlags !== privateAfter.indexFlags) throw new Error('Harness changed private Git HEAD or index; its checkout was retained for review.');
            if (response.outcome === 'success' && response.exitCode === 0 && !response.signal) {
                const acceptance = options.verifyOutcome ? await options.verifyOutcome(journal.task, response, privateWorkspace) : response.acceptance;
                if (acceptance) journal.acceptance = { satisfied: acceptance.satisfied, evidence: redactSecrets(acceptance.evidence, options.redactProjectPath) };
                if (acceptance?.satisfied === false) { await writeJournal(workspace, journal); return { ...response, acceptance }; }
                if (options.requireAcceptance && !acceptance) return { ...response, outcome: 'process-failure', output: `${response.output}\nMissing requested-outcome evidence. Report PTBK_ACCEPTANCE with concrete verification before completion.` } as HarnessResult;
                await writeJournal(workspace, journal); return acceptance ? { ...response, acceptance } : response;
            }
            if (response.outcome === 'success') return { ...response, outcome: 'process-failure' } as HarnessResult;
            const quotaResume = response.outcome === 'quota' && selection.harness === 'claude-code' && Boolean(response.sessionId);
            const safeTransient = response.outcome === 'transient' && !journal.externalEffects && !(await changedPaths(privateBefore, privateAfter)).length;
            if (retry === 3 || (journal.technicalRetries ?? 0) >= 3 || !quotaResume && !safeTransient) return response;
            journal.technicalRetries = (journal.technicalRetries ?? 0) + 1;
            resumeQuota = quotaResume;
            record.retryReason = quotaResume ? `Claude usage limit confirmed; resume the same session (${retry + 1}/3).` : `Transient provider failure with unchanged private content; retry the same occurrence (${retry + 1}/3).`;
            emit(result, options, quotaResume ? 'quota-wait' : 'retry', record.retryReason, journal.task);
            const cooldown = quotaResume && response.quotaResetAt !== undefined ? Math.max(0, response.quotaResetAt - (options.now ?? Date.now)()) : options.waitAfterError ?? 600_000;
            record.cooldownMs = cooldown; await writeJournal(workspace, journal);
            await wait(cooldown, options);
        }
        throw new Error('Technical retry budget exhausted.');
    }, { signal: options.signal, protectedPaths: [...journal.protectedPaths, ...(journal.task.source.sectionIndex >= 0 ? [path.relative(workspace.gitRoot!, journal.task.source.path).split(path.sep).join('/')] : [])], preserveView: options.preserveLogs, assertOwned: options.assertOwned });
    await assertSource(journal.task); journal.expected = await captureSnapshot(workspace.gitRoot!);
    return operation.result;
}
/** Record actual checks while retaining formatter transformations in the task's single result. @private */
async function checkPhase(workspace: Workspace, journal: RunJournal, command: string, options: RunOptions, result: RunResult): Promise<CheckResult> {
    journal.checkCommand = command;
    for (let pass = 0; pass < 3; pass++) {
        await options.assertOwned?.();
        await boundary(workspace, journal, 'checking', options);
        emit(result, options, 'check', `Running check: ${command}${pass ? ' (verify formatter result)' : ''}`, journal.task);
        const check = await runCheck(workspace, command, { signal: options.signal, protectedPaths: journal.protectedPaths, preserveView: options.preserveLogs, onOutput: options.onOutput, assertOwned: options.assertOwned });
        journal.checks = check.outcome;
        journal.output = retainedOutput(redactSecrets(`${journal.output ?? ''}\nCheck (${check.outcome}):\n${check.output}`, options.redactProjectPath));
        journal.expected = await captureSnapshot(workspace.gitRoot!);
        await boundary(workspace, journal, 'implementation-ready', options);
        emit(result, options, 'check-result', `Checks ${check.outcome} (exit ${check.exitCode}).`, journal.task, { outcome: check.outcome });
        if (check.outcome !== 'passed' || !check.changedPaths.length) return check;
        if (pass === 2) throw new Error('Checks keep changing their own result after three validation passes; inspect the formatter before accepting this task.');
    }
    throw new Error('Check stabilization budget exhausted.');
}
/** Save bounded redacted execution evidence in ignored project-local runtime storage. @private */
async function trace(workspace: Workspace, journal: RunJournal, outcome: string, options: RunOptions, _result: RunResult): Promise<string> {
    const safeId = journal.taskId.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100);
    const directory = await confinePath(workspace.statePath, path.join(workspace.statePath, 'traces', safeId));
    await fs.mkdir(directory, { recursive: true });
    const filename = await confinePath(workspace.statePath, path.join(directory, `${journal.occurrenceId}.md`));
    const body = `# ${journal.task.title}\n\nTask: ${journal.taskId}\nOccurrence: ${journal.occurrenceId}\nRun/journal: ${journal.id}\nEngine version: ${journal.engineVersion ?? 'unknown (older recovery journal)'}\nHarness version: ${journal.harnessVersion ?? 'unknown (not reported)'}\nRuntime journal: .ptbk/journals/${journal.id}.json\nRecord: finalization boundary; runtime journal contains authoritative final result and commit IDs\nCommit provenance: Ptbk-Journal: ${journal.id}\nSource: ${journal.task.source.relativePath}\nPayload SHA-256: ${journal.sourceSnapshot?.payloadHash ?? createHash('sha256').update(journal.task.payload).digest('hex')}\nSource snapshot SHA-256: ${journal.sourceSnapshot?.revision ?? 'not recorded'}\nOutcome: ${outcome}\nAgent: ${journal.agent ?? 'not invoked'}\nHarness: ${journal.harness ?? 'not invoked'}\nModel: ${journal.effectiveModel ?? journal.model ?? 'unknown (provider did not report)'}\nThinking: ${journal.thinkingLevel ?? 'unknown (adapter default)'}\nAuthentication: ${journal.authentication ?? 'unknown'}\nUsage: ${journal.usage ? JSON.stringify(journal.usage) : 'unknown'}\nCheck command: ${journal.checkCommand ?? 'not configured'}\nChecks: ${journal.checks ?? 'skipped'}\nOutcome evidence: ${journal.acceptance?.evidence ?? 'not reported'}\nStarted: ${new Date(journal.startedAt).toISOString()}\nUpdated: ${new Date((options.now ?? Date.now)()).toISOString()}\n\n## Exposed provider attempts\n\n${journal.truncatedAttempts ? `[ptbk] ${journal.truncatedAttempts} earlier attempt records were truncated; the latest 100 remain.\n\n` : ''}${JSON.stringify(journal.attemptHistory ?? [], null, 2)}\n\n${journal.output ?? ''}\n`;
    await fs.writeFile(filename, retainedOutput(redactSecrets(body, options.redactProjectPath ?? workspace.projectPath)), { mode: 0o600 });
    journal.trace = path.relative(path.dirname(workspace.statePath), filename).split(path.sep).join('/'); await writeJournal(workspace, journal); return filename;
}
/** Materialize one deduplicated Teacher task while honoring the agent's current local learning policy. @private */
async function learningFollowup(workspace: Workspace, journal: RunJournal): Promise<string | undefined> {
    if (!journal.agent || /^(ptbk:|https:)/.test(journal.agent)) return;
    const agent = await prepareAgent(journal.agent, workspace.projectPath);
    journal.learning = agent.learning;
    if (!agent.learning.open) return;
    const teacherPath = await resolveAgent(workspace, 'Teacher');
    const teacher = await prepareAgent(teacherPath, workspace.projectPath);
    if (teacher.learning.open) throw new Error('Teacher must be CLOSED before a learning follow-up can be accepted.');
    const directory = await confinePath(workspace.projectPath, workspace.tasksPath);
    await fs.mkdir(directory, { recursive: true });
    const filename = await confinePath(workspace.projectPath, path.join(directory, `teach-${journal.occurrenceId}.book`));
    const target = path.relative(workspace.projectPath, journal.agent).split(path.sep).join('/');
    journal.learningTarget = target;
    const text = `TASK Learn from ${journal.task.title}\n\nTASK ID teach-${journal.occurrenceId}\nTASK AGENT @Teacher\nTASK ORIGIN engine:learning:${journal.taskId}\n${journal.harness ? `TASK HARNESS ${journal.harness}\n` : ''}${journal.model ? `TASK MODEL ${journal.model}\n` : ''}${journal.thinkingLevel ? `TASK THINKING LEVEL ${journal.thinkingLevel}\n` : ''}TASK PARENT #${journal.taskId}\nTASK DEPENDS ON #${journal.taskId}\nTASK PRIORITY ${journal.task.priority}\n\nReview the completed occurrence ${journal.occurrenceId} of task ${journal.taskId} and improve the maintained agent at ${target} only within its current OPEN limits.\nRecheck its own final OPEN/CLOSED policy before any update; CLOSED forbids all teaching changes. Preserve inherited instruction origins, limits, tool permissions and project safeguards.\nAvailable evidence: ${journal.trace ?? `.ptbk/journals/${journal.id}.json`}. Read the runtime journal for actual output, checks, attempts, usage and commits. Do not invent unavailable private reasoning. If evidence is insufficient, record that finding.\n${agent.learning.limits ? `Learning limits: ${agent.learning.limits}\n` : ''}`;
    try { await fs.writeFile(filename, text, { flag: 'wx' }); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || await fs.readFile(filename, 'utf8') !== text) throw new Error(`Learning follow-up conflicts with existing content at ${filename}; both records were preserved.`);
    }
    journal.followupPath = path.relative(workspace.projectPath, filename).split(path.sep).join('/'); return filename;
}
/** A failed final candidate check may still use the same active task's remaining repair budget. */
class FinalResultCheckError extends Error {
    constructor(readonly check: CheckResult) { super(`Final result checks ${check.outcome}: ${check.output}`); this.name = 'FinalResultCheckError'; }
}
/** Accept completion, follow-ups and checked content together in one recoverable result commit. @private */
async function complete(workspace: Workspace, journal: RunJournal, ledger: Ledger, options: RunOptions, result: RunResult): Promise<void> {
    await options.assertOwned?.(); await assertSource(journal.task);
    if (journal.acceptance?.satisfied === false) throw new Error(`Requested outcome is still unverified: ${journal.acceptance.evidence}. Review the unmet requirements before deliberate retry.`);
    if (options.requireAcceptance && !journal.acceptance && journal.attempts > 0) throw new Error('Requested-outcome evidence is missing; accepted work cannot be stamped complete.');
    const beforeMetadata = await captureSnapshot(workspace.gitRoot!); const previousTask = journal.task;
    journal.metadataPaths = [];
    try {
        if (journal.task.source.sectionIndex >= 0) {
            journal.metadataPaths.push(path.relative(workspace.gitRoot!, journal.task.source.path).split(path.sep).join('/'));
            journal.task = await recordTaskCompletion(journal.task, (options.now ?? Date.now)(), { ...options.sourceWriteOptions, assertOwned: options.assertOwned });
        } else {
            const directory = await confinePath(workspace.projectPath, workspace.tasksPath);
            await fs.mkdir(directory, { recursive: true });
            const filename = await confinePath(workspace.projectPath, path.join(directory, `${journal.taskId}.book`));
            await fs.writeFile(filename, `TASK ${journal.task.title}\n\nTASK ID ${journal.taskId}\nTASK DONE ${new Date((options.now ?? Date.now)()).toISOString()}\n\n${journal.task.payload}\n`, { flag: 'wx' });
            journal.metadataPaths.push(path.relative(workspace.gitRoot!, filename).split(path.sep).join('/'));
        }
        journal.expected = await captureSnapshot(workspace.gitRoot!);
        await trace(workspace, journal, 'accepted result awaiting Git persistence', options, result);
        const followup = await learningFollowup(workspace, journal);
        if (followup) journal.metadataPaths.push(path.relative(workspace.gitRoot!, followup).split(path.sep).join('/'));
        journal.expected = await captureSnapshot(workspace.gitRoot!);
        if (options.check) {
            const finalCheck = await checkPhase(workspace, journal, options.check, options, result);
            if (finalCheck.outcome !== 'passed') throw new FinalResultCheckError(finalCheck);
        }
        journal.expected = await captureSnapshot(workspace.gitRoot!);
        await boundary(workspace, journal, 'completion-ready', options);
        await persistResult(workspace, journal, options, result);
    } catch (error) {
        const candidate = journal.expected;
        // A rejected commit must leave the source visibly unfinished. Keep exact candidate bytes for safe recovery.
        if (candidate) {
            for (const name of journal.metadataPaths ?? []) {
                const live = await readFileSnapshot(workspace.gitRoot!, name);
                if (sameFile(live, candidate.files[name]) && !sameFile(live, beforeMetadata.files[name])) {
                    await options.assertOwned?.();
                    await writeFileSnapshot(workspace.gitRoot!, name, beforeMetadata.files[name]);
                }
            }
            journal.completionRollback = await captureSnapshot(workspace.gitRoot!);
        }
        journal.task = previousTask;
        if (!journal.pendingPhase) { journal.expected = journal.completionRollback ?? beforeMetadata; delete journal.completionRollback; }
        throw error;
    }
    if (journal.isolation) {
        await boundary(workspace, journal, 'integrating', options); return;
    }
    await recordCompletion(workspace, journal, ledger, options, result);
    if (options.autoPush) await synchronizeResult(workspace, journal, options, result);
}
/** Push an accepted local result without ever re-executing its model work. @private */
async function synchronizeResult(workspace: Workspace, journal: RunJournal, options: RunOptions, result: RunResult): Promise<void> {
    try { await git(workspace.gitRoot!, ['push'], { signal: options.signal }); delete journal.syncPending; await writeJournal(workspace, journal); emit(result, options, 'push', 'Remote synchronization succeeded.', journal.task); }
    catch (error) { journal.syncPending = true; result.syncPending = true; result.exitCode = 1; await writeJournal(workspace, journal); emit(result, options, 'sync-pending', `Local completion is preserved; push failed: ${(error as Error).message}`, journal.task); }
}
/** Finalize the ledger after proved persistence, including restart reconciliation. @private */
async function recordCompletion(workspace: Workspace, journal: RunJournal, ledger: Ledger, options: RunOptions, result: RunResult): Promise<void> {
    await options.assertOwned?.();
    const entry = ledger.tasks[journal.taskId];
    if (entry) {
        delete entry.claim; delete entry.blocked; entry.lastConsumedSlot = journal.dueSlot; entry.lastCompletedSlot = journal.dueSlot;
        if (journal.task.repeat) { entry.nextDue = journal.dueSlot + journal.task.repeat; result.nextWakeUp = Math.min(result.nextWakeUp ?? Infinity, entry.nextDue); }
        const history = entry.history.find((item) => item.id === journal.occurrenceId);
        if (history) Object.assign(history, { outcome: options.noCommit ? 'completed-uncommitted' : 'completed', finishedAt: (options.now ?? Date.now)(), attempts: journal.attempts, commits: [...journal.commits], trace: journal.trace });
        await saveLedger(workspace, ledger);
    }
    await boundary(workspace, journal, 'completed', options); result.completed++;
    emit(result, options, 'completed', options.noCommit ? 'Completed, uncommitted.' : 'Completed locally.', journal.task, { occurrenceId: journal.occurrenceId, usage: journal.usage, harness: journal.harness, model: journal.effectiveModel ?? journal.model, thinkingLevel: journal.thinkingLevel, agent: journal.agent });
}
/** Block an uncertain/failed occurrence so a new recurrence cannot silently clear failure. @private */
async function failOccurrence(workspace: Workspace, journal: RunJournal, ledger: Ledger, error: unknown, options: RunOptions, result: RunResult): Promise<void> {
    await options.assertOwned?.();
    const message = redactSecrets((error as Error).message ?? String(error), options.redactProjectPath);
    journal.error = message;
    if (error instanceof GitPersistenceError && error.commit && !journal.commits.includes(error.commit)) { journal.commits.push(error.commit); result.commits.push(error.commit); }
    journal.phase = 'recovery-required'; journal.updatedAt = (options.now ?? Date.now)();
    const entry = ledger.tasks[journal.taskId];
    if (entry) { entry.blocked = message; const history = entry.history.find((item) => item.id === journal.occurrenceId); if (history) Object.assign(history, { outcome: 'recovery-required', attempts: journal.attempts, commits: [...journal.commits] }); await saveLedger(workspace, ledger); }
    await trace(workspace, journal, 'recovery required', options, result).catch(failure => {
        const diagnostic = redactSecrets(`Task diagnostic storage unavailable: ${(failure as Error).message}. Original failure: ${message}. Available diagnostics: ${(error as Error).stack ?? String(error)}`, options.redactProjectPath);
        process.stderr.write(`${diagnostic}\n`);
        emit(result, options, 'diagnostic-unavailable', diagnostic, journal.task);
    });
    await writeJournal(workspace, journal);
    result.failed++; result.exitCode = options.signal?.aborted ? 130 : 1;
    emit(result, options, 'recovery-required', message, journal.task, { reason: message, occurrenceId: journal.occurrenceId });
    emit(result, options, 'error', `Task ${journal.taskId} requires recovery: ${message}. Work and ownership snapshots were preserved. Use ptbk recover ${JSON.stringify(journal.taskId)}.`, journal.task, { trace: journal.trace, nextAction: `Inspect ptbk recover ${JSON.stringify(journal.taskId)} before retrying the failed phase.` });
}
/** Execute and validate one claimed task with a central three-attempt repair budget. @private */
async function execute(workspace: Workspace, journal: RunJournal, ledger: Ledger, options: RunOptions, result: RunResult, initialFeedback?: string, resumeReady = false): Promise<void> {
    try {
        let feedback = initialFeedback;
        await options.assertOwned?.();
        await ensureCoreAgents(workspace.projectPath);
        for (let attempt = journal.attempts + (resumeReady ? 0 : 1); attempt <= 3; attempt++) {
            if (!resumeReady) {
                journal.attempts = attempt;
                const baseline = attempt === 1 ? journal.baseline : await captureSnapshot(workspace.gitRoot!);
                const response = await infer(workspace, journal, options, result, feedback);
                if (response.outcome !== 'success') throw new Error(`Harness ${response.outcome} (exit ${response.exitCode}): ${redactSecrets(response.output, options.redactProjectPath)}${response.outcome === 'authentication' ? ' Authenticate the selected provider before retrying.' : ''}`);
                if (response.acceptance?.satisfied === false) {
                    feedback = `Requested outcome remains incomplete: ${response.acceptance.evidence}\nPreserve completed work and external effects; repair only the unmet requirements.`;
                    journal.expected = await captureSnapshot(workspace.gitRoot!); await boundary(workspace, journal, 'implementation-ready', options);
                    if (attempt === 3) throw new Error(`Requested-outcome repair budget exhausted after three attempts. ${feedback}`);
                    emit(result, options, 'repair', `Requested outcome is incomplete; repair ${attempt + 1}/3 for the same occurrence.`, journal.task);
                    continue;
                }
                if (options.normalizeLineEndings !== false) {
                    await normalizeOwned(baseline, journal.protectedPaths);
                    if (journal.task.source.sectionIndex >= 0) {
                        const refreshed = (await discoverTasks(workspace)).find((task) => task.id === journal.taskId);
                        if (!refreshed) throw new Error('Task disappeared after owned line-ending normalization.');
                        journal.task = refreshed;
                    }
                }
                journal.expected = await captureSnapshot(workspace.gitRoot!);
                await boundary(workspace, journal, 'implementation-ready', options);
            }
            resumeReady = false;
            if (!options.check) { journal.checks = 'skipped'; emit(result, options, 'checks-skipped', 'Checks skipped; no validation command was selected.', journal.task); await complete(workspace, journal, ledger, options, result); return; }
            let check = await checkPhase(workspace, journal, options.check, options, result);
            if (check.outcome === 'passed') {
                try { await complete(workspace, journal, ledger, options, result); return; }
                catch (error) {
                    if (!(error instanceof FinalResultCheckError) || error.check.outcome !== 'failed') throw error;
                    check = error.check;
                }
            }
            if (check.outcome !== 'failed') throw new Error(`Checks ${check.outcome}: ${check.output}`);
            feedback = `Command: ${options.check}\nExit: ${check.exitCode}\n${check.output}`;
            if (attempt === 3) throw new Error(`Check-feedback budget exhausted after three implementation/repair attempts. ${feedback}`);
            emit(result, options, 'repair', `Checks failed; requesting repair ${attempt + 1}/3 for the same occurrence.`, journal.task);
        }
    } catch (error) { await failOccurrence(workspace, journal, ledger, error, options, result); }
}
/** Describe the current finite queue without creating any runtime file or calling a model. @private */
async function preview(workspace: Workspace, options: RunOptions, result: RunResult): Promise<RunResult> {
    const ledger = await readLedger(workspace);
    for (const task of (await discoverTasks(workspace)).filter(task => !options.onlyTaskId || task.id === options.onlyTaskId)) {
        const eligibility = await taskEligibility(workspace, task, options, ledger);
        emit(result, options, eligibility.kind, `${task.title}: ${eligibility.reason}`, task, { dueSlot: eligibility.dueSlot });
        if (eligibility.nextWakeUp !== undefined) result.nextWakeUp = Math.min(result.nextWakeUp ?? Infinity, eligibility.nextWakeUp);
        if (eligibility.kind !== 'ready') result.skipped++;
    }
    return result;
}
/** Run the finite eligible queue; each recurring definition is claimed at most once. @private */
export async function runQueue(workspace: Workspace, options: RunOptions = {}): Promise<RunResult> {
    options = { ...options, agent: options.agent ?? (options.onlyTaskId ? undefined : 'Developer'), redactProjectPath: workspace.projectPath };
    if ((options.checkBefore ?? 'no') !== 'no') options.check ??= 'npm run check';
    validateRunOptions(options); const result = report();
    if (options.dryRun) return preview(workspace, options, result);
    await ensureGit(workspace);
    options.redactProjectPath = workspace.projectPath;
    await loadProjectSecrets(workspace.projectPath);
    const lease = await acquireLease(workspace);
    options.assertOwned = () => lease.assertOwned();
    try {
        const seen = new Set<string>(); let lastStart: number | undefined; let configurationFrozen = false;
        const deferred = new Map<string, string>();
        const wakeUps = new Map<string, number>();
        /** Keep the reported next time tied to work that is still pending. */
        function refreshNextWakeUp(): void {
            result.nextWakeUp = undefined;
            for (const time of wakeUps.values()) result.nextWakeUp = Math.min(result.nextWakeUp ?? Infinity, time);
        }
        /** Remove a temporary skip once the task becomes eligible or leaves the queue. */
        function clearDeferral(taskId: string): void {
            if (deferred.delete(taskId)) result.skipped--;
            wakeUps.delete(taskId);
        }
        /** Report changed readiness once, without preventing later reevaluation. */
        function deferTask(task: TaskDefinition, eligibility: EligibilityResult): void {
            const signature = JSON.stringify([eligibility.kind, eligibility.reason, eligibility.nextWakeUp, task.source.revision]);
            if (!deferred.has(task.id)) result.skipped++;
            if (deferred.get(task.id) !== signature) emit(result, options, eligibility.kind, `${task.title}: ${eligibility.reason}`, task);
            deferred.set(task.id, signature);
            if (eligibility.nextWakeUp !== undefined) wakeUps.set(task.id, eligibility.nextWakeUp);
            else wakeUps.delete(task.id);
        }
        const initialTaskIds = new Set((await discoverTasks(workspace)).map(task => task.id));
        if (options.gitChanges === 'continue') {
            if (options.limit === 0) return result;
            const candidates = (await listRecovery(workspace)).filter(journal => !options.onlyTaskId || journal.taskId === options.onlyTaskId);
            // resumeOne validates the exact candidate count before mutating anything.
            lastStart = (options.now ?? Date.now)();
            await resumeOne(workspace, options, result, lease, options.onlyTaskId);
            if (result.failed || result.syncPending || options.signal?.aborted || options.shouldStop?.() || result.completed >= (options.limit ?? Infinity)) return result;
            seen.add(candidates[0]!.taskId);
            if (candidates[0]!.task.repeat) wakeUps.set(candidates[0]!.taskId, candidates[0]!.dueSlot + candidates[0]!.task.repeat);
            // Recovery establishes its own old boundary; subsequent work requires a clean checkout.
            options.gitChanges = 'fail';
            await wait(options.waitAfterPrompt ?? 0, options);
            if (options.shouldStop?.() || options.signal?.aborted) return result;
        }
        const recovery = await listRecovery(workspace);
        if (recovery.length) throw new Error(`${recovery.length} interrupted occurrence(s) require explicit recovery before new work. Use ptbk recover.`);
        const original = await initialBoundary(workspace, options);
        if (options.check) await validateCheck(workspace, options.check);
        if (options.autoPush && !await retryPendingSync(workspace, options, result)) return result;
        if (options.autoPull) { if (original.dirtyPaths.length) throw new Error('Auto-pull requires a clean checkout; no automatic stash is performed.'); await git(workspace.gitRoot!, ['pull', '--rebase'], { signal: options.signal }); }
        if ((options.checkBefore ?? 'no') !== 'no') {
            const queueCompletions = result.completed;
            const fixed = await fixOwned(workspace, { ...options, check: options.check ?? 'npm run check' }, result, original.dirtyPaths, lease, options.checkBefore === 'yes-and-fix');
            result.completed = queueCompletions;
            if (!fixed) return result;
        }
        while (!options.signal?.aborted && !options.shouldStop?.() && result.completed < (options.limit ?? Infinity)) {
            await options.onTaskBoundary?.(options);
            await wait(0, options);
            if (options.shouldStop?.() || options.signal?.aborted) break;
            await lease.assertOwned();
            const ledger = await readLedger(workspace); const tasks = await discoverTasks(workspace);
            const present = new Set(tasks.map(task => task.id));
            for (const taskId of deferred.keys()) if (!present.has(taskId)) clearDeferral(taskId);
            let selected: TaskDefinition | undefined; let dueSlot: number | undefined;
            for (const task of tasks) {
                if (!initialTaskIds.has(task.id) || options.onlyTaskId && task.id !== options.onlyTaskId) continue;
                if (seen.has(task.id)) continue;
                if (configurationFrozen && (task.model && !options.model || task.thinkingLevel && !options.thinkingLevel)) {
                    deferTask(task, { kind: 'filtered', reason: "explicit model or thinking requirement cannot be matched to this invocation's unreported native default." }); continue;
                }
                const eligibility = await taskEligibility(workspace, task, options, ledger);
                if (eligibility.kind === 'ready') {
                    if (!(options.harness ?? task.harness)) { deferTask(task, { kind: 'blocked', reason: 'no configured harness; use --harness.' }); continue; }
                    clearDeferral(task.id);
                    selected = task; dueSlot = eligibility.dueSlot; break;
                }
                deferTask(task, eligibility);
            }
            refreshNextWakeUp();
            if (!selected) break;
            const priorExternalResult = (await readJournals(workspace, journal => journal.taskId === selected!.id && journal.phase === 'completed' && Boolean(journal.externalEffects) && !journal.task.repeat && journal.sourceSnapshot?.payloadHash === createHash('sha256').update(selected!.payload).digest('hex')))[0];
            if (priorExternalResult) {
                result.failed++; result.exitCode = 1;
                emit(result, options, 'recovery-required', 'This assignment has recorded external effects and its completion stamp disappeared. Inspect those effects before deliberately retrying; no external action was repeated.', selected, { occurrenceId: priorExternalResult.occurrenceId });
                break;
            }
            seen.add(selected.id);
            const sourcePath = path.relative(workspace.gitRoot!, selected.source.path).split(path.sep).join('/');
            if (original.dirtyPaths.includes(sourcePath)) { result.skipped++; emit(result, options, 'blocked', `Task source ${sourcePath} contains pre-existing user changes. Commit the source before ptbk records its completion.`, selected); continue; }
            if (options.noAuto && (!options.confirm || !await options.confirm('task', `Execute ${selected.title}?`))) { result.skipped++; continue; }
            if (lastStart !== undefined) await wait(Math.max(0, (options.waitBetweenPrompts ?? 0) - ((options.now ?? Date.now)() - lastStart)), options);
            if (options.shouldStop?.() || options.signal?.aborted) break;
            lastStart = (options.now ?? Date.now)();
            options.harness ??= selected.harness; options.model ??= selected.model; options.thinkingLevel ??= selected.thinkingLevel;
            const defaults = options.harness ? options.harnessSettings?.[options.harness] : undefined;
            options.model ??= defaults?.model; options.thinkingLevel ??= defaults?.thinkingLevel;
            options.harnessConfiguration ??= defaults ? { apiKeyEnv: defaults.apiKeyEnv, configurationPath: defaults.configurationPath } : undefined;
            await announceIdentity(workspace, options, result);
            await assertSource(selected);
            const baseline = await captureSnapshot(workspace.gitRoot!);
            if (!options.isolate) selected = await assignTaskId(selected, { ...options.sourceWriteOptions, assertOwned: options.assertOwned });
            const journal = await claim(workspace, selected, ledger, baseline, original.dirtyPaths, dueSlot ?? lastStart, options);
            emit(result, options, 'claimed', `Claimed ${selected.title}.`, selected, { occurrenceId: journal.occurrenceId });
            const completedBeforeTask = result.completed;
            if (options.isolate) await executeIsolated(workspace, journal, ledger, options, result);
            else await execute(workspace, journal, ledger, options, result);
            if (result.completed > completedBeforeTask && selected.repeat) wakeUps.set(selected.id, journal.dueSlot + selected.repeat);
            refreshNextWakeUp();
            configurationFrozen = true; options.harness ??= journal.harness; options.model ??= journal.model ?? journal.effectiveModel; options.thinkingLevel ??= journal.thinkingLevel;
            if (result.failed || result.syncPending || result.completed >= (options.limit ?? Infinity)) break;
            await options.onTaskBoundary?.(options);
            await wait(options.waitAfterPrompt ?? 0, options);
            if (options.autoPull && !options.shouldStop?.()) await git(workspace.gitRoot!, ['pull', '--rebase'], { signal: options.signal });
        }
        if (options.signal?.aborted) result.exitCode = 130;
        if (options.noCommit) result.retainedPaths = await changedPaths(original);
        emit(result, options, 'queue-finished', result.nextWakeUp ? `Finite run finished; next scheduled work is due ${new Date(result.nextWakeUp).toISOString()}.` : 'Finite queue finished.');
        return result;
    } finally { await lease.release(); }
}
/** A synthetic repair stays outside the normal backlog and uses the same execution phases. @private */
function repairTask(workspace: Workspace, command: string, output: string): TaskDefinition {
    return { id: `check-repair-${randomUUID()}`, title: 'Repair project checks', payload: `Repair the failing project validation.\nCommand: ${command}\n\n${output}`, rules: ['Preserve assertions, thresholds and validation coverage.'], status: 'todo', priority: 0, runners: [], dependencies: [], doneTimestamps: [], scheduleRevision: 'check-repair', diagnostics: [], source: { format: 'book', path: path.join(workspace.projectPath, 'package.json'), relativePath: 'package.json', sectionIndex: -1, revision: '' } };
}
/** Validate without consuming the backlog, materializing only real maintenance or failed-check repair. @private */
async function fixOwned(workspace: Workspace, options: RunOptions, result: RunResult, protectedPaths: string[], lease: WorkspaceLease, allowRepair = true): Promise<boolean> {
    await lease.assertOwned();
    const baseline = await captureSnapshot(workspace.gitRoot!); const command = options.check ?? 'npm run check';
    const check = await runCheck(workspace, command, { signal: options.signal, protectedPaths, preserveView: options.preserveLogs, onOutput: options.onOutput, assertOwned: options.assertOwned });
    emit(result, options, 'check-result', `Initial checks ${check.outcome} (exit ${check.exitCode}).`);
    if (check.outcome === 'passed' && !check.changedPaths.length) return true;
    const task = repairTask(workspace, command, check.output);
    if (check.outcome === 'passed') { task.title = 'Apply project check transformations'; task.payload = `Accept changes produced by project validation.\nCommand: ${command}`; }
    const repairApproved = check.outcome === 'failed' && allowRepair && (!options.noAuto || Boolean(options.confirm && await options.confirm('task', `Execute ${task.title}?`)));
    if (check.outcome !== 'passed' && !repairApproved) {
        result.failed++; result.exitCode = check.outcome === 'cancelled' ? 130 : 1;
        emit(result, options, 'blocked', `Initial checks ${check.outcome}; transformations remain uncommitted. ${check.output}`); return false;
    }
    await announceIdentity(workspace, options, result);
    const ledger = await readLedger(workspace);
    const journal = await claim(workspace, task, ledger, baseline, protectedPaths, (options.now ?? Date.now)(), options);
    journal.checkCommand = command; journal.checks = check.outcome; journal.output = retainedOutput(check.output);
    journal.expected = await captureSnapshot(workspace.gitRoot!);
    if (check.outcome === 'passed') {
        await boundary(workspace, journal, 'implementation-ready', options);
        try { await complete(workspace, journal, ledger, { ...options, check: command }, result); }
        catch (error) { await failOccurrence(workspace, journal, ledger, error, options, result); }
    } else await execute(workspace, journal, ledger, { ...options, check: command }, result, `Command: ${command}\n${check.output}`);
    return result.failed === 0;
}
/** Execute only checks and, if necessary, one bounded shared repair task. @private */
export async function fixChecks(workspace: Workspace, options: RunOptions = {}): Promise<RunResult> {
    options = { ...options, redactProjectPath: workspace.projectPath };
    validateRunOptions(options, true); const result = report();
    if (options.dryRun) { emit(result, options, 'dry-run', `Would run ${options.check ?? 'npm run check'} and repair only if it fails.`); return result; }
    await ensureGit(workspace); options.redactProjectPath = workspace.projectPath; await loadProjectSecrets(workspace.projectPath); const lease = await acquireLease(workspace); options.assertOwned = () => lease.assertOwned();
    try {
        if ((await listRecovery(workspace)).length) throw new Error('Interrupted work requires explicit recovery before a new fix task. Use ptbk recover.');
        const baseline = await initialBoundary(workspace, options); await fixOwned(workspace, options, result, baseline.dirtyPaths, lease); return result;
    }
    finally { await lease.release(); }
}
/** Map one claimed task into an ignored worktree while retaining shared project ownership. @private */
async function executeIsolated(workspace: Workspace, journal: RunJournal, ledger: Ledger, options: RunOptions, result: RunResult): Promise<void> {
    const root = workspace.gitRoot!; const origin = await captureSnapshot(root);
    let view: string | undefined;
    try {
        const branch = (await git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).trim();
        if (!branch || !origin.head) throw new Error('Isolation requires a named branch with an initial commit.');
        if (origin.dirtyPaths.length) throw new Error('Isolation requires a clean origin checkout.');
        const directory = path.join(workspace.statePath, 'worktrees');
        if (!(await git(root, ['check-ignore', directory], { allowFailure: true })).trim()) throw new Error('Ignore .ptbk/ before using --isolate.');
        await fs.mkdir(directory, { recursive: true }); view = path.join(directory, journal.id);
        const isolationBranch = `ptbk-isolation/${journal.id}`;
        await git(root, ['worktree', 'add', '-b', isolationBranch, view, origin.head]);
        const map = (filename: string) => path.join(view!, path.relative(root, filename));
        const isolated: Workspace = { ...workspace, projectPath: map(workspace.projectPath), gitRoot: view, tasksPath: map(workspace.tasksPath), legacyPath: map(workspace.legacyPath) };
        for (const name of ['node_modules', '.env']) {
            const original = path.join(workspace.projectPath, name);
            if (!(await git(root, ['check-ignore', original], { allowFailure: true })).trim()) continue;
            try { await fs.cp(original, path.join(isolated.projectPath, name), { recursive: true, dereference: false }); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
        const sourceTask = (await discoverTasks(isolated)).find((task) => task.id === journal.taskId);
        if (!sourceTask) throw new Error('Task source could not be mapped into the isolation worktree.');
        journal.baseline = await captureSnapshot(view); journal.task = await assignTaskId(sourceTask, { ...options.sourceWriteOptions, assertOwned: options.assertOwned }); journal.protectedPaths = [];
        journal.isolation = { view, branch: isolationBranch, origin, sourcePath: path.relative(root, workspace.projectPath) };
        const isolatedOptions = { ...options, isolate: false, autoPush: false,
            agent: options.agent ? /^(https:|ptbk:)/.test(options.agent) ? options.agent : map(await resolveAgent(workspace, options.agent)) : undefined };
        await execute(isolated, journal, ledger, isolatedOptions, result);
        if (journal.phase !== 'integrating') return;
        await integrateIsolated(workspace, journal, ledger, options, result);
    } catch (error) {
        await failOccurrence(workspace, journal, ledger, new Error(`${(error as Error).message}${view ? ` Isolation checkout ${view} and its branch were retained.` : ''}`), options, result);
    }
}
/** Integrate a verified isolated result only by fast-forward, keeping unintegrated work recoverable. @private */
async function integrateIsolated(workspace: Workspace, journal: RunJournal, ledger: Ledger, options: RunOptions, result: RunResult): Promise<void> {
    const isolation = journal.isolation!; const root = workspace.gitRoot!;
    const resultHead = (await git(isolation.view, ['rev-parse', 'HEAD'])).trim();
    const current = await captureSnapshot(root);
    if (current.head !== resultHead) {
        await assertSnapshot(isolation.origin);
        await git(root, ['merge', '--ff-only', isolation.branch], { signal: options.signal });
    } else {
        // Integration may have succeeded immediately before interruption. Git may legitimately
        // convert LF/CRLF or apply checkout filters, so compare accepted Git content as well as
        // the complete index and file types; any dirty edit remains a recovery boundary.
        const isolatedResult = await captureSnapshot(isolation.view);
        if (current.dirtyPaths.length || current.index !== isolatedResult.index) throw new Error('Integrated checkout changed before recovery; preserve both versions and inspect the boundary.');
        for (const name of await changedPaths({ ...isolatedResult, root }, current)) {
            const expected = isolatedResult.files[name]; const actual = current.files[name];
            if (!expected || !actual || expected.kind !== actual.kind || expected.mode !== actual.mode) throw new Error(`Integrated ${name} changed type or permissions before recovery; both versions were preserved.`);
            const args = ['hash-object', ...(expected.kind === 'symlink' ? ['--no-filters'] : [`--path=${name}`]), '--stdin'];
            const hashes = await Promise.all([expected, actual].map(entry => git(root, args, { input: Buffer.from(entry.content, 'base64'), signal: options.signal })));
            if (hashes[0]!.trim() !== hashes[1]!.trim()) throw new Error(`Integrated ${name} differs from the accepted Git content; both versions were preserved.`);
        }
        await assertSnapshot(current);
    }
    const mapped = (await discoverTasks(workspace)).find(task => task.id === journal.taskId);
    if (mapped) journal.task = mapped;
    journal.expected = await captureSnapshot(root);
    if (journal.expected.dirtyPaths.length) throw new Error('Integrated checkout has concurrent edits; preserve the accepted isolated result before recovery.');
    await recordCompletion(workspace, journal, ledger, options, result);
    emit(result, options, 'integrated', `Integrated ${isolation.branch} by fast-forward.`, journal.task);
    try {
        await git(root, ['worktree', 'remove', isolation.view]); delete journal.isolation; await writeJournal(workspace, journal);
    } catch (error) { emit(result, options, 'cleanup-pending', `Accepted integration is complete; isolation cleanup needs attention: ${(error as Error).message}`, journal.task); }
    if (options.autoPush) await synchronizeResult(workspace, journal, options, result);
}
/** Reconcile a commit intent only when the current HEAD carries this exact journal phase. @private */
async function reconcileIntent(workspace: Workspace, journal: RunJournal): Promise<boolean> {
    if (!journal.pendingPhase || !journal.expected) return false;
    const current = await captureSnapshot(workspace.gitRoot!);
    if (current.head === journal.baseline.head) return false;
    const message = await git(workspace.gitRoot!, ['log', '-1', '--format=%B']);
    if (!message.includes(`Ptbk-Journal: ${journal.id}`) || !message.includes(`Ptbk-Phase: ${journal.pendingPhase}`)) throw new Error('HEAD changed outside the recorded commit intent; ownership cannot be established.');
    const paths = await changedPaths(journal.baseline, journal.expected);
    const entries = new Map<string, { mode: string; object: string }>();
    for (const item of (await git(workspace.gitRoot!, ['ls-tree', '-rz', 'HEAD', '--', ...paths])).split('\0').filter(Boolean)) {
        const match = /^(\d+) \w+ ([a-f0-9]+)\t([\s\S]+)$/.exec(item);
        if (match) entries.set(match[3]!, { mode: match[1]!, object: match[2]! });
    }
    for (const name of paths) {
        const expected = journal.expected.files[name]; const actual = entries.get(name);
        if (!expected) { if (actual) throw new Error(`Commit intent unexpectedly retained deleted path ${name}.`); continue; }
        const object = (await git(workspace.gitRoot!, ['hash-object', ...(expected.kind === 'symlink' ? ['--no-filters'] : [`--path=${name}`]), '--stdin'], { input: Buffer.from(expected.content, 'base64') })).trim();
        const mode = expected.kind === 'symlink' ? '120000' : expected.mode & 0o111 ? '100755' : '100644';
        if (!actual || actual.object !== object || actual.mode !== mode) throw new Error(`Committed ${name} differs from the captured intent; a hook or editor changed it. Completion remains pending.`);
    }
    const liveChanges = await changedPaths(journal.expected, current);
    const rolledBackCompletion = Boolean(journal.completionRollback && !(await changedPaths(journal.completionRollback, current)).length);
    if (liveChanges.length && !rolledBackCompletion) throw new Error('Committed intent has unexpected live content; inspect the preserved snapshots before recovery.');
    // A crash can precede real-index alignment. Compare foreign entries before repairing only own entries.
    const foreignEntries = (index: string) => index.split('\0').filter((item) => item && !paths.includes(item.slice(item.indexOf('\t') + 1))).sort().join('\0');
    if (foreignEntries(current.index) !== foreignEntries(journal.baseline.index)) throw new Error('Foreign staged entries changed after commit intent; index recovery was refused.');
    const foreignFlags = (flags: string) => flags.split('\0').filter((item) => item && !paths.includes(item.slice(2))).sort().join('\0');
    if (foreignFlags(current.indexFlags) !== foreignFlags(journal.baseline.indexFlags)) throw new Error('Foreign index flags changed after commit intent; recovery was refused.');
    if (rolledBackCompletion) for (const name of journal.metadataPaths ?? []) await writeFileSnapshot(workspace.gitRoot!, name, journal.expected.files[name]);
    await alignOwnedIndex(workspace.gitRoot!, paths);
    const commit = current.head!;
    if (!journal.commits.includes(commit)) journal.commits.push(commit);
    journal.expected = await captureSnapshot(workspace.gitRoot!); delete journal.pendingPhase; delete journal.completionRollback; await writeJournal(workspace, journal); return true;
}
/** Resume a proven phase without replaying successful inference or external work. @private */
async function resumeOne(workspace: Workspace, options: RunOptions, result: RunResult, lease: WorkspaceLease, selectedId?: string): Promise<RunResult> {
    await lease.assertOwned(); const candidates = (await listRecovery(workspace)).filter((item) => !selectedId || item.taskId === selectedId);
    if (candidates.length !== 1) throw new Error(`Continue requires exactly one proven interrupted task; found ${candidates.length}. Inspect ptbk recover.`);
    const journal = candidates[0]!; const ledger = await readLedger(workspace); const originWorkspace = workspace;
    await announceIdentity(workspace, options, result);
    options = { ...options, harness: options.harness ?? journal.harness, model: options.model ?? journal.model, thinkingLevel: options.thinkingLevel ?? journal.thinkingLevel };
    journal.identity ??= options.identity;
    if (journal.isolation) {
        if (journal.safePhase === 'integrating' || journal.phase === 'integrating') {
            await integrateIsolated(workspace, journal, ledger, options, result); return result;
        }
        const isolation = journal.isolation;
        const map = (filename: string) => path.join(isolation.view, path.relative(workspace.gitRoot!, filename));
        workspace = { ...workspace, gitRoot: isolation.view, projectPath: path.join(isolation.view, isolation.sourcePath), tasksPath: map(workspace.tasksPath), legacyPath: map(workspace.legacyPath) };
    }
    const phase = journal.pendingPhase;
    const reconciled = await reconcileIntent(workspace, journal);
    if (phase === 'result' && reconciled) {
        if (journal.isolation) { await boundary(workspace, journal, 'integrating', options); await integrateIsolated(originWorkspace, journal, ledger, options, result); }
        else { await recordCompletion(workspace, journal, ledger, options, result); if (options.autoPush) await synchronizeResult(workspace, journal, options, result); }
        result.commits.push(...journal.commits); return result;
    }
    if ((journal.phase === 'completion-ready' || journal.safePhase === 'completion-ready') && !journal.pendingPhase && journal.expected) {
        await assertSnapshot(journal.expected);
        const message = await git(workspace.gitRoot!, ['log', '-1', '--format=%B']);
        if (!message.includes(`Ptbk-Journal: ${journal.id}`) || !message.includes('Ptbk-Phase: result')) throw new Error('Accepted persistence cannot be reconciled with Git history; no model was repeated.');
        if (journal.isolation) { await boundary(workspace, journal, 'integrating', options); await integrateIsolated(originWorkspace, journal, ledger, options, result); }
        else { await recordCompletion(workspace, journal, ledger, options, result); if (options.autoPush) await synchronizeResult(workspace, journal, options, result); }
        return result;
    }
    if (phase === 'result' && journal.expected) {
        if (journal.completionRollback) {
            await assertSnapshot(journal.completionRollback);
            for (const name of journal.metadataPaths ?? []) await writeFileSnapshot(workspace.gitRoot!, name, journal.expected.files[name]);
        }
        await assertSnapshot(journal.expected);
        const task = (await discoverTasks(workspace)).find((item) => item.id === journal.taskId);
        if (task) journal.task = task;
        await persistResult(workspace, journal, options, result);
        if (journal.isolation) { await boundary(workspace, journal, 'integrating', options); await integrateIsolated(originWorkspace, journal, ledger, options, result); }
        else { await recordCompletion(workspace, journal, ledger, options, result); if (options.autoPush) await synchronizeResult(workspace, journal, options, result); }
        return result;
    }
    if (!journal.expected || journal.safePhase !== 'implementation-ready' && journal.phase !== 'implementation-ready') throw new Error('The previous model/check outcome is uncertain. Resume cannot replay it safely; use explicit retry after reviewing its effects.');
    await assertSnapshot(journal.expected);
    await execute(workspace, journal, ledger, { ...options, check: options.check ?? journal.checkCommand }, result, undefined, true);
    if (journal.isolation && journal.phase === 'integrating') await integrateIsolated(originWorkspace, journal, ledger, options, result);
    return result;
}
/** Retry only explicitly requested remote synchronization, preserving all local completion. @private */
async function retryPendingSync(workspace: Workspace, options: RunOptions, result: RunResult, candidates?: RunJournal[]): Promise<boolean> {
    const pending = candidates ?? await readJournals(workspace, journal => journal.phase === 'completed' && Boolean(journal.syncPending));
    if (!pending.length) return true;
    await options.assertOwned?.();
    try {
        await git(workspace.gitRoot!, ['push'], { signal: options.signal });
        for (const journal of pending) { delete journal.syncPending; await writeJournal(workspace, journal); }
        emit(result, options, 'push', 'Previously completed local work is now synchronized; no model was called.'); return true;
    } catch (error) { result.syncPending = true; result.exitCode = 1; emit(result, options, 'sync-pending', `Local completion remains preserved; remote synchronization failed: ${(error as Error).message}`); return false; }
}
/** Explicit recovery inspection and acknowledged actions; inspection/dry-run are strictly read-only. @private */
export async function recoverTask(workspace: Workspace, taskId: string, recovery: { action?: 'resume' | 'retry' | 'acknowledge'; occurrence?: string; dryRun?: boolean } = {}, options: RunOptions = {}): Promise<RunResult & { journals: RunJournal[]; plan: string }> {
    options = { ...options, redactProjectPath: workspace.projectPath };
    const journals = await readJournals(workspace, journal => journal.taskId === taskId && (!recovery.occurrence || journal.occurrenceId === recovery.occurrence));
    if (!journals.length) throw new Error(`No recorded occurrence for ${taskId}.`);
    const selected = journals.filter((journal) => journal.phase !== 'completed' && journal.phase !== 'failed' || journal.syncPending);
    const plan = recovery.action ? `${recovery.action} ${taskId}: ${selected.length} interrupted occurrence(s); external effects must already have been reviewed before explicit retry.` : journals.map((journal) => `${journal.occurrenceId}: ${journal.phase}${journal.syncPending ? ' (remote synchronization pending)' : ''}${journal.error ? ` — ${journal.error}` : ''}`).join('\n');
    const result = report();
    if (!recovery.action || recovery.dryRun) return { ...result, journals, plan };
    if (selected.length !== 1) throw new Error(`Recovery action requires one interrupted occurrence; found ${selected.length}. Select --occurrence.`);
    await ensureGit(workspace); options.redactProjectPath = workspace.projectPath; await loadProjectSecrets(workspace.projectPath); const lease = await acquireLease(workspace, { recoverStale: true }); options.assertOwned = () => lease.assertOwned();
    try {
        const journal = selected[0]!; const ledger = await readLedger(workspace);
        if (journal.phase === 'completed' && journal.syncPending) {
            if (recovery.action !== 'resume') throw new Error('This task already completed locally. Use --action resume to retry only remote synchronization.');
            await retryPendingSync(workspace, options, result, [journal]); return { ...result, journals: await readJournals(workspace, journal => journal.taskId === taskId && (!recovery.occurrence || journal.occurrenceId === recovery.occurrence)), plan };
        }
        if (recovery.action === 'retry' && options.noAuto && (!options.confirm || !await options.confirm('task', `Retry ${journal.task.title}?`))) {
            result.skipped++;
            emit(result, options, 'skipped', 'Retry declined; the recorded occurrence and recovery state were preserved.', journal.task);
            return { ...result, journals: await readJournals(workspace, journal => journal.taskId === taskId && (!recovery.occurrence || journal.occurrenceId === recovery.occurrence)), plan };
        }
        if (recovery.action !== 'acknowledge') { await announceIdentity(workspace, options, result); journal.identity ??= options.identity; }
        if (recovery.action === 'resume') await resumeOne(workspace, { ...options, gitChanges: 'continue' }, result, lease, taskId);
        else if (recovery.action === 'acknowledge') {
            await assertSnapshot(journal.completionRollback ?? journal.expected ?? journal.baseline);
            await assertSource(journal.task);
            const entry = ledger.tasks[taskId];
            if (entry) { delete entry.claim; delete entry.blocked; entry.lastConsumedSlot = journal.dueSlot; if (journal.task.repeat) entry.nextDue = journal.dueSlot + journal.task.repeat; const history = entry.history.find((item) => item.id === journal.occurrenceId); if (history) { history.outcome = 'acknowledged-failure'; history.finishedAt = (options.now ?? Date.now)(); } }
            journal.phase = 'failed'; await saveLedger(workspace, ledger); await writeJournal(workspace, journal); emit(result, options, 'acknowledged', 'Recorded an acknowledged failure; it is not a successful completion.', journal.task);
        } else {
            await assertSnapshot(journal.completionRollback ?? journal.expected ?? journal.baseline);
            const task = (await discoverTasks(workspace)).find((item) => item.id === taskId);
            if (!task && journal.task.source.sectionIndex >= 0) throw new Error('Task source is missing or changed; retry cannot claim it.');
            if (task?.diagnostics.length || task?.relationshipDiagnostics?.length || task && !['todo', 'in-progress'].includes(task.status)) throw new Error(`Task is not ready for deliberate retry: ${[...(task?.diagnostics ?? []), ...(task?.relationshipDiagnostics ?? []), task?.status !== 'todo' && task?.status !== 'in-progress' ? `status ${task?.status}` : ''].filter(Boolean).join('; ')}`);
            if (task) journal.task = task;
            journal.attempts = 0; journal.technicalRetries = 0;
            delete journal.error; delete journal.pendingPhase; delete journal.safePhase; delete journal.acceptance; delete journal.agentInstructionsHash; delete journal.completionRollback;
            if (ledger.tasks[taskId]) delete ledger.tasks[taskId]!.blocked;
            await saveLedger(workspace, ledger); await execute(workspace, journal, ledger, options, result);
        }
        return { ...result, journals: await readJournals(workspace, journal => journal.taskId === taskId && (!recovery.occurrence || journal.occurrenceId === recovery.occurrence)), plan };
    } finally { await lease.release(); }
}
