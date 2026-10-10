import { randomUUID, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { EligibilityContext, TaskDefinition, Workspace } from './domain.js';
import { discoverTasks, markdownSections, updateTaskStatus } from './sources.js';
import { evaluateEligibility } from './schedule.js';
import { prepareAgent } from './agents.js';
import { runHarness, redactSecrets, loadProjectSecrets, type HarnessRequest, type HarnessResult } from './harness.js';
import { runCheck, runPrivateOperation, validateCheck, type CheckResult } from './checks.js';
import { confinePath, InputError, resolveAgentSelection } from './workspace.js';
import { acquireLease, atomicWrite, listRecovery, readJournals, readLedger, saveLedger, writeJournal, type AttemptRecord, type Ledger, type RunJournal, type WorkspaceLease } from './state.js';
import { alignOwnedIndex, assertSnapshot, captureSnapshot, changedPaths, commitIdentity, commitScoped, discoverGit, git, GitPersistenceError, normalizeOwned, readFileSnapshot, sameFile, writeFileSnapshot, type GitIdentity, type GitSnapshot } from './git.js';

/** Shared terminal/server event, containing only redacted diagnostics. @private */
export interface EngineEvent { type: string; message: string; taskId?: string; occurrenceId?: string; time: number; [key: string]: unknown }
/** Finite run outcome, separating local completion from pending remote synchronization. @private */
export interface RunResult { completed: number; failed: number; skipped: number; commits: string[]; exitCode: 0 | 1 | 2 | 130; events: EngineEvent[]; nextWakeUp?: number; syncPending?: boolean; retainedPaths?: string[] }
/** Common execution options, with deterministic harness/time seams for offline tests. @private */
export interface RunOptions {
    harness?: string; model?: string; thinkingLevel?: string; agent?: string; context?: string;
    check?: string; checkBefore?: 'no' | 'yes-and-fail' | 'yes-and-fix'; gitChanges?: 'fail' | 'ignore' | 'continue';
    noCommit?: boolean; noAuto?: boolean; noQuestions?: boolean; autoPull?: boolean; autoPush?: boolean;
    isolate?: boolean; normalizeLineEndings?: boolean; limit?: number; minPriority?: number; maxPriority?: number;
    allowCredits?: boolean; waitBetweenPrompts?: number; waitAfterPrompt?: number; waitAfterError?: number;
    dryRun?: boolean; signal?: AbortSignal; onEvent?: (event: EngineEvent) => void; onOutput?: (text: string) => void;
    isPaused?: () => boolean; shouldStop?: () => boolean; skipWait?: () => boolean;
    onWait?: (waiting: boolean) => void;
    confirm?: (step: 'task' | 'commit', message: string) => Promise<boolean>;
    runHarness?: (request: HarnessRequest) => Promise<HarnessResult>; now?: () => number;
    sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>; preserveLogs?: boolean;
    redactProjectPath?: string;
    identity?: GitIdentity;
    assertOwned?: () => Promise<void>;
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
    const event: EngineEvent = { type, message: redactSecrets(message, options.redactProjectPath), time: (options.now ?? Date.now)(), ...(task ? { taskId: task.id } : {}), ...extra };
    result.events.push(event); if (result.events.length > 512) result.events.shift(); options.onEvent?.(event);
}
/** Validate combinations before a lease, file mutation, provider setup, or inference. @private */
export function validateRunOptions(options: RunOptions, fix = false): void {
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
    workspace.gitRoot ??= await discoverGit(workspace.projectPath);
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
async function invocation(workspace: Workspace, task: TaskDefinition, options: RunOptions): Promise<{ harness: string; model?: string; agentPath: string; instructions: string; context: string }> {
    const harness = options.harness ?? task.harness;
    if (!harness) throw new Error(`Task ${task.id} has no selected harness. Use --harness or a configured task HARNESS.`);
    const agentPath = await resolveAgent(workspace, options.agent ?? task.agent ?? path.join('agents', 'developer.book'));
    const agent = await prepareAgent(agentPath, workspace.projectPath);
    let context = options.context;
    if (context === undefined) {
        try { context = await fs.readFile(path.join(workspace.projectPath, 'AGENTS.md'), 'utf8'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; context = ''; }
    }
    return { harness, model: options.model ?? task.model ?? agent.model, agentPath, instructions: agent.instructions, context };
}
/** Resolve an explicit local path or an exact named local role without silent fallback. @private */
async function resolveAgent(workspace: Workspace, reference: string): Promise<string> {
    return (await resolveAgentSelection(workspace, reference)).path;
}
/** Routing includes the selected role's local aliases without compiling remote inheritance. @private */
async function selectionContext(workspace: Workspace, task: TaskDefinition, options: RunOptions): Promise<EligibilityContext> {
    const reference = options.agent ?? task.agent ?? path.join('agents', 'developer.book');
    const selection = await resolveAgentSelection(workspace, reference);
    return { now: (options.now ?? Date.now)(), timezone: workspace.timezone, harness: options.harness, model: options.model, agent: selection.path, agentAliases: selection.aliases, minPriority: options.minPriority, maxPriority: options.maxPriority };
}
/** Explicitly forbid the provider from taking ownership of status or Git persistence. @private */
function promptFor(task: TaskDefinition, instructions: string, feedback?: string): string {
    return `You are implementing task ${task.id}: ${task.title}.\nDo not commit, push, change task status, or edit coder operational state. The host owns Git persistence and completion. Preserve pre-existing user changes.\n\nAGENT INSTRUCTIONS\n${instructions}\n\nTASK RULES\n${task.rules.join('\n')}\n\nTASK\n${task.payload}${feedback ? `\n\nCHECK FEEDBACK\n${feedback}\nRepair the implementation without removing assertions, reducing thresholds, disabling checks, or omitting builds merely to make validation pass.` : ''}`;
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
    const journal: RunJournal = { version: 1, id, taskId: task.id, occurrenceId, task, phase: 'claimed', startedAt: now, updatedAt: now, dueSlot, baseline, protectedPaths, commits: [], attempts: 0, identity: options.identity,
        sourceSnapshot: { revision: task.source.revision, payloadHash: createHash('sha256').update(task.payload).digest('hex'), gitHead: baseline.head },
    };
    await writeJournal(workspace, journal); await saveLedger(workspace, ledger);
    return journal;
}
/** Store an execution boundary together with the actual last expected content. @private */
async function boundary(workspace: Workspace, journal: RunJournal, phase: RunJournal['phase'], options: RunOptions): Promise<void> {
    journal.phase = phase; journal.updatedAt = (options.now ?? Date.now)(); await writeJournal(workspace, journal);
}
/** Persist one proven phase and record the intent before Git can create a commit. @private */
async function persist(workspace: Workspace, journal: RunJournal, baseline: GitSnapshot, subject: string, phase: string, options: RunOptions, result: RunResult): Promise<void> {
    await options.assertOwned?.();
    const current = await captureSnapshot(workspace.gitRoot!);
    if (phase === 'completion' && journal.legacyTrace && journal.legacyTraceHash) {
        const name = path.relative(workspace.gitRoot!, path.join(workspace.projectPath, journal.legacyTrace)).split(path.sep).join('/');
        const latest = current.files[name] ?? await readFileSnapshot(workspace.gitRoot!, name);
        if (latest?.kind !== 'file' || latest.hash !== journal.legacyTraceHash) throw new Error(`Legacy trace ${journal.legacyTrace} changed concurrently; completion was not committed.`);
    }
    const overlap = (await changedPaths(baseline, current)).filter((name) => journal.protectedPaths.includes(name));
    if (overlap.length) throw new Error(`Phase ${phase} overlaps existing user work in ${overlap.join(', ')}; original bytes and index are retained in the recovery journal.`);
    journal.baseline = baseline; journal.expected = current; journal.pendingPhase = phase; await writeJournal(workspace, journal);
    if (options.noCommit) { emit(result, options, 'uncommitted', `Retained ${phase} changes without an automatic commit.`, journal.task); return; }
    if (options.noAuto && (!options.confirm || !await options.confirm('commit', `Commit ${phase} changes for ${journal.taskId}?`))) throw new Error('Commit confirmation was declined; implementation is retained for recovery.');
    const message = `${subject}\n\nTask: ${journal.taskId}\nOccurrence: ${journal.occurrenceId}\nPhase: ${phase}\nAttempt: ${journal.attempts}\n${phase === 'check' ? `Command: ${journal.checkCommand}\nOutcome: ${journal.checks}\n` : ''}\nPtbk-Journal: ${journal.id}\nPtbk-Phase: ${phase}`;
    const commit = await commitScoped(baseline, message, { protectedPaths: journal.protectedPaths, expected: current });
    if (commit) { journal.commits.push(commit); result.commits.push(commit); emit(result, options, 'commit', `Saved ${phase} changes as ${commit}.`, journal.task, { commit }); }
    await options.assertOwned?.();
    journal.baseline = await captureSnapshot(workspace.gitRoot!); journal.expected = journal.baseline; delete journal.pendingPhase; await writeJournal(workspace, journal);
}
/** Run one inference plus only safe technical retries; failures never masquerade as completion. @private */
async function infer(workspace: Workspace, journal: RunJournal, options: RunOptions, result: RunResult, feedback?: string): Promise<HarnessResult> {
    const selection = await invocation(workspace, journal.task, options);
    journal.harness = selection.harness; journal.model = selection.model;
    journal.agent = selection.agentPath; journal.agentInstructionsHash = createHash('sha256').update(selection.instructions).digest('hex');
    const runner = options.runHarness ?? runHarness;
    await assertSource(journal.task);
    const before = await captureSnapshot(workspace.gitRoot!); journal.expected = before;
    await boundary(workspace, journal, 'running', options);
    const operation = await runPrivateOperation(workspace, async privateWorkspace => {
        let resumeQuota = false;
        for (let retry = 0; retry <= 3; retry++) {
            if (options.signal?.aborted) return { outcome: 'cancelled', exitCode: 130, output: 'Cancelled before inference.' } as HarnessResult;
            const record: AttemptRecord = { attempt: journal.attempts, retry, startedAt: (options.now ?? Date.now)(), harness: selection.harness, model: selection.model, agent: selection.agentPath,
                thinkingLevel: options.thinkingLevel, ...(resumeQuota ? { sessionId: journal.sessionId } : {}),
            };
            journal.attemptHistory ??= []; journal.attemptHistory.push(record);
            if (journal.attemptHistory.length > 100) journal.attemptHistory.splice(0, journal.attemptHistory.length - 100);
            await writeJournal(workspace, journal);
            emit(result, options, 'attempt', `Implementation attempt ${journal.attempts}, technical retry ${retry}${resumeQuota ? ', same Claude session' : ''}.`, journal.task, { attempt: journal.attempts, retry });
            const privateBefore = await captureSnapshot(privateWorkspace.gitRoot!, true);
            let pendingOutput = '';
            /** Buffer incomplete lines so a secret split across provider chunks cannot leak. */
            const stream = (chunk: string) => {
                pendingOutput = (pendingOutput + chunk).slice(-2 * 1024 * 1024);
                const end = pendingOutput.lastIndexOf('\n');
                if (end >= 0) { const text = redactSecrets(pendingOutput.slice(0, end + 1), options.redactProjectPath); pendingOutput = pendingOutput.slice(end + 1); options.onOutput?.(text); emit(result, options, 'output', text, journal.task); }
            };
            const response = await runner({ harness: selection.harness, projectPath: privateWorkspace.projectPath, redactionPath: options.redactProjectPath, prompt: `${resumeQuota ? 'Continue the same task after its confirmed usage-limit interruption. Preserve existing progress and do not repeat completed external actions.\n\n' : ''}${promptFor(journal.task, selection.instructions, feedback)}`, agentPath: /^https:/.test(selection.agentPath) ? selection.agentPath : path.join(privateWorkspace.gitRoot!, path.relative(workspace.gitRoot!, selection.agentPath)), context: selection.context, model: selection.model, thinkingLevel: options.thinkingLevel, allowCredits: options.allowCredits, signal: options.signal, sessionId: resumeQuota ? journal.sessionId : undefined, onOutput: stream });
            Object.assign(record, { finishedAt: (options.now ?? Date.now)(), outcome: response.outcome, exitCode: response.exitCode,
                ...(response.sessionId ? { sessionId: response.sessionId } : {}), ...(response.usage ? { usage: response.usage } : {}),
                authentication: response.authentication ?? 'unknown', ...(response.effectiveModel ? { effectiveModel: response.effectiveModel } : {}),
                ...(response.outcome !== 'success' ? { reason: redactSecrets(`${response.outcome}: ${response.output}`, options.redactProjectPath).slice(0, 2048) } : {}),
            });
            if (pendingOutput) { const text = redactSecrets(pendingOutput, options.redactProjectPath); options.onOutput?.(text); emit(result, options, 'output', text, journal.task); }
            journal.thinkingLevel = options.thinkingLevel;
            journal.authentication = response.authentication ?? 'unknown'; journal.effectiveModel = response.effectiveModel;
            journal.sessionId = response.sessionId ?? journal.sessionId;
            if (response.usage) { journal.usage ??= {}; for (const [key, value] of Object.entries(response.usage)) journal.usage[key] = (journal.usage[key] ?? 0) + value; }
            journal.output = retainedOutput(redactSecrets(`${journal.output ?? ''}\n${response.output}`, options.redactProjectPath));
            await writeJournal(workspace, journal);
            await assertSnapshot(before);
            const privateAfter = await captureSnapshot(privateWorkspace.gitRoot!, true);
            if (privateBefore.head !== privateAfter.head || privateBefore.index !== privateAfter.index || privateBefore.indexFlags !== privateAfter.indexFlags) throw new Error('Harness changed private Git HEAD or index; its checkout was retained for review.');
            if (response.outcome === 'success' && response.exitCode === 0 && !response.signal) return response;
            if (response.outcome === 'success') return { ...response, outcome: 'process-failure' } as HarnessResult;
            const quotaResume = response.outcome === 'quota' && selection.harness === 'claude-code' && Boolean(response.sessionId);
            const safeTransient = response.outcome === 'transient' && !(await changedPaths(privateBefore, privateAfter)).length;
            if (retry === 3 || !quotaResume && !safeTransient) return response;
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
/** Record actual validation and keep checker transformations in their own phase commit. @private */
async function checkPhase(workspace: Workspace, journal: RunJournal, command: string, options: RunOptions, result: RunResult): Promise<CheckResult> {
    await options.assertOwned?.();
    const baseline = await captureSnapshot(workspace.gitRoot!); journal.checkCommand = command;
    await boundary(workspace, journal, 'checking', options);
    emit(result, options, 'check', `Running check: ${command}`, journal.task);
    const check = await runCheck(workspace, command, { signal: options.signal, protectedPaths: journal.protectedPaths, preserveView: options.preserveLogs, onOutput: options.onOutput, assertOwned: options.assertOwned });
    journal.checks = check.outcome; journal.output = retainedOutput(redactSecrets(`${journal.output ?? ''}\nCheck (${check.outcome}):\n${check.output}`, options.redactProjectPath));
    journal.phase = 'implementation-ready';
    await persist(workspace, journal, baseline, 'chore: Automatically commit changes made by checks', 'check', options, result);
    emit(result, options, 'check-result', `Checks ${check.outcome} (exit ${check.exitCode}).`, journal.task, { outcome: check.outcome });
    return check;
}
/** Maintain historical Markdown trace filenames only across a proved, unchanged boundary. @private */
async function legacyTrace(workspace: Workspace, journal: RunJournal, body: string, options: RunOptions, result: RunResult): Promise<void> {
    if (journal.task.source.format !== 'markdown') return;
    delete journal.legacyTrace; delete journal.legacyTraceHash;
    await assertSource(journal.task);
    const sections = markdownSections(await fs.readFile(journal.task.source.path, 'utf8')).filter(section => section.text.trim());
    const ordinal = sections.findIndex(section => section.index === journal.task.source.sectionIndex) + 1;
    if (!ordinal) throw new Error('Legacy trace section could not be identified; source was preserved.');
    const basename = path.basename(journal.task.source.path).replace(/\.[^.]+$/u, '');
    const filename = path.join(path.dirname(journal.task.source.path), 'traces', `${basename}${sections.length > 1 ? `-${ordinal}` : ''}.md`);
    await confinePath(workspace.projectPath, filename);
    const relative = path.relative(workspace.gitRoot!, filename).split(path.sep).join('/');
    const projectRelative = path.relative(workspace.projectPath, filename);
    const existing = await readFileSnapshot(workspace.gitRoot!, relative);
    if (existing && !journal.baseline.files[relative] && (await git(workspace.gitRoot!, ['check-ignore', '--', relative], { allowFailure: true })).trim()) {
        emit(result, options, 'trace-preserved', `Ignored legacy trace ${projectRelative} has no captured ownership; retained it and saved this occurrence separately.`, journal.task); return;
    }
    if (!sameFile(existing, journal.baseline.files[relative])) throw new Error(`Legacy trace ${projectRelative} changed concurrently; user content was preserved.`);
    if (existing) {
        const owned = existing.kind === 'file' && !journal.protectedPaths.includes(relative) && (await readJournals(workspace)).some(previous =>
            previous.taskId === journal.taskId && previous.legacyTrace === projectRelative && previous.legacyTraceHash === existing.hash);
        if (!owned) { emit(result, options, 'trace-preserved', `Existing legacy trace ${projectRelative} has no unchanged coder ownership; retained it and saved this occurrence separately.`, journal.task); return; }
        const temporary = `${filename}.${randomUUID()}.tmp`;
        try {
            await fs.writeFile(temporary, body, { flag: 'wx' });
            await options.assertOwned?.();
            await confinePath(workspace.projectPath, filename);
            if (!sameFile(await readFileSnapshot(workspace.gitRoot!, relative), existing)) throw new Error(`Legacy trace ${projectRelative} changed while saving; user content was preserved.`);
            await fs.rename(temporary, filename);
        } finally { await fs.rm(temporary, { force: true }); }
    } else {
        await options.assertOwned?.();
        await fs.writeFile(filename, body, { flag: 'wx' });
    }
    journal.legacyTrace = projectRelative; journal.legacyTraceHash = createHash('sha256').update(body).digest('hex');
}
/** Place durable, redacted diagnostics beside the task source. @private */
async function trace(workspace: Workspace, journal: RunJournal, outcome: string, options: RunOptions, result: RunResult): Promise<string> {
    const safeId = journal.taskId.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100);
    const directory = await confinePath(workspace.projectPath, path.join(path.dirname(journal.task.source.path), 'traces', safeId));
    await fs.mkdir(directory, { recursive: true });
    const filename = await confinePath(workspace.projectPath, path.join(directory, `${journal.occurrenceId}.md`));
    const body = `# ${journal.task.title}\n\nTask: ${journal.taskId}\nOccurrence: ${journal.occurrenceId}\nRun/journal: ${journal.id}\nRuntime journal: .promptbook/ptbk-coder/journals/${journal.id}.json\nRecord: finalization boundary; the referenced journal contains the authoritative final result and completion commit IDs\nCompletion commit: pending at this boundary; proven Git trailers are Ptbk-Journal: ${journal.id} and Ptbk-Phase: completion\nSource: ${journal.task.source.relativePath}; ${journal.task.source.sectionIndex >= 0 ? `section ${journal.task.source.sectionIndex + 1}` : 'synthetic check repair'}\nSource snapshot SHA-256: ${journal.sourceSnapshot?.revision ?? 'not recorded'}\nPayload SHA-256: ${journal.sourceSnapshot?.payloadHash ?? createHash('sha256').update(journal.task.payload).digest('hex')}\nInitial Git HEAD: ${journal.sourceSnapshot?.gitHead ?? 'unborn or not recorded'}\nOutcome: ${outcome}\nAgent: ${journal.agent ?? 'not invoked'}\nAgent instructions SHA-256: ${journal.agentInstructionsHash ?? 'not recorded'}\nHarness: ${journal.harness ?? 'not invoked'}\nModel: ${journal.effectiveModel ?? journal.model ?? 'provider native (not reported)'}\nThinking: ${journal.thinkingLevel ?? 'adapter default (not reported)'}\nAuthentication: ${journal.authentication ?? 'unknown'}\nSession: ${journal.sessionId ?? 'not reported'}\nUsage: ${journal.usage ? JSON.stringify(journal.usage) : 'not reported'}\nGit identity: ${journal.identity ? `${journal.identity.name} <${journal.identity.email}> (${journal.identity.source}; signing ${journal.identity.signing ? 'enabled' : 'disabled'})` : 'no automatic commits'}\nCheck command: ${journal.checkCommand ?? 'not configured'}\nChecks: ${journal.checks ?? 'skipped'}\nAttempts: ${journal.attempts}\nCommits before finalization: ${journal.commits.join(', ') || 'none'}\nStarted: ${new Date(journal.startedAt).toISOString()}\nUpdated: ${new Date((options.now ?? Date.now)()).toISOString()}\n\n## Provider attempts and technical retries\n\n\`\`\`json\n${JSON.stringify(journal.attemptHistory ?? [], null, 2)}\n\`\`\`\n\n${journal.output ?? ''}\n`;
    const redactedBody = redactSecrets(body, options.redactProjectPath ?? workspace.projectPath);
    await legacyTrace(workspace, journal, redactedBody, options, result);
    await fs.writeFile(filename, redactedBody, { flag: 'wx' }); journal.trace = path.relative(workspace.projectPath, filename); return filename;
}
/** Publish completion only after mandatory phases and a verified scoped completion commit. @private */
async function complete(workspace: Workspace, journal: RunJournal, ledger: Ledger, options: RunOptions, result: RunResult): Promise<void> {
    await options.assertOwned?.();
    const baseline = await captureSnapshot(workspace.gitRoot!);
    await assertSource(journal.task);
    const previousTask = journal.task;
    let completionSource: GitSnapshot | undefined;
    try {
        if (!journal.task.repeat && journal.task.source.sectionIndex >= 0) journal.task = await updateTaskStatus(journal.task, 'done');
        completionSource = await captureSnapshot(workspace.gitRoot!);
        journal.baseline = baseline; journal.expected = completionSource; journal.pendingPhase = 'completion';
        await boundary(workspace, journal, 'completion-ready', options);
        await trace(workspace, journal, options.noCommit ? 'implementation/check phases finished; local finalization pending in uncommitted mode' : 'implementation/check phases finished; local completion persistence pending', options, result);
        await boundary(workspace, journal, 'completion-ready', options);
        await persist(workspace, journal, baseline, `feat: Complete ${journal.task.title}`, 'completion', options, result);
    }
    catch (error) {
        // A failed commit must not leave a live done marker. Preserve the candidate in the journal.
        const name = path.relative(workspace.gitRoot!, previousTask.source.path).split(path.sep).join('/');
        const current = await captureSnapshot(workspace.gitRoot!);
        if (completionSource && sameFile(current.files[name], completionSource.files[name])) await writeFileSnapshot(workspace.gitRoot!, name, baseline.files[name]);
        journal.task = previousTask;
        throw error;
    }
    await recordCompletion(workspace, journal, ledger, options, result);
    if (options.autoPush) {
        try { await git(workspace.gitRoot!, ['push']); emit(result, options, 'push', 'Remote synchronization succeeded.', journal.task); }
        catch (error) { journal.syncPending = true; result.syncPending = true; result.exitCode = 1; await writeJournal(workspace, journal); emit(result, options, 'sync-pending', `Local completion is preserved; push failed: ${(error as Error).message}`, journal.task); }
    }
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
    emit(result, options, 'completed', options.noCommit ? 'Completed, uncommitted.' : 'Completed locally.', journal.task, { occurrenceId: journal.occurrenceId });
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
    await writeJournal(workspace, journal);
    result.failed++; result.exitCode = options.signal?.aborted ? 130 : 1;
    emit(result, options, 'error', `Task ${journal.taskId} requires recovery: ${message}. Work and ownership snapshots were preserved. Use ptbk recover ${JSON.stringify(journal.taskId)}.`, journal.task);
}
/** Execute and validate one claimed task with a central three-attempt repair budget. @private */
async function execute(workspace: Workspace, journal: RunJournal, ledger: Ledger, options: RunOptions, result: RunResult, initialFeedback?: string, resumeReady = false): Promise<void> {
    try {
        let feedback = initialFeedback;
        await options.assertOwned?.();
        if (!resumeReady && !journal.task.repeat && journal.task.source.sectionIndex >= 0 && journal.task.status !== 'in-progress') journal.task = await updateTaskStatus(journal.task, 'in-progress');
        for (let attempt = journal.attempts + (resumeReady ? 0 : 1); attempt <= 3; attempt++) {
            if (!resumeReady) {
                journal.attempts = attempt;
                const baseline = attempt === 1 ? journal.baseline : await captureSnapshot(workspace.gitRoot!);
                const response = await infer(workspace, journal, options, result, feedback);
                if (response.outcome !== 'success') throw new Error(`Harness ${response.outcome} (exit ${response.exitCode}): ${redactSecrets(response.output, options.redactProjectPath)}${response.outcome === 'authentication' ? ' Authenticate the selected provider before retrying.' : ''}`);
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
                await persist(workspace, journal, baseline, `feat: Implement ${journal.task.title} (incomplete)`, 'implementation', options, result);
            }
            resumeReady = false;
            if (!options.check) { journal.checks = 'skipped'; emit(result, options, 'checks-skipped', 'Checks skipped; no validation command was selected.', journal.task); await complete(workspace, journal, ledger, options, result); return; }
            const check = await checkPhase(workspace, journal, options.check, options, result);
            if (check.outcome === 'passed') { await complete(workspace, journal, ledger, options, result); return; }
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
    for (const task of await discoverTasks(workspace)) {
        const eligibility = evaluateEligibility(task, { now: (options.now ?? Date.now)(), timezone: workspace.timezone, harness: options.harness, model: options.model, agent: options.agent, minPriority: options.minPriority, maxPriority: options.maxPriority }, ledger.tasks[task.id]);
        emit(result, options, eligibility.kind, `${task.title}: ${eligibility.reason}`, task, { dueSlot: eligibility.dueSlot });
        if (eligibility.nextWakeUp !== undefined) result.nextWakeUp = Math.min(result.nextWakeUp ?? Infinity, eligibility.nextWakeUp);
        if (eligibility.kind !== 'ready') result.skipped++;
    }
    return result;
}
/** Run the finite eligible queue; each recurring definition is claimed at most once. @private */
export async function runQueue(workspace: Workspace, options: RunOptions = {}): Promise<RunResult> {
    options = { ...options, redactProjectPath: workspace.projectPath };
    if ((options.checkBefore ?? 'no') !== 'no') options.check ??= 'npm run check';
    validateRunOptions(options); const result = report();
    if (options.dryRun) return preview(workspace, options, result);
    await ensureGit(workspace);
    await loadProjectSecrets(workspace.projectPath);
    const lease = await acquireLease(workspace);
    options.assertOwned = () => lease.assertOwned();
    try {
        const seen = new Set<string>(); let lastStart: number | undefined;
        if (options.gitChanges === 'continue') {
            if (options.limit === 0) return result;
            const candidates = await listRecovery(workspace);
            // resumeOne validates the exact candidate count before mutating anything.
            lastStart = (options.now ?? Date.now)();
            await resumeOne(workspace, options, result, lease);
            if (result.failed || result.syncPending || options.signal?.aborted || options.shouldStop?.() || result.completed >= (options.limit ?? Infinity)) return result;
            seen.add(candidates[0]!.taskId);
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
        if (options.autoPull) { if (original.dirtyPaths.length) throw new Error('Auto-pull requires a clean checkout; no automatic stash is performed.'); await git(workspace.gitRoot!, ['pull', '--rebase']); }
        if ((options.checkBefore ?? 'no') !== 'no') {
            const queueCompletions = result.completed;
            const fixed = await fixOwned(workspace, { ...options, check: options.check ?? 'npm run check' }, result, original.dirtyPaths, lease, options.checkBefore === 'yes-and-fix');
            result.completed = queueCompletions;
            if (!fixed) return result;
        }
        while (!options.signal?.aborted && !options.shouldStop?.() && result.completed < (options.limit ?? Infinity)) {
            await wait(0, options);
            if (options.shouldStop?.() || options.signal?.aborted) break;
            await lease.assertOwned();
            const ledger = await readLedger(workspace); const tasks = await discoverTasks(workspace);
            let selected: TaskDefinition | undefined; let dueSlot: number | undefined;
            for (const task of tasks) {
                if (seen.has(task.id)) continue;
                const initialEligibility = evaluateEligibility(task, { now: (options.now ?? Date.now)(), timezone: workspace.timezone, harness: options.harness, model: options.model, agent: options.agent ?? task.agent, minPriority: options.minPriority, maxPriority: options.maxPriority }, ledger.tasks[task.id]);
                const needsRole = ['ready', 'filtered'].includes(initialEligibility.kind) && task.priority >= (options.minPriority ?? 0) && task.priority <= (options.maxPriority ?? Infinity);
                const eligibility = needsRole ? evaluateEligibility(task, await selectionContext(workspace, task, options), ledger.tasks[task.id]) : initialEligibility;
                if (eligibility.kind === 'ready') {
                    if (!(options.harness ?? task.harness)) { emit(result, options, 'blocked', `${task.title}: no configured harness; use --harness.`, task); seen.add(task.id); result.skipped++; continue; }
                    selected = task; dueSlot = eligibility.dueSlot; break;
                }
                seen.add(task.id); result.skipped++; emit(result, options, eligibility.kind, `${task.title}: ${eligibility.reason}`, task);
                if (eligibility.nextWakeUp !== undefined) result.nextWakeUp = Math.min(result.nextWakeUp ?? Infinity, eligibility.nextWakeUp);
            }
            if (!selected) break;
            seen.add(selected.id);
            const sourcePath = path.relative(workspace.gitRoot!, selected.source.path).split(path.sep).join('/');
            if (original.dirtyPaths.includes(sourcePath)) { result.skipped++; emit(result, options, 'blocked', `Task source ${sourcePath} contains pre-existing user changes. Commit the source before coder changes its status.`, selected); continue; }
            if (options.noAuto && (!options.confirm || !await options.confirm('task', `Execute ${selected.title}?`))) { result.skipped++; continue; }
            if (lastStart !== undefined) await wait(Math.max(0, (options.waitBetweenPrompts ?? 0) - ((options.now ?? Date.now)() - lastStart)), options);
            if (options.shouldStop?.() || options.signal?.aborted) break;
            lastStart = (options.now ?? Date.now)();
            await announceIdentity(workspace, options, result);
            await assertSource(selected);
            const baseline = await captureSnapshot(workspace.gitRoot!);
            const journal = await claim(workspace, selected, ledger, baseline, original.dirtyPaths, dueSlot ?? lastStart, options);
            emit(result, options, 'claimed', `Claimed ${selected.title}.`, selected, { occurrenceId: journal.occurrenceId });
            if (options.isolate) await executeIsolated(workspace, journal, ledger, options, result);
            else await execute(workspace, journal, ledger, options, result);
            if (result.failed || result.syncPending) break;
            await wait(options.waitAfterPrompt ?? 0, options);
            if (options.autoPull && !options.shouldStop?.()) await git(workspace.gitRoot!, ['pull', '--rebase']);
        }
        if (options.signal?.aborted) result.exitCode = 130;
        if (options.noCommit) result.retainedPaths = await changedPaths(original);
        emit(result, options, 'queue-finished', result.nextWakeUp ? `Finite run finished; next scheduled work is due ${new Date(result.nextWakeUp).toISOString()}.` : 'Finite queue finished.');
        return result;
    } finally { await lease.release(); }
}
/** A synthetic repair stays outside the normal backlog and uses the same execution phases. @private */
function repairTask(workspace: Workspace, command: string, output: string): TaskDefinition {
    return { id: `check-repair-${randomUUID()}`, title: 'Repair project checks', payload: `Repair the failing project validation.\nCommand: ${command}\n\n${output}`, rules: ['Preserve assertions, thresholds and validation coverage.'], status: 'todo', priority: 0, runners: [], scheduleRevision: 'check-repair', diagnostics: [], source: { format: 'book', path: path.join(workspace.projectPath, 'package.json'), relativePath: 'package.json', sectionIndex: -1, revision: '' } };
}
/** Validate first; prepare a provider and Book only if real validation requires repair. @private */
async function fixOwned(workspace: Workspace, options: RunOptions, result: RunResult, protectedPaths: string[], lease: WorkspaceLease, allowRepair = true): Promise<boolean> {
    await lease.assertOwned();
    const baseline = await captureSnapshot(workspace.gitRoot!); const command = options.check ?? 'npm run check';
    const check = await runCheck(workspace, command, { signal: options.signal, protectedPaths, preserveView: options.preserveLogs, onOutput: options.onOutput, assertOwned: options.assertOwned });
    const task = repairTask(workspace, command, check.output);
    const repairNeeded = check.outcome === 'failed' && allowRepair;
    const repairApproved = repairNeeded && (!options.noAuto || Boolean(options.confirm && await options.confirm('task', `Execute ${task.title}?`)));
    if (check.changedPaths.length || repairApproved) await announceIdentity(workspace, options, result);
    const bytes = await fs.readFile(task.source.path).catch(() => Buffer.from(''));
    task.source.revision = createHash('sha256').update(bytes).digest('hex');
    const ledger = await readLedger(workspace);
    const now = (options.now ?? Date.now)();
    // Healthy checks and declined repairs retain persistence intent without claiming an agent task.
    const journal: RunJournal = repairApproved ? await claim(workspace, task, ledger, baseline, protectedPaths, now, options) : {
        version: 1, id: randomUUID(), taskId: task.id, occurrenceId: randomUUID(), task, phase: 'checking',
        startedAt: now, updatedAt: now, dueSlot: now, baseline, protectedPaths, commits: [], attempts: 0, identity: options.identity,
    };
    journal.checkCommand = command; journal.checks = check.outcome; journal.output = retainedOutput(check.output);
    await persist(workspace, journal, baseline, 'chore: Automatically commit changes made by checks', 'check', options, result);
    emit(result, options, 'check-result', `Initial checks ${check.outcome} (exit ${check.exitCode}).`);
    if (check.outcome === 'passed') {
        await boundary(workspace, journal, 'completed', options); delete ledger.tasks[task.id]; await saveLedger(workspace, ledger); return true;
    }
    if (!repairApproved) {
        journal.phase = 'failed'; journal.error = `Initial checks ${check.outcome}.`; delete ledger.tasks[task.id]; await writeJournal(workspace, journal); await saveLedger(workspace, ledger); result.failed++; result.exitCode = check.outcome === 'cancelled' ? 130 : 1; return false;
    }
    // Synthetic repair reads its source revision but never edits its STATUS.
    await execute(workspace, journal, ledger, { ...options, check: command }, result, `Command: ${command}\n${check.output}`);
    return result.failed === 0;
}
/** Execute only checks and, if necessary, one bounded shared repair task. @private */
export async function fixChecks(workspace: Workspace, options: RunOptions = {}): Promise<RunResult> {
    options = { ...options, redactProjectPath: workspace.projectPath };
    validateRunOptions(options, true); const result = report();
    if (options.dryRun) { emit(result, options, 'dry-run', `Would run ${options.check ?? 'npm run check'} and repair only if it fails.`); return result; }
    await ensureGit(workspace); await loadProjectSecrets(workspace.projectPath); const lease = await acquireLease(workspace); options.assertOwned = () => lease.assertOwned();
    try {
        if ((await listRecovery(workspace)).length) throw new Error('Interrupted work requires explicit recovery before a new fix task. Use ptbk recover.');
        const baseline = await initialBoundary(workspace, options); await fixOwned(workspace, options, result, baseline.dirtyPaths, lease); return result;
    }
    finally { await lease.release(); }
}
/** Map every selected path into an isolated checkout while keeping shared claims in the origin. @private */
async function executeIsolated(workspace: Workspace, journal: RunJournal, ledger: Ledger, options: RunOptions, result: RunResult): Promise<void> {
    const root = workspace.gitRoot!; const origin = await captureSnapshot(root);
    let view: string | undefined;
    try {
        const branch = (await git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).trim();
        if (!branch || !origin.head) throw new Error('Isolation requires a named branch with an initial commit.');
        if (origin.dirtyPaths.length) throw new Error('Isolation requires a clean origin checkout.');
        const directory = path.join(root, '.promptbook', 'coder-isolation-worktrees');
        const ignored = await git(root, ['check-ignore', directory], { allowFailure: true });
        if (!ignored.trim()) throw new Error('Ignore .promptbook/coder-isolation-worktrees/ before using --isolate.');
        await fs.mkdir(directory, { recursive: true }); view = path.join(directory, journal.id);
        const isolationBranch = `ptbk-coder-isolation/${journal.taskId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50)}-${journal.id.slice(0, 8)}`;
        await git(root, ['worktree', 'add', '-b', isolationBranch, view, origin.head]);
        const map = (filename: string) => path.join(view!, path.relative(root, filename));
        const isolated: Workspace = { ...workspace, projectPath: map(workspace.projectPath), gitRoot: view, tasksPath: map(workspace.tasksPath), legacyPath: map(workspace.legacyPath) };
        // Preserve ignored dependencies and project secrets in the execution checkout without committing them.
        for (const name of ['node_modules', '.env']) {
            const original = path.join(workspace.projectPath, name);
            try { await fs.cp(original, path.join(isolated.projectPath, name), { recursive: true, dereference: false }); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
        const sourceTask = (await discoverTasks(isolated)).find((task) => task.id === journal.taskId);
        if (!sourceTask) throw new Error('Task source could not be mapped into the isolation worktree.');
        journal.task = sourceTask; journal.baseline = await captureSnapshot(view); journal.protectedPaths = [];
        const isolatedOptions = { ...options, isolate: false, autoPush: false, agent: options.agent ? /^https:/.test(options.agent) ? options.agent : map(await resolveAgent(workspace, options.agent)) : undefined };
        const beforeCompleted = result.completed;
        await execute(isolated, journal, ledger, isolatedOptions, result);
        if (result.completed === beforeCompleted) return;
        // Completion in the isolated checkout is provisional until verified fast-forward integration.
        result.completed--;
        await assertSnapshot(origin);
        await git(root, ['merge', '--ff-only', isolationBranch]);
        result.completed++;
        emit(result, options, 'integrated', `Integrated ${isolationBranch} into ${branch}.`, journal.task);
        await git(root, ['worktree', 'remove', view]); view = undefined;
        if (options.autoPush) {
            try { await git(root, ['push']); }
            catch (error) { result.syncPending = true; result.exitCode = 1; journal.syncPending = true; await writeJournal(workspace, journal); emit(result, options, 'sync-pending', `Integration completed locally; push failed: ${(error as Error).message}`, journal.task); }
        }
    } catch (error) {
        await failOccurrence(workspace, journal, ledger, new Error(`${(error as Error).message}${view ? ` Isolation checkout ${view} and its branch were retained.` : ''}`), options, result);
    }
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
        const object = (await git(workspace.gitRoot!, ['hash-object', `--path=${name}`, '--stdin'], { input: Buffer.from(expected.content, 'base64') })).trim();
        const mode = expected.kind === 'symlink' ? '120000' : expected.mode & 0o111 ? '100755' : '100644';
        if (!actual || actual.object !== object || actual.mode !== mode) throw new Error(`Committed ${name} differs from the captured intent; a hook or editor changed it. Completion remains pending.`);
    }
    const liveChanges = await changedPaths(journal.expected, current);
    const source = path.relative(workspace.gitRoot!, journal.task.source.path).split(path.sep).join('/');
    const rolledBackCompletion = journal.pendingPhase === 'completion' && liveChanges.length === 1 && liveChanges[0] === source && sameFile(current.files[source], journal.baseline.files[source]);
    if (liveChanges.length && !rolledBackCompletion) throw new Error('Committed intent has unexpected live content; inspect the preserved snapshots before recovery.');
    // A crash can precede real-index alignment. Compare foreign entries before repairing only own entries.
    const foreignEntries = (index: string) => index.split('\0').filter((item) => item && !paths.includes(item.slice(item.indexOf('\t') + 1))).sort().join('\0');
    if (foreignEntries(current.index) !== foreignEntries(journal.baseline.index)) throw new Error('Foreign staged entries changed after commit intent; index recovery was refused.');
    const foreignFlags = (flags: string) => flags.split('\0').filter((item) => item && !paths.includes(item.slice(2))).sort().join('\0');
    if (foreignFlags(current.indexFlags) !== foreignFlags(journal.baseline.indexFlags)) throw new Error('Foreign index flags changed after commit intent; recovery was refused.');
    if (rolledBackCompletion) await writeFileSnapshot(workspace.gitRoot!, source, journal.expected.files[source]);
    await alignOwnedIndex(workspace.gitRoot!, paths);
    const commit = current.head!;
    if (!journal.commits.includes(commit)) journal.commits.push(commit);
    journal.baseline = await captureSnapshot(workspace.gitRoot!); journal.expected = journal.baseline; delete journal.pendingPhase; await writeJournal(workspace, journal); return true;
}
/** Resume only a proved successful implementation or finalization, never uncertain model execution. @private */
async function resumeOne(workspace: Workspace, options: RunOptions, result: RunResult, lease: WorkspaceLease, selectedId?: string): Promise<RunResult> {
    await lease.assertOwned(); const candidates = (await listRecovery(workspace)).filter((item) => !selectedId || item.taskId === selectedId);
    if (candidates.length !== 1) throw new Error(`Continue requires exactly one proven interrupted task; found ${candidates.length}. Inspect ptbk recover.`);
    const journal = candidates[0]!; const ledger = await readLedger(workspace);
    await announceIdentity(workspace, options, result);
    options = { ...options, harness: options.harness ?? journal.harness, model: options.model ?? journal.model, thinkingLevel: options.thinkingLevel ?? journal.thinkingLevel };
    journal.identity ??= options.identity;
    const phase = journal.pendingPhase;
    const reconciled = await reconcileIntent(workspace, journal);
    if (phase === 'completion' && reconciled) { await recordCompletion(workspace, journal, ledger, options, result); result.commits.push(...journal.commits); return result; }
    if (journal.phase === 'completion-ready' && !journal.pendingPhase && journal.expected) {
        await assertSnapshot(journal.expected);
        const message = await git(workspace.gitRoot!, ['log', '-1', '--format=%B']);
        if (!message.includes(`Ptbk-Journal: ${journal.id}`) || !message.includes('Ptbk-Phase: completion')) throw new Error('Completed persistence cannot be reconciled with Git history; no model was repeated.');
        await recordCompletion(workspace, journal, ledger, options, result); return result;
    }
    if (phase === 'completion' && journal.expected) {
        // A failed completion commit restored the live in-progress marker; only that exact rollback is accepted.
        const current = await assertSnapshot(journal.baseline, { content: false });
        const source = path.relative(workspace.gitRoot!, journal.task.source.path).split(path.sep).join('/');
        const changes = await changedPaths(journal.expected, current);
        if (changes.some((name) => name !== source) || !sameFile(current.files[source], journal.baseline.files[source])) throw new Error('Completion rollback differs from its proven snapshot; inspect source and trace before recovery.');
        await writeFileSnapshot(workspace.gitRoot!, source, journal.expected.files[source]);
        const task = (await discoverTasks(workspace)).find((item) => item.id === journal.taskId);
        if (task) journal.task = task;
        if (!journal.trace) await trace(workspace, journal, options.noCommit ? 'implementation/check phases finished; local finalization pending in uncommitted mode' : 'implementation/check phases finished; local completion persistence pending', options, result);
        await persist(workspace, journal, journal.baseline, `feat: Complete ${journal.task.title}`, 'completion', options, result);
        await recordCompletion(workspace, journal, ledger, options, result); return result;
    }
    if (!journal.expected || !['implementation', 'check'].includes(phase ?? '') && journal.phase !== 'implementation-ready') throw new Error('The previous model/check outcome is uncertain. Resume cannot replay it safely; use explicit retry after reviewing its effects.');
    await assertSnapshot(journal.expected);
    if (!reconciled && phase) await persist(workspace, journal, journal.baseline, phase === 'check' ? 'chore: Automatically commit changes made by checks' : `feat: Implement ${journal.task.title} (incomplete)`, phase, options, result);
    else if (!phase && (await changedPaths(journal.baseline, journal.expected)).length) await persist(workspace, journal, journal.baseline, `feat: Implement ${journal.task.title} (incomplete)`, 'implementation', options, result);
    await execute(workspace, journal, ledger, { ...options, check: options.check ?? journal.checkCommand }, result, undefined, true);
    return result;
}
/** Retry only explicitly requested remote synchronization, preserving all local completion. @private */
async function retryPendingSync(workspace: Workspace, options: RunOptions, result: RunResult, candidates?: RunJournal[]): Promise<boolean> {
    const pending = candidates ?? (await readJournals(workspace)).filter((journal) => journal.phase === 'completed' && journal.syncPending);
    if (!pending.length) return true;
    await options.assertOwned?.();
    try {
        await git(workspace.gitRoot!, ['push']);
        for (const journal of pending) { delete journal.syncPending; await writeJournal(workspace, journal); }
        emit(result, options, 'push', 'Previously completed local work is now synchronized; no model was called.'); return true;
    } catch (error) { result.syncPending = true; result.exitCode = 1; emit(result, options, 'sync-pending', `Local completion remains preserved; remote synchronization failed: ${(error as Error).message}`); return false; }
}
/** Explicit recovery inspection and acknowledged actions; inspection/dry-run are strictly read-only. @private */
export async function recoverTask(workspace: Workspace, taskId: string, recovery: { action?: 'resume' | 'retry' | 'acknowledge'; occurrence?: string; dryRun?: boolean } = {}, options: RunOptions = {}): Promise<RunResult & { journals: RunJournal[]; plan: string }> {
    options = { ...options, redactProjectPath: workspace.projectPath };
    const journals = (await readJournals(workspace)).filter((journal) => journal.taskId === taskId && (!recovery.occurrence || journal.occurrenceId === recovery.occurrence));
    if (!journals.length) throw new Error(`No recorded occurrence for ${taskId}.`);
    const selected = journals.filter((journal) => journal.phase !== 'completed' && journal.phase !== 'failed' || journal.syncPending);
    const plan = recovery.action ? `${recovery.action} ${taskId}: ${selected.length} interrupted occurrence(s); external effects must already have been reviewed before explicit retry.` : journals.map((journal) => `${journal.occurrenceId}: ${journal.phase}${journal.syncPending ? ' (remote synchronization pending)' : ''}${journal.error ? ` — ${journal.error}` : ''}`).join('\n');
    const result = report();
    if (!recovery.action || recovery.dryRun) return { ...result, journals, plan };
    if (selected.length !== 1) throw new Error(`Recovery action requires one interrupted occurrence; found ${selected.length}. Select --occurrence.`);
    await ensureGit(workspace); await loadProjectSecrets(workspace.projectPath); const lease = await acquireLease(workspace, { recoverStale: true }); options.assertOwned = () => lease.assertOwned();
    try {
        const journal = selected[0]!; const ledger = await readLedger(workspace);
        if (journal.phase === 'completed' && journal.syncPending) {
            if (recovery.action !== 'resume') throw new Error('This task already completed locally. Use --action resume to retry only remote synchronization.');
            await retryPendingSync(workspace, options, result, [journal]); return { ...result, journals: await readJournals(workspace), plan };
        }
        if (recovery.action === 'retry' && options.noAuto && (!options.confirm || !await options.confirm('task', `Retry ${journal.task.title}?`))) {
            result.skipped++;
            emit(result, options, 'skipped', 'Retry declined; the recorded occurrence and recovery state were preserved.', journal.task);
            return { ...result, journals: await readJournals(workspace), plan };
        }
        if (recovery.action !== 'acknowledge') { await announceIdentity(workspace, options, result); journal.identity ??= options.identity; }
        if (recovery.action === 'resume') await resumeOne(workspace, { ...options, gitChanges: 'continue' }, result, lease, taskId);
        else if (recovery.action === 'acknowledge') {
            const entry = ledger.tasks[taskId];
            if (entry) { delete entry.claim; delete entry.blocked; entry.lastConsumedSlot = journal.dueSlot; if (journal.task.repeat) entry.nextDue = journal.dueSlot + journal.task.repeat; const history = entry.history.find((item) => item.id === journal.occurrenceId); if (history) { history.outcome = 'acknowledged-failure'; history.finishedAt = (options.now ?? Date.now)(); } }
            journal.phase = 'failed'; await saveLedger(workspace, ledger); await writeJournal(workspace, journal); emit(result, options, 'acknowledged', 'Recorded an acknowledged failure; it is not a successful completion.', journal.task);
        } else {
            if (journal.expected) await assertSnapshot(journal.expected);
            else await assertSnapshot(journal.baseline);
            const task = (await discoverTasks(workspace)).find((item) => item.id === taskId);
            if (!task && journal.task.source.sectionIndex >= 0) throw new Error('Task source is missing or changed; retry cannot claim it.');
            if (task) journal.task = task;
            journal.attempts = 0; delete journal.error; delete journal.pendingPhase;
            if (ledger.tasks[taskId]) delete ledger.tasks[taskId]!.blocked;
            await saveLedger(workspace, ledger); await execute(workspace, journal, ledger, options, result);
        }
        return { ...result, journals: await readJournals(workspace), plan };
    } finally { await lease.release(); }
}
