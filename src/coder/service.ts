import { identifyRuntime } from './agent-identity.js';
import { createServer as createSocketServer, connect, type Socket } from 'node:net';
import { spawn } from 'node:child_process';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, open, chmod, stat, lstat, rename, rmdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { hostname, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import QRCode from 'qrcode';
import type { Workspace, TaskDefinition, EligibilityResult, OccurrenceState } from './domain.js';
import { atomicWrite, acquireLease, readLedger, listRecovery, processBirth, type WorkspaceLease } from './state.js';
import { replaceFileWithRetry, type FileReplacementOptions } from './file-replacement.js';
import { runQueue, recoverTask, validateRunOptions, type RunOptions, type RunResult, type EngineEvent } from './engine.js';
import { discoverTasks, serializeTaskBook, assignTaskId, updateTaskControls, checksum, assertConfined } from './sources.js';
import { evaluateEligibility } from './schedule.js';
import { captureSnapshot, commitScoped, changedPaths, protectUnrelatedChanges, uncommittedOwnership, type UncommittedOwnership } from './git.js';
import { confinePath, InputError, readContext, resolveAgentSelection } from './workspace.js';
import { discoverAgents, prepareAgent, ensureCoreAgents } from './agents.js';
import { inspectHarnesses, maintainHarnesses, type HarnessInventory, type HarnessMaintenanceResult } from './setup.js';
import { getHarness, HARNESS_REGISTRY, loadProjectSecrets, redactSecrets } from './harness.js';
import { createRequest, listRequests, answerRequest } from './requests.js';
import { installStartup, disableStartup, type StartupPaths } from './persistence.js';
import { createTerminal } from './terminal.js';
import { ProjectBrowser, browserTools } from './browser.js';
import { installedEngineVersion } from './version.js';
import { reportDiagnostic } from './diagnostics.js';
import { openDashboard } from './dashboard-server.js';
import { validateTunnelOptions, type TunnelOptions } from './tunnel.js';

/** Shared protected dashboard entry point. @private */
export { openDashboard } from './dashboard-server.js';
import { editTaskFromTerminal } from './edit-task-control.js';
import { captureServiceEnvironment } from './service-environment.js';
import { readProjectConfiguration } from './configuration.js';
import { connectionDetails } from './status-view.js';

/** Supervisor settings supplement finite options without changing task authority. @private */
export interface ServiceOptions extends RunOptions, TunnelOptions {
    mode?: 'daemon' | 'raw' | 'interactive'; noPersist?: boolean; noServer?: boolean; noQr?: boolean; port?: number;
    browserMode?: 'headless' | 'headful'; browserProfile?: string; enabledHarnesses?: string[]; autoUpdateHarnesses?: boolean;
    configurationSources?: Record<string, string>;
    harnessSettings?: Record<string, { model?: string; thinkingLevel?: string; apiKeyEnv?: string; configurationPath?: string }>;
    automatic?: boolean; onReady?: (record: ServiceRecord) => void; quiet?: boolean;
    inspectHarnesses?: typeof inspectHarnesses;
}
/** A versioned process record is verified through its authenticated local control endpoint. @private */
export interface ServiceRecord {
    version: 1; engineVersion: string; id: string; pid: number; ownerId?: string; project: string; installation: string; node: string; endpoint: string; token: string;
    mode: 'daemon' | 'raw' | 'interactive'; desired: 'running' | 'stopped'; startedAt: number; updatedAt: number;
    url?: string; persistent: boolean; settings: ServiceOptions; status: string; error?: string; diagnostic?: string; nextAction?: string;
}
/** One shared control model drives terminal, socket CLI and localhost HTTP. @private */
export interface RuntimeControl {
    snapshot(): Promise<Record<string, unknown>>;
    command(action: string, input?: Record<string, unknown>): Promise<unknown>;
    token: string;
}
/**
 * Save an optimistic dashboard edit while rechecking source and writer ownership before each replacement attempt.
 * @private Internal shared service control operation.
 */
export async function saveTaskEdit(workspace: Workspace, sourcePath: string, previous: Buffer, content: string,
    lease: Pick<WorkspaceLease, 'assertOwned'>, replacementOptions: FileReplacementOptions = {}): Promise<void> {
    await assertConfined(sourcePath, workspace.projectPath);
    const attributes = await lstat(sourcePath);
    if (!attributes.isFile()) throw new Error('Task editing requires an ordinary project-local source file.');
    const temporary = `${sourcePath}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, content, { flag: 'wx', mode: attributes.mode });
        await replaceFileWithRetry(temporary, sourcePath, async () => {
            await lease.assertOwned();
            await assertConfined(sourcePath, workspace.projectPath);
            if (!(await lstat(sourcePath)).isFile()) throw new Error('Task editing requires an ordinary project-local source file.');
            if (!(await readFile(sourcePath)).equals(previous)) throw new Error('Source changed while saving; reload before editing.');
        }, replacementOptions);
    } finally {
        await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; });
    }
}
/** Settings that require process restart are identified before applying them. */
const STARTUP_SETTINGS = new Set(['mode', 'port', 'noServer', 'noPersist', 'noTunnel', 'tunnelProvider']);
/** Adjustable finite behavior remains discoverable through every shared control snapshot. */
const LIVE_SETTINGS = new Set(['harness', 'model', 'thinkingLevel', 'agent', 'context', 'enabledHarnesses', 'harnessSettings', 'browserMode', 'browserProfile', 'autoUpdateHarnesses', 'check', 'checkBefore', 'gitChanges', 'autoPull', 'autoPush', 'isolate', 'normalizeLineEndings', 'noQuestions', 'allowCredits', 'preserveLogs', 'waitBetweenPrompts', 'waitAfterPrompt', 'waitAfterError', 'minPriority', 'maxPriority']);

/** Strip functions/signals and private callbacks before persisting restart configuration. */
function serialSettings(options: ServiceOptions): ServiceOptions {
    return JSON.parse(JSON.stringify(options, (key, value) => ['quiet', 'ownedChanges'].includes(key) || typeof value === 'function' || value instanceof AbortSignal ? undefined : value)) as ServiceOptions;
}
/** Load pending ownership only for explicit uncommitted continuation; committed mode never adopts it. */
async function readOwnedChanges(workspace: Workspace, noCommit?: boolean): Promise<UncommittedOwnership | undefined> {
    if (!noCommit) return undefined;
    try { return JSON.parse(await readFile(await confinePath(workspace.projectPath, join(workspace.statePath, 'uncommitted.json')), 'utf8')) as UncommittedOwnership; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return undefined; }
}
/** Save one system operation's pending signatures instead of claiming a commit in opt-out mode. */
async function saveSystemOperation(workspace: Workspace, options: ServiceOptions, baseline: Awaited<ReturnType<typeof captureSnapshot>>, message: string, paths: string[]): Promise<void> {
    if (!options.noCommit) { await commitScoped(baseline, message, { paths, protectedPaths: baseline.dirtyPaths }); return; }
    const current = await captureSnapshot(baseline.root);
    const changes = await changedPaths(baseline, current);
    if (changes.some(path => !paths.includes(path) || baseline.dirtyPaths.includes(path))) throw new InputError('System authoring overlaps unrelated changes; pending work was preserved.');
    options.ownedChanges = uncommittedOwnership(current, [...Object.keys(options.ownedChanges?.files ?? {}), ...changes]);
    await atomicWrite(join(workspace.statePath, 'uncommitted.json'), options.ownedChanges);
}
/** Save validated runtime choices as one versioned operation while retaining unrelated defaults. */
async function saveDefaults(workspace: Workspace, options: ServiceOptions, update: Partial<ServiceOptions>): Promise<void> {
    const lease = await acquireLease(workspace);
    try {
        const baseline = protectUnrelatedChanges(await captureSnapshot(workspace.gitRoot ?? workspace.projectPath), options.ownedChanges);
        const configuration = await readProjectConfiguration(workspace.projectPath);
        if (!configuration.exists) throw new InputError('Initialize ptbk.json before saving runtime defaults.');
        const source = Buffer.from(configuration.sourceText!, 'utf8');
        const document = structuredClone(configuration.document);
        const names: Record<string, string> = { noServer: 'server', noPersist: 'persist', normalizeLineEndings: 'normalizeLineEndings' };
        const inverted = new Set(['noServer', 'noPersist']);
        for (const [key, value] of Object.entries(update)) {
            if (key === 'browserMode' || key === 'browserProfile') { document.browser = { ...document.browser as Record<string, unknown>, [key === 'browserMode' ? 'mode' : 'profile']: value }; }
            else if (key === 'noTunnel' || key === 'tunnelProvider') { document.tunnel = { ...document.tunnel as Record<string, unknown>, [key === 'noTunnel' ? 'enabled' : 'provider']: key === 'noTunnel' ? !value : value }; }
            else if (key === 'autoUpdateHarnesses') document.updates = { harnesses: value };
            else if (key === 'enabledHarnesses' || key === 'harnessSettings') {
                const enabled = update.enabledHarnesses ?? configuration.enabledHarnesses ?? [];
                const settings = update.harnessSettings ?? configuration.harnessSettings ?? {};
                document.harnesses = Object.fromEntries([...new Set([...enabled, ...Object.keys(settings)])].map(name => [name, { ...settings[name], enabled: enabled.includes(name) }]));
            } else {
                const name = names[key] ?? key;
                for (const section of ['routing', 'execution', 'process']) { const object = document[section]; if (object && typeof object === 'object') delete (object as Record<string, unknown>)[name]; }
                document[name] = inverted.has(key) ? !value : value;
            }
        }
        if (baseline.dirtyPaths.includes(relative(baseline.root, configuration.path).split('\\').join('/'))) throw new InputError('Saved configuration overlaps existing user edits; review those edits before saving defaults.');
        await saveTaskEdit(workspace, configuration.path, source, `${JSON.stringify(document, null, 4)}\n`, lease);
        await saveSystemOperation(workspace, options, baseline, 'Update project configuration', [relative(baseline.root, configuration.path).split('\\').join('/')]);
    } finally { await lease.release(); }
}
/** Inspect and maintain only harness identities explicitly enabled for this invocation. */
function selectedHarnesses(options: ServiceOptions): string[] { return options.enabledHarnesses ?? (options.harness ? [options.harness] : []); }
/** Keep default catalog output small while retaining opt-in detail for every registered harness. */
function catalogSummary(includeMore = false): Array<Record<string, unknown>> {
    return HARNESS_REGISTRY.filter(harness => includeMore || harness.featured).map(harness => ({ id: harness.id, name: harness.name, displayName: harness.displayName, featured: harness.featured }));
}
/** Keep Unix socket names within the platform limit even for deeply nested projects. */
function socketDirectory(): string {
    const uid = process.getuid?.();
    if (uid === undefined) throw new InputError('Unix control sockets require a current-user identity.');
    const candidate = join(process.platform === 'darwin' ? '/tmp' : tmpdir(), `ptbk-${uid}`);
    return Buffer.byteLength(join(candidate, `${'x'.repeat(24)}.sock`)) < 100 ? candidate : join('/tmp', `ptbk-${uid}`);
}
/** Validate a private current-user directory before connecting, creating or removing sockets. */
async function prepareSocketDirectory(create: boolean): Promise<void> {
    if (process.platform === 'win32') return;
    const directory = socketDirectory();
    if (create) await mkdir(directory, { mode: 0o700 }).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; });
    let attributes;
    try { attributes = await lstat(directory); }
    catch (error) { if (!create && (error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (!attributes.isDirectory() || attributes.uid !== process.getuid?.() || (attributes.mode & 0o777) !== 0o700) throw new InputError(`Control socket directory must be an ordinary current-user-owned directory with mode 0700: ${directory}`);
}
/** Socket paths are project-specific; Windows named pipes do not require a Unix socket file. */
function endpoint(workspace: Workspace): string {
    const key = createHash('sha256').update(workspace.projectPath).digest('hex').slice(0, 24);
    return process.platform === 'win32' ? `\\\\.\\pipe\\ptbk-${key}` : join(socketDirectory(), `${key}.sock`);
}
/** Read a process record without starting or repairing the selected project. @private */
export async function readServiceRecord(workspace: Workspace): Promise<ServiceRecord | undefined> {
    try {
        const record = JSON.parse(await readFile(await confinePath(workspace.projectPath, join(workspace.statePath, 'process.json')), 'utf8')) as ServiceRecord;
        if (record.version !== 1 || record.project !== workspace.projectPath || !record.id || !record.token || record.endpoint !== endpoint(workspace)) throw new InputError('Invalid process record; preserved for recovery.');
        return record;
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
/** A rejected identity response cannot be accepted as a result or replayed as a mutation. */
class ServiceIdentityChangedError extends Error {
    constructor() { super('Process identity changed; no control response was trusted.'); }
}
/** Internal transport seams allow deterministic connection lifecycle verification. @private */
export interface ServiceCommandOptions {
    connect?: (endpoint: string) => Socket;
    sleep?: (milliseconds: number) => Promise<void>;
}
/** A missing reply permits inspection retries but leaves a mutation's outcome uncertain. */
class ServiceConnectionClosedError extends Error {
    /** Connection closure retains a recognizable transport error code. */
    readonly code: 'ECONNRESET' | 'EPIPE';
    /** Explain the safe next step without implying an unconfirmed control succeeded. */
    constructor(action: string, cause?: unknown) {
        super(action === 'inspect'
            ? 'Project control endpoint closed without a complete reply; read-only inspection did not complete.'
            : `Project control endpoint closed without a complete reply; the outcome of ${action} is uncertain. Inspect the project before retrying the action.`, { cause });
        this.code = (cause as NodeJS.ErrnoException | undefined)?.code === 'EPIPE' ? 'EPIPE' : 'ECONNRESET';
    }
}
/** Only interrupted transports permit a repeated read-only command. */
function isServiceConnectionClosure(error: unknown): boolean {
    return ['ECONNRESET', 'EPIPE'].includes((error as NodeJS.ErrnoException | undefined)?.code || '');
}
/** An absent listener is harmless only before command delivery has begun. */
function isServiceEndpointUnavailable(error: unknown): boolean {
    return ['ENOENT', 'ECONNREFUSED'].includes((error as NodeJS.ErrnoException | undefined)?.code || '');
}
/** Authenticate exactly one socket command using the selected immutable process record. */
async function sendServiceCommand(record: ServiceRecord, action: string, input: Record<string, unknown>, options: ServiceCommandOptions): Promise<Record<string, unknown> | undefined> {
    return new Promise((resolve, reject) => {
        const socket = (options.connect || connect)(record.endpoint);
        socket.setEncoding('utf8');
        let data = ''; let settled = false; let deliveryStarted = false;
        /** Settle the command once even when error, end and close arrive together. */
        const fail = (error: unknown) => { if (settled) return; settled = true; reject(error); };
        /** A disconnected endpoint is unavailable only when no command reply was accepted. */
        const succeed = (result: Record<string, unknown> | undefined) => { if (settled) return; settled = true; resolve(result); };
        socket.setTimeout(5000, () => { fail(new Error('Project control endpoint timed out.')); socket.destroy(); });
        socket.once('connect', () => {
            if (settled) return;
            try {
                const command = `${JSON.stringify({ token: record.token, identity: record.id, action, input })}\n`;
                deliveryStarted = true;
                socket.write(command);
            } catch (error) {
                fail(isServiceConnectionClosure(error) || deliveryStarted && isServiceEndpointUnavailable(error) ? new ServiceConnectionClosedError(action, error) : error);
                socket.destroy();
            }
        });
        socket.on('data', chunk => {
            if (settled) return;
            data += String(chunk);
            if (Buffer.byteLength(data) > 2 * 1024 * 1024) { fail(new Error('Control reply exceeds 2 MiB.')); socket.destroy(); return; }
            const newline = data.indexOf('\n');
            if (newline < 0) return;
            try {
                const reply = JSON.parse(data.slice(0, newline)) as { id: string; pid: number; error?: string; result: Record<string, unknown> };
                if (reply.id !== record.id || reply.pid !== record.pid) throw new ServiceIdentityChangedError();
                if (reply.error) fail(new InputError(reply.error)); else succeed(reply.result);
                socket.end();
            } catch (error) { fail(error); socket.destroy(); }
        });
        socket.once('error', error => {
            if (isServiceEndpointUnavailable(error) && !deliveryStarted) succeed(undefined);
            else fail(isServiceConnectionClosure(error) || isServiceEndpointUnavailable(error) ? new ServiceConnectionClosedError(action, error) : error);
        });
        /** EOF and close without a framed reply have the same ambiguous delivery semantics. */
        const closed = () => { if (settled) return; fail(new ServiceConnectionClosedError(action)); socket.destroy(); };
        socket.once('end', closed);
        socket.once('close', closed);
    });
}
/** Send bounded authenticated commands; only read-only inspection may retry closure or a recorded handover. @private */
export async function serviceCommand(workspace: Workspace, action = 'inspect', input: Record<string, unknown> = {}, expectedIdentity?: { id: string; pid: number }, options: ServiceCommandOptions = {}): Promise<Record<string, unknown> | undefined> {
    let handovers = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
        const record = await readServiceRecord(workspace);
        if (!record) return undefined;
        if (expectedIdentity && (record.id !== expectedIdentity.id || record.pid !== expectedIdentity.pid)) throw new ServiceIdentityChangedError();
        await prepareSocketDirectory(false);
        try { return await sendServiceCommand(record, action, input, options); }
        catch (error) {
            if (action !== 'inspect' || attempt >= 2) throw error;
            if (error instanceof ServiceIdentityChangedError) {
                if (expectedIdentity || handovers > 0) throw error;
                const replacement = await readServiceRecord(workspace);
                if (!replacement || replacement.id === record.id) throw error;
                handovers++;
                // Ignore the mismatched response and authenticate anew using recorded replacement credentials.
            } else if (!isServiceConnectionClosure(error)) throw error;
            await (options.sleep || delay)(50 * (attempt + 1));
        }
    }
    throw new ServiceConnectionClosedError(action);
}

/** Constant-time validation rejects unknown local tokens before control handling. */
function matchesToken(actual: unknown, expected: string): boolean {
    return typeof actual === 'string' && Buffer.byteLength(actual) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
/** Materialize engine-generated work under the same mutation lease as authoring. */
async function systemTask(workspace: Workspace, task: Partial<TaskDefinition> & Pick<TaskDefinition, 'title' | 'payload'>): Promise<TaskDefinition> {
    const id = task.id ?? randomUUID();
    const target = await confinePath(workspace.projectPath, join(workspace.tasksPath, `${new Date().toISOString().slice(0, 10)}-${id}.book`));
    const definition: TaskDefinition = { status: 'todo', priority: 0, rules: [], runners: [], diagnostics: [], scheduleRevision: '', ...task, id, source: { format: 'book', path: target, relativePath: relative(workspace.projectPath, target), sectionIndex: 0, revision: '' } };
    await mkdir(workspace.tasksPath, { recursive: true });
    await writeFile(target, serializeTaskBook(definition), { flag: 'wx' });
    return (await discoverTasks(workspace)).find(candidate => candidate.id === id)!;
}

/** A Markdown assignment is an ordinary result file, leaving the original queue source intact. */
interface MarkdownRouting {
    version: 1; taskId: string; sourcePayloadChecksum: string;
    agent: string; harness: string; model?: string; thinkingLevel?: string;
}

/** Resolve the current committed Manager result for each legacy definition. */
async function serviceTasks(workspace: Workspace): Promise<TaskDefinition[]> {
    const tasks = await discoverTasks(workspace);
    for (const task of tasks.filter((candidate) => candidate.source.format === 'markdown' && candidate.status === 'todo')) {
        const assignments = tasks.filter((candidate) => candidate.origin === `engine:assignment:${task.id}`);
        if (!assignments.length) continue;
        task.dependencies = [...(task.dependencies ?? []), ...assignments.map((candidate) => `#${candidate.id}`)];
        if (assignments.length !== 1 || assignments[0]!.status !== 'done' || assignments[0]!.diagnostics.length || assignments[0]!.relationshipDiagnostics?.length) {
            task.relationshipDiagnostics = [...(task.relationshipDiagnostics ?? []), 'Its Manager assignment requires a valid completed result.'];
            continue;
        }
        try {
            const filename = await confinePath(workspace.projectPath, join(workspace.tasksPath, 'routing', `${task.id}.json`));
            const routing = JSON.parse(await readFile(filename, 'utf8')) as MarkdownRouting;
            if (routing.version !== 1 || routing.taskId !== task.id || routing.sourcePayloadChecksum !== checksum(task.payload)
                || typeof routing.agent !== 'string' || !routing.agent.trim() || typeof routing.harness !== 'string' || !routing.harness.trim()
                || routing.model !== undefined && (typeof routing.model !== 'string' || /\s/.test(routing.model))
                || routing.thinkingLevel !== undefined && (typeof routing.thinkingLevel !== 'string' || /\s/.test(routing.thinkingLevel))) throw new Error('The Manager routing result is invalid or belongs to a changed assignment.');
            getHarness(routing.harness);
            task.agent = routing.agent.replace(/^@/, ''); task.harness = routing.harness;
            task.model = routing.model; task.thinkingLevel = routing.thinkingLevel;
        } catch (error) { task.relationshipDiagnostics = [...(task.relationshipDiagnostics ?? []), `Manager routing requires review: ${(error as Error).message}`]; }
    }
    return tasks;
}

/** Evaluate the same source, routing and authorization prerequisites in every control channel. @private */
export async function taskServiceEligibility(workspace: Workspace, task: TaskDefinition, options: ServiceOptions, inventory: HarnessInventory[], state?: OccurrenceState): Promise<EligibilityResult> {
    const selectedAgent = task.origin?.startsWith('engine:') ? task.agent : options.agent ?? task.agent;
    const scheduling = options.automatic !== false && task.priorityResolved === false ? { ...task, priorityResolved: true } : task;
    let outcome = evaluateEligibility(scheduling, { now: Date.now(), timezone: workspace.timezone, harness: options.harness, model: options.model, thinkingLevel: options.thinkingLevel, agent: selectedAgent, minPriority: options.minPriority, maxPriority: options.maxPriority }, state);
    if (outcome.kind !== 'ready') return outcome;
    const harness = options.harness ?? task.harness;
    const defaults = harness ? options.harnessSettings?.[harness] : undefined;
    let model = options.model ?? task.model ?? defaults?.model;
    const reference = selectedAgent ?? (options.automatic === false ? 'Developer' : undefined);
    if (reference) {
        try {
            const selection = await resolveAgentSelection(workspace, reference);
            model ??= selection.model;
            outcome = evaluateEligibility(scheduling, { now: Date.now(), timezone: workspace.timezone, harness, model, thinkingLevel: options.thinkingLevel ?? task.thinkingLevel ?? defaults?.thinkingLevel, agent: selection.path, agentAliases: selection.aliases, minPriority: options.minPriority, maxPriority: options.maxPriority }, state);
        } catch (error) { return { kind: 'blocked', reason: `Required agent is unavailable: ${(error as Error).message}` }; }
    }
    if (outcome.kind !== 'ready' || options.automatic === false) return outcome;
    if (harness) {
        const available = inventory.find(candidate => candidate.name === harness && candidate.usable && (!options.enabledHarnesses || options.enabledHarnesses.includes(harness)));
        if (!available) return { kind: 'blocked', reason: `Required harness ${harness} is unavailable or not authorized.` };
        const thinking = options.thinkingLevel ?? task.thinkingLevel ?? defaults?.thinkingLevel;
        if (thinking && !available.thinkingLevels.includes(thinking)) return { kind: 'blocked', reason: `Harness ${harness} does not support thinking level ${thinking}.` };
        if (model && available.models.length && !available.models.includes(model)) return { kind: 'blocked', reason: `Model ${model} is unavailable in harness ${harness}.` };
    }
    if (!task.agent || !task.harness || task.priorityResolved === false) return { kind: 'awaiting-assignment', reason: 'Awaiting automatic Manager assignment of missing routing/priority.' };
    return outcome;
}

/** Generate a visible Manager prerequisite without replacing any explicit target requirement. */
async function assignment(workspace: Workspace, target: TaskDefinition, inventories: HarnessInventory[], options: ServiceOptions): Promise<boolean> {
    if (target.origin?.startsWith('engine:') && target.origin !== 'engine:initial-readiness' || target.agent && target.harness && target.priorityResolved !== false) return false;
    const related = (await discoverTasks(workspace)).find(task => task.origin === `engine:assignment:${target.id}`);
    if (related) {
        if (related.status === 'done') await createRequest(workspace, { kind: 'action', taskId: target.id, reason: 'Manager completed without usable routing.', prompt: `Review ${target.source.relativePath} and fill its missing routing/priority; then resume the project.` });
        return false;
    }
    const lease = await acquireLease(workspace);
    try {
        const baseline = protectUnrelatedChanges(await captureSnapshot(workspace.gitRoot ?? workspace.projectPath), options.ownedChanges);
        const targetPath = relative(baseline.root, target.source.path).split('\\').join('/');
        if (baseline.dirtyPaths.includes(targetPath)) throw new InputError('Manager cannot change or assign an uncommitted task source; preserve and commit its current edits first.');
        target = await assignTaskId(target, { assertOwned: () => lease.assertOwned() });
        const id = randomUUID();
        const legacy = target.source.format === 'markdown';
        const routing = relative(workspace.projectPath, join(workspace.tasksPath, 'routing', `${target.id}.json`)).split('\\').join('/');
        const resultInstructions = legacy
            ? `Keep the original Markdown source unchanged. Create ${routing} as JSON with version:1, taskId:${JSON.stringify(target.id)}, sourcePayloadChecksum:${JSON.stringify(checksum(target.payload))}, agent and harness strings, and optional model/thinkingLevel strings. This readable result file supplies the legacy task's routing after this assignment completes.`
            : `Write TASK AGENT and TASK HARNESS in the target source; select a supported model/thinking setting when known or use the harness's native default without inventing one. Preserve its assignment prerequisite #${id}.`;
        const generated = await systemTask(workspace, { id, title: `Assign ${target.title}`, agent: '@Manager', harness: options.harness || inventories.find(item => item.usable)?.name, model: options.model, thinkingLevel: options.thinkingLevel, priority: target.priority, parent: `#${target.id}`, origin: `engine:assignment:${target.id}`, payload: `Select only missing execution choices in ${target.source.relativePath} for task #${target.id}. Preserve every explicit requirement. Available authorized harness inventory:\n${JSON.stringify(inventories)}\nAvailable ordinary roles: ${(await discoverAgents(workspace.projectPath)).filter(agent => !agent.hidden).map(agent => agent.name).join(', ')}. Resolve natural-language priority if needed and retain its original wording in TASK NOTE. ${resultInstructions} Do not implement the target task.` });
        if (!legacy) await updateTaskControls(target, { dependencies: [...(target.dependencies || []), `#${id}`] }, { assertOwned: () => lease.assertOwned() });
        await lease.assertOwned();
        await saveSystemOperation(workspace, options, baseline, `Create assignment for ${target.title}`, [targetPath, relative(baseline.root, generated.source.path).split('\\').join('/')]);
        return true;
    } finally { await lease.release(); }
}

/** Fair goal enquiries have durable cooldowns and only occur with an entirely empty backlog. */
async function enquire(workspace: Workspace, inventory: HarnessInventory[], options: ServiceOptions): Promise<{ reason: string; nextAt?: number } | undefined> {
    const filename = await confinePath(workspace.projectPath, join(workspace.statePath, 'discovery.json'));
    let schedule = { version: 1, nextAt: 0, index: 0 };
    try { schedule = JSON.parse(await readFile(filename, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (Date.now() < schedule.nextAt) return { reason: 'Goal discovery cooldown; no unfinished backlog.', nextAt: schedule.nextAt };
    const agents = [];
    for (const agent of (await discoverAgents(workspace.projectPath)).filter(agent => !agent.hidden)) {
        if (/^GOAL(?:S)?(?:[ \t]|$)/m.test((await prepareAgent(agent.path, workspace.projectPath)).instructions)) agents.push(agent);
    }
    if (!agents.length) return { reason: 'No ordinary goal-bearing agents are available for discovery.' };
    const lease = await acquireLease(workspace);
    try {
        const baseline = protectUnrelatedChanges(await captureSnapshot(workspace.gitRoot ?? workspace.projectPath), options.ownedChanges);
        const agent = agents[schedule.index % agents.length]!;
        const generated = await systemTask(workspace, { title: `Review goals for ${agent.name}`, agent: agent.path, harness: options.harness || inventory.find(item => item.usable)?.name, model: options.model, thinkingLevel: options.thinkingLevel, origin: `engine:goal-enquiry:${agent.name}`, payload: 'Review your goals and current project evidence. Create bounded useful task Books only when justified, including future dates where appropriate. If no useful work is needed, explain why without inventing busywork. Do not perform the proposed work during this enquiry.' });
        await lease.assertOwned();
        await saveSystemOperation(workspace, options, baseline, `Create goal enquiry for ${agent.name}`, [relative(baseline.root, generated.source.path).split('\\').join('/')]);
        await atomicWrite(filename, { version: 1, nextAt: Date.now() + 3600000, index: schedule.index + 1 });
    } finally { await lease.release(); }
}

/** Operate one project indefinitely while sharing controls and preserving every failure. @private */
export async function runService(workspace: Workspace, supplied: ServiceOptions): Promise<void> {
    validateRunOptions(supplied); validateTunnelOptions(supplied);
    if (supplied.limit !== undefined || supplied.noAuto) throw new InputError('start requires an indefinite agenda; use run for finite/manual work.');
    const existing = await serviceCommand(workspace);
    if (existing) throw new InputError('This project already has a running supervisor. Use status/show or stop.');
    if (supplied.signal?.aborted) return;
    const previousOwnedChanges = await readOwnedChanges(workspace, supplied.noCommit);
    if (previousOwnedChanges) protectUnrelatedChanges(await captureSnapshot(workspace.gitRoot ?? workspace.projectPath), previousOwnedChanges);
    await loadProjectSecrets(workspace.projectPath);
    await mkdir(await confinePath(workspace.projectPath, workspace.statePath), { recursive: true, mode: 0o700 });
    await prepareSocketDirectory(true);
    const ownerFile = join(workspace.statePath, 'service-owner.lock');
    const ownerId = randomUUID();
    const ownerRecord = { version: 1, id: ownerId, pid: process.pid, birth: await processBirth(process.pid), host: hostname() };
    if (!ownerRecord.birth) throw new InputError('Supervisor process birth identity is unavailable; startup cannot safely establish ownership.');
    const recoveryDirectory = join(workspace.statePath, 'service-owner-recovery.lock');
    const recoveryFile = join(recoveryDirectory, 'owner.json');
    const recoveryContents = JSON.stringify({ ...ownerRecord, startedAt: Date.now() });
    let recovering = false;
    try {
        await lstat(recoveryDirectory);
        throw new InputError(`Supervisor ownership recovery is locked at ${recoveryDirectory}. Inspect its owner.json before retrying; interrupted recovery locks are preserved.`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    try {
        for (let attempt = 0; ; attempt++) {
            try { await writeFile(ownerFile, JSON.stringify(ownerRecord), { flag: 'wx', mode: 0o600 }); break; }
            catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || attempt > 0) throw error;
                const original = await readFile(ownerFile, 'utf8');
                const owner = JSON.parse(original) as typeof ownerRecord;
                if (owner.version !== 1 || typeof owner.id !== 'string' || !owner.id || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 || typeof owner.birth !== 'string' || !owner.birth || typeof owner.host !== 'string' || !owner.host) throw new InputError('Supervisor ownership has no verifiable process birth and host identity; preserved for investigation.');
                if (owner.host !== ownerRecord.host) throw new InputError(`Supervisor ownership belongs to another host (${owner.host}); preserved for investigation.`);
                let alive = true; try { process.kill(owner.pid, 0); } catch (error) { alive = (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
                const birth = alive ? await processBirth(owner.pid) : undefined;
                if (alive && (!birth || birth === owner.birth)) throw new InputError(`A supervisor launch/process already owns this project (PID ${owner.pid}); process birth ${birth ? 'matches' : 'cannot be verified'}.`);
                await mkdir(recoveryDirectory, { mode: 0o700 }).catch(error => {
                    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new InputError(`Supervisor ownership recovery is locked at ${recoveryDirectory}. Inspect its owner.json before retrying; interrupted recovery locks are preserved.`);
                    throw error;
                });
                recovering = true;
                await writeFile(recoveryFile, recoveryContents, { flag: 'wx', mode: 0o600 });
                if (await readFile(ownerFile, 'utf8') !== original) throw new InputError('Supervisor ownership changed during recovery.');
                await unlink(ownerFile);
            }
        }
    } finally {
        if (recovering) {
            let recorded: string | undefined;
            try { recorded = await readFile(recoveryFile, 'utf8'); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            if (recorded !== undefined && recorded !== recoveryContents) throw new InputError('Supervisor recovery ownership changed; its recovery lock was preserved.');
            if (recorded !== undefined) await unlink(recoveryFile);
            await rmdir(recoveryDirectory);
        }
    }
    const controller = new AbortController();
    const browser = new ProjectBrowser(workspace, { mode: supplied.browserMode, profile: supplied.browserProfile, signal: controller.signal });
    let options = { ...supplied, mode: supplied.mode || 'daemon' };
    options.ownedChanges = previousOwnedChanges;
    let paused = false; let finish = false; let skip = false; let waiting = false; let running = false; let boundaryBusy = true;
    let pending: Partial<ServiceOptions> = {}; let restartSettings: Partial<ServiceOptions> = {};
    let phase: string | undefined; let currentSelection: Record<string, unknown> | undefined;
    let currentTask: string | undefined; let currentOccurrenceId: string | undefined; let status = 'starting'; let lastResult: RunResult | undefined;
    let idleReason: string | undefined; let nextOpportunity: number | undefined;
    let idleAction: string | undefined; let pacingCooldown = false;
    let inventory: HarnessInventory[] = []; let inventoryAt = 0; let lastWake = 0; let lastTaskStarted = 0;
    let maintenance: HarnessMaintenanceResult[] = [];
    const reportedFailures = new Map<string, number>();
    const statistics = { completed: 0, failed: 0, startedAt: Date.now() };
    const events: EngineEvent[] = [];
    const socketPath = endpoint(workspace);
    const record: ServiceRecord = { version: 1, engineVersion: await installedEngineVersion(), id: randomUUID(), pid: process.pid, ownerId, project: workspace.projectPath, installation: fileURLToPath(new URL('../..', import.meta.url)), node: process.execPath, endpoint: socketPath, token: randomUUID(), mode: options.mode, desired: 'running', startedAt: Date.now(), updatedAt: Date.now(), persistent: options.mode === 'daemon' && !options.noPersist, settings: serialSettings(options), status };
    /** Persist activity without exposing process authentication in user output. */
    const persist = async () => { record.updatedAt = Date.now(); record.status = status; record.settings = serialSettings({ ...options, ...restartSettings }); await atomicWrite(join(workspace.statePath, 'process.json'), record); };
    /** Apply staged future-task choices only while the supervisor owns a safe idle boundary. */
    const applyPending = async () => {
        if (pending.browserMode || pending.browserProfile !== undefined) await browser.configure({ ...(pending.browserMode ? { mode: pending.browserMode } : {}), ...(pending.browserProfile !== undefined ? { profile: pending.browserProfile } : {}) });
        options = { ...options, ...pending }; pending = {};
    };
    /** Add bounded, redacted observations that remain distinct from provider output. */
    const emit = (event: EngineEvent) => {
        events.push({ ...event, message: redactSecrets(event.message, workspace.projectPath) }); if (events.length > 160) events.shift();
        if (event.taskId && ['claimed', 'selection'].includes(event.type)) currentTask = event.taskId;
        if (event.type !== 'output') phase = event.type;
        if (event.type === 'waiting-user') { status = 'waiting-user'; currentTask = event.taskId; waiting = false; nextOpportunity = undefined; }
        if (event.type === 'attempt') status = 'running';
        if (event.type === 'selection') currentSelection = { agent: event.agent, agentName: event.agentName, harness: event.harness, model: event.model, thinkingLevel: event.thinkingLevel };
        if (event.type === 'error') { record.error = event.message; record.diagnostic = typeof event.trace === 'string' ? event.trace : undefined; record.nextAction = typeof event.nextAction === 'string' ? event.nextAction : undefined; }
        if (event.type === 'claimed') { currentOccurrenceId = event.occurrenceId; lastTaskStarted = Date.now(); }
        options.onEvent?.(event);
    };
    const control: RuntimeControl = { token: record.token,
        async snapshot() {
            const tasks = await serviceTasks(workspace); const ledger = await readLedger(workspace);
            const summaries = await Promise.all(tasks.map(async task => ({ id: task.id, title: task.title, payload: task.payload, status: ledger.tasks[task.id]?.claim ? 'in-progress' : task.status, priority: task.priority, priorityRaw: task.priorityRaw, priorityResolved: task.priorityResolved, agent: task.agent, harness: task.harness, model: task.model, thinkingLevel: task.thinkingLevel, parent: task.parent, dependencies: task.dependencies, due: task.dueRaw, source: task.source, eligibility: await taskServiceEligibility(workspace, task, options, inventory, ledger.tasks[task.id]) })));
            return identifyRuntime({ id: record.id, pid: record.pid, project: workspace.projectPath, engineVersion: record.engineVersion, mode: record.mode, status, phase, finishAfterTask: finish, controlCapabilities: { actions: ['pause', 'resume', 'skip-wait', 'finish', 'stop', 'answer', 'settings', 'harnesses', 'read-task', 'edit-task'] }, paused, pausePending: paused && running, running, waiting, currentTask, currentSelection, url: record.url, ...(http?.connection() ?? {}), idleReason, nextOpportunity, persistent: record.persistent, settings: serialSettings(options), pendingSettings: pending, restartSettings, configurationSources: options.configurationSources, settingsCapabilities: { live: [...LIVE_SETTINGS], requiresRestart: [...STARTUP_SETTINGS], temporary: true, units: 'Pacing values use milliseconds.' }, statistics, lastResult, error: record.error, diagnostic: record.diagnostic, nextAction: idleAction || record.nextAction, timezone: workspace.timezone, harnesses: inventory.map(({ name, usable, installed, authenticated, diagnostic }) => ({ name, usable, installed, authenticated, diagnostic })), harnessCatalog: catalogSummary(), harnessMaintenance: maintenance, requests: await listRequests(workspace, true), browser: browser.status(), events,
                tasks: summaries }, await discoverAgents(workspace.projectPath));
        },
        async command(action, input = {}) {
            if (['connection', 'pair-renew', 'access-devices', 'access-revoke', 'api-token'].includes(action)) { if (!http) throw new InputError('HTTP is disabled.'); return http.trustedCommand(action, input); }
            if (action === 'inspect') return control.snapshot();
            if (action === 'harnesses') {
                if (input.more !== undefined && typeof input.more !== 'boolean' || input.name !== undefined && typeof input.name !== 'string') throw new InputError('Harness inspection accepts a name or boolean more choice.');
                if (typeof input.name === 'string') { getHarness(input.name); return inventory.find(item => item.name === input.name) ?? { ...catalogSummary(true).find(item => item.name === input.name), enabled: false }; }
                return { featured: catalogSummary(), ...(input.more ? { more: catalogSummary(true) } : {}), detailAction: 'harnesses', detailInput: { name: 'harness-id' } };
            }
            if (action === 'pause') { paused = true; terminal.setPaused(true); }
            else if (action === 'resume') { paused = false; terminal.setPaused(false); lastWake = 0; inventoryAt = 0; }
            else if (action === 'skip-wait') { const cooldown = pacingCooldown && lastWake > Date.now(); skip = waiting && running; if (cooldown) lastWake = 0; return { skipped: skip || cooldown }; }
            else if (action === 'finish') {
                if (finish) { record.desired = 'stopped'; await persist(); controller.abort(); return { finishAfterTask: true, stopping: true }; }
                finish = true; terminal.setStopping(true); record.desired = 'stopped'; await persist(); return { finishAfterTask: true, stopping: false };
            }
            else if (action === 'stop') { record.desired = 'stopped'; await persist(); controller.abort(); }
            else if (action === 'read-task') {
                if (typeof input.id !== 'string') throw new InputError('Task inspection requires an id.');
                const matches = (await discoverTasks(workspace)).filter(task => task.id === input.id);
                if (matches.length !== 1) throw new InputError(matches.length ? 'Task ID is ambiguous; resolve duplicate definitions before editing.' : 'Task not found.');
                const task = matches[0]!;
                await assertConfined(task.source.path, workspace.projectPath);
                const attributes = await lstat(task.source.path);
                if (!attributes.isFile() || attributes.size > 256 * 1024) throw new InputError('Task editing requires an ordinary project-local source file within 256 KiB.');
                const content = await readFile(task.source.path, 'utf8');
                if (redactSecrets(content, workspace.projectPath) !== content) throw new InputError('This source contains private values and cannot be edited through the dashboard. Edit it locally instead.');
                return { id: task.id, revision: checksum(content), content, source: task.source.relativePath };
            }
            else if (action === 'edit-task') {
                if (typeof input.id !== 'string' || typeof input.revision !== 'string' || typeof input.content !== 'string' || Buffer.byteLength(input.content) > 256 * 1024) throw new InputError('Task edit requires id, revision and content within 256 KiB.');
                if (running) throw new Error('The active task owns the workspace; pause and wait for a safe boundary before editing.');
                const lease = await acquireLease(workspace);
                try {
                    const matches = (await discoverTasks(workspace)).filter(task => task.id === input.id);
                    if (matches.length !== 1) throw new Error(matches.length ? 'Task ID is ambiguous; resolve duplicate definitions before editing.' : 'Task not found.');
                    const task = matches[0]!;
                    await assertConfined(task.source.path, workspace.projectPath);
                    const attributes = await lstat(task.source.path);
                    if (!attributes.isFile()) throw new Error('Task editing requires an ordinary project-local source file.');
                    const previous = await readFile(task.source.path);
                    if (checksum(previous) !== input.revision) throw new Error('Source changed; reload before editing.');
                    const baseline = protectUnrelatedChanges(await captureSnapshot(workspace.gitRoot ?? workspace.projectPath), options.ownedChanges);
                    await saveTaskEdit(workspace, task.source.path, previous, input.content, lease);
                    await saveSystemOperation(workspace, options, baseline, `Edit task - ${task.title}`, [relative(baseline.root, task.source.path).split('\\').join('/')]);
                    lastWake = 0; return { saved: true, committed: !options.noCommit };
                } finally { await lease.release(); }
            }
            else if (action === 'answer') {
                if (typeof input.id !== 'string' || typeof input.response !== 'string') throw new InputError('Answer requires request id and response.');
                const answer = await answerRequest(workspace, input.id, input.response, input.status as 'answered' | undefined); lastWake = 0; inventoryAt = 0; return answer;
            } else if (action === 'settings') {
                if (input.save !== undefined && typeof input.save !== 'boolean') throw new InputError('save must be boolean.');
                if (!input.settings || typeof input.settings !== 'object' || Array.isArray(input.settings)) throw new InputError('settings must be an object.');
                const update = input.settings as Partial<ServiceOptions>;
                for (const key of Object.keys(update)) if (!LIVE_SETTINGS.has(key) && !STARTUP_SETTINGS.has(key)) throw new InputError(`Unknown/immutable setting ${key}.`);
                for (const [key, value] of Object.entries(update)) {
                    if (['noServer', 'noPersist', 'noTunnel', 'autoPull', 'autoPush', 'isolate', 'normalizeLineEndings', 'noQuestions', 'allowCredits', 'preserveLogs', 'autoUpdateHarnesses'].includes(key) && typeof value !== 'boolean') throw new InputError(`${key} must be a boolean.`);
                    if (['harness', 'model', 'thinkingLevel', 'agent', 'context', 'check', 'browserProfile'].includes(key) && typeof value !== 'string') throw new InputError(`${key} must be a string.`);
                }
                if (update.mode !== undefined && !['daemon', 'raw', 'interactive'].includes(update.mode)) throw new InputError('mode must be daemon, raw or interactive.');
                if (update.port !== undefined && (!Number.isInteger(update.port) || update.port < 1 || update.port > 65535)) throw new InputError('port must be between 1 and 65535.');
                if (update.checkBefore !== undefined && !['no', 'yes-and-fail', 'yes-and-fix'].includes(update.checkBefore)) throw new InputError('Invalid checkBefore setting.');
                if (update.gitChanges !== undefined && !['fail', 'ignore', 'continue'].includes(update.gitChanges)) throw new InputError('Invalid gitChanges setting.');
                if (update.harness) getHarness(update.harness);
                if (update.enabledHarnesses !== undefined) { if (!Array.isArray(update.enabledHarnesses) || update.enabledHarnesses.some(name => typeof name !== 'string' || !name.trim())) throw new InputError('enabledHarnesses must be an array of nonempty harness names.'); for (const name of update.enabledHarnesses) getHarness(name); }
                if (update.harnessSettings !== undefined) {
                    if (!update.harnessSettings || typeof update.harnessSettings !== 'object' || Array.isArray(update.harnessSettings)) throw new InputError('harnessSettings must be an object.');
                    for (const [name, defaults] of Object.entries(update.harnessSettings)) {
                        getHarness(name);
                        if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) throw new InputError(`harnessSettings.${name} must be an object.`);
                        for (const [key, value] of Object.entries(defaults)) if (!['model', 'thinkingLevel', 'apiKeyEnv', 'configurationPath'].includes(key) || typeof value !== 'string' || !value.trim()) throw new InputError(`Invalid harnessSettings.${name}.${key}; use a nonempty supported configuration reference.`);
                        if (defaults.apiKeyEnv && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(defaults.apiKeyEnv)) throw new InputError('apiKeyEnv must name an environment variable, never contain a secret.');
                        validateRunOptions({ model: defaults.model, thinkingLevel: defaults.thinkingLevel });
                    }
                }
                if (update.browserMode !== undefined && !['headless', 'headful'].includes(update.browserMode)) throw new InputError('browserMode must be headless or headful.');
                if (update.browserProfile !== undefined && !update.browserProfile.trim()) throw new InputError('browserProfile must be a nonempty existing profile path.');
                validateRunOptions({ ...options, ...pending, ...update }); validateTunnelOptions({ ...options, ...restartSettings, ...update });
                if (update.browserMode !== undefined || update.browserProfile !== undefined) await browser.validateConfiguration({ ...(update.browserMode ? { mode: update.browserMode } : {}), ...(update.browserProfile !== undefined ? { profile: update.browserProfile } : {}) });
                if (input.save) {
                    if (running || boundaryBusy) throw new InputError('Pause the service and wait for its safe boundary before saving versioned defaults.');
                    await saveDefaults(workspace, options, update);
                }
                for (const [key, value] of Object.entries(update)) { if (STARTUP_SETTINGS.has(key)) Object.assign(restartSettings, { [key]: value }); else Object.assign(pending, { [key]: value }); }
                if (!running && (!boundaryBusy || paused && pending.browserMode === undefined && pending.browserProfile === undefined && pending.noPersist === undefined)) await applyPending();
                inventoryAt = 0; await persist(); return { active: serialSettings(options), pending, requiresRestart: restartSettings, savedDefaults: input.save === true, committed: input.save ? !options.noCommit : undefined };
            } else throw new InputError(`Unknown control action ${action}.`);
            await persist(); return { paused, pausePending: paused && running, status, stopping: controller.signal.aborted };
        },
    };
    const socket = createSocketServer(client => {
        client.setEncoding('utf8');
        // A disconnected control client cannot terminate the project supervisor.
        client.on('error', () => client.destroy());
        let text = '';
        client.setTimeout(10_000, () => client.destroy());
        client.on('data', chunk => {
            text += String(chunk);
            if (Buffer.byteLength(text) > 512 * 1024) {
                client.removeAllListeners('data');
                client.end(`${JSON.stringify({ id: record.id, pid: record.pid, error: 'Control command exceeds 512 KiB.' })}\n`);
                return;
            }
            const index = text.indexOf('\n'); if (index < 0) return;
            client.removeAllListeners('data');
            let trustedAccess = false;
            void (async () => {
                const input = JSON.parse(text.slice(0, index));
                if (input.identity !== record.id || !matchesToken(input.token, record.token)) throw new InputError('Project process identity/token mismatch.');
                trustedAccess = ['connection', 'pair-renew', 'api-token', 'access-devices', 'access-revoke'].includes(input.action);
                return control.command(input.action, input.input);
            })().then(result => { const reply = JSON.stringify({ id: record.id, pid: record.pid, result }); client.end(`${trustedAccess ? reply : redactSecrets(reply, workspace.projectPath)}\n`); }, error => client.end(`${JSON.stringify({ id: record.id, pid: record.pid, error: redactSecrets((error as Error).message, workspace.projectPath) })}\n`));
        });
    });
    const terminal = createTerminal(options.mode === 'interactive', () => controller.abort(), workspace.projectPath, { noQr: options.noQr, onControl: async action => {
        if (action === 'requests') {
            const outstanding = await listRequests(workspace, true);
            if (!outstanding.length) { terminal.status('There are no pending user requests.'); return; }
            const id = await terminal.choose('Choose a pending request to answer:', [...outstanding.map(request => ({ value: request.id, label: request.prompt, description: request.reason })), { value: 'cancel', label: 'Cancel', description: 'Leave the requests pending.' }]);
            const selected = outstanding.find(request => request.id === id);
            if (!selected) return;
            const response = selected.choices?.length
                ? selected.choices[Number(await terminal.choose(selected.prompt, selected.choices.map((label, index) => ({ value: String(index), label }))))]!
                : await terminal.question(`${selected.prompt}\nAnswer (blank leaves the request pending):`);
            if (response.trim()) await control.command('answer', { id: selected.id, response });
        } else if (action === 'settings') {
            const value = await terminal.question('Runtime settings as JSON (blank to cancel): ');
            if (value.trim()) { const outcome = await control.command('settings', { settings: JSON.parse(value) }); terminal.status(JSON.stringify(outcome)); }
        } else if (action === 'edit-task') {
            await editTaskFromTerminal(terminal, await control.snapshot(), (command, input) => control.command(command, input));
        } else if (action === 'inventory') {
            let selected = await terminal.choose('Inspect a featured harness or open More:', [
                ...catalogSummary().map(item => ({ value: String(item.name), label: String(item.displayName) })),
                { value: '@more', label: 'More harnesses', description: 'Browse every registered integration.' },
                { value: '@cancel', label: 'Back to dashboard' },
            ]);
            if (selected === '@more') selected = await terminal.choose('Inspect a harness:', [
                ...catalogSummary(true).map(item => ({ value: String(item.name), label: String(item.displayName) })),
                { value: '@cancel', label: 'Back to dashboard' },
            ]);
            if (selected !== '@cancel') terminal.status(JSON.stringify(await control.command('harnesses', { name: selected }), null, 2));
        } else {
            const outcome = await control.command(action); terminal.status(JSON.stringify(outcome));
        }
    } });
    let lastRequestPresentation = '';
    /** Foreground requests remain visible while an active provider is waiting for a human reply. */
    const announceRequests = async () => {
        if (options.mode === 'daemon') return;
        const requests = await listRequests(workspace, true);
        const shown = requests.slice(0, 20);
        const signature = JSON.stringify([requests.length, shown.map(request => [request.id, request.prompt, request.reason])]);
        if (signature === lastRequestPresentation) return;
        lastRequestPresentation = signature;
        for (const request of shown) terminal.status(`Pending request ${request.id}: ${request.prompt}\nReason: ${request.reason}\n${options.mode === 'interactive' ? 'Press Q to answer this request, or ' : ''}answer with ptbk answer ${JSON.stringify(request.id)} --response "your reply" --path ${JSON.stringify(workspace.projectPath)}.`);
        if (requests.length > shown.length) terminal.status(`${requests.length - shown.length} more pending requests are available through ptbk answer or status.`);
    };
    /** Keep foreground queue/statistics/request presentation synchronized with the control model. */
    let displayedConnection = '';
    /** Raw foreground observations update public addresses and health without pairing secrets. */
    const present = async () => {
        if (options.mode === 'raw' && http) {
            const connection = http.connection(); const signature = JSON.stringify(connection);
            if (signature !== displayedConnection) { displayedConnection = signature; terminal.status(connectionDetails({ ...connection, status }, false).join('\n')); }
        }
        if (options.mode !== 'interactive') return;
        terminal.setSnapshot({ ...await control.snapshot(), ...(http?.trustedConnection() ?? {}) });
    };
    const abort = () => controller.abort(); supplied.signal?.addEventListener('abort', abort, { once: true });
    let http: Awaited<ReturnType<typeof openDashboard>> | undefined;
    let ownsSocket = false;
    let requestObservation: Promise<void> | undefined;
    const requestMonitor = setInterval(() => {
        if (requestObservation || controller.signal.aborted || options.mode === 'daemon') return;
        requestObservation = Promise.all([announceRequests(), present()]).then(() => undefined).catch(() => {}).finally(() => { requestObservation = undefined; });
    }, 1000);
    requestMonitor.unref();
    try {
        const previous = await readServiceRecord(workspace);
        if (previous && process.platform !== 'win32') {
            // A stale endpoint may be removed only after its authenticated connection is unavailable.
            try {
                const attributes = await lstat(socketPath);
                if (!attributes.isSocket() || attributes.uid !== process.getuid?.()) throw new InputError('Refusing to remove a control endpoint that is not a current-user-owned socket.');
            } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            await unlink(socketPath).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; });
        }
        await persist();
        await new Promise<void>((resolve, reject) => { socket.once('error', reject); socket.listen(socketPath, resolve); });
        ownsSocket = true;
        if (process.platform !== 'win32') await chmod(socketPath, 0o600);
        if (options.automatic !== false) {
            const lease = await acquireLease(workspace);
            try {
                const baseline = protectUnrelatedChanges(await captureSnapshot(workspace.gitRoot ?? workspace.projectPath), options.ownedChanges);
                const files = await ensureCoreAgents(workspace.projectPath);
                await lease.assertOwned();
                if (files.length) await saveSystemOperation(workspace, options, baseline, 'Create missing Promptbook core agents', files.map(file => relative(baseline.root, file).split('\\').join('/')));
            } finally { await lease.release(); }
        }
        if (controller.signal.aborted) return;
        if (!options.noServer) { http = await openDashboard(workspace, control, options.port, options); await http.startTunnel(); record.url = http.url; }
        if (controller.signal.aborted) return;
        status = 'ready'; await persist(); supplied.onReady?.(record);
        if (options.mode !== 'daemon') terminal.status(`Promptbook ${record.engineVersion} · project: ${workspace.projectPath}\n${record.url ? `ptbk dashboard: ${record.url}\n` : ''}`);
        await present();
        while (!controller.signal.aborted && !finish) {
            boundaryBusy = true;
            try {
                await applyPending();
                waiting = false; terminal.setWaiting(false);
                if (Date.now() >= lastWake) pacingCooldown = false;
                if (Date.now() - inventoryAt > 60_000) {
                    if (!options.inspectHarnesses && options.automatic !== false) maintenance = await maintainHarnesses(workspace.projectPath, { names: selectedHarnesses(options), harnessSettings: options.harnessSettings, autoUpdate: options.autoUpdateHarnesses !== false, signal: controller.signal, onOutput: text => terminal.status(text) });
                    inventory = options.automatic === false && !options.inspectHarnesses ? [] : await (options.inspectHarnesses || inspectHarnesses)(workspace.projectPath, { names: selectedHarnesses(options), harnessSettings: options.harnessSettings, signal: controller.signal }); inventoryAt = Date.now();
                }
                const available = inventory.filter(item => item.usable && (!options.enabledHarnesses || options.enabledHarnesses.includes(item.name)) && (!options.harness || item.name === options.harness));
                if (paused || terminal.isPaused()) { status = 'paused'; }
                else if (Date.now() < lastWake) {
                    waiting = pacingCooldown;
                    if (pacingCooldown) status = 'waiting';
                    nextOpportunity = lastWake; terminal.setWaiting(waiting);
                }
                else if (!available.length && options.automatic !== false) {
                    status = 'setup-required'; pacingCooldown = false;
                    idleReason = `No usable enabled harness. ${inventory.map(item => `${item.name}: ${item.diagnostic}`).join('; ') || 'No harness is enabled.'}`;
                    idleAction = `Review ptbk harnesses --path ${JSON.stringify(workspace.projectPath)} and resolve the reported prerequisite. If the harness works in your terminal, use ptbk restart --path ${JSON.stringify(workspace.projectPath)} from that terminal to refresh daemon discovery paths.`;
                    await createRequest(workspace, { kind: 'action', reason: idleReason, prompt: idleAction }); lastWake = Date.now() + 30_000; nextOpportunity = lastWake;
                } else {
                    idleAction = undefined;
                    const unresolved = await listRecovery(workspace, { includeSync: true });
                    if (unresolved.length) {
                        const safe = unresolved.find(journal => journal.phase === 'awaiting-user' || journal.phase === 'completed' && journal.syncPending || ['completion-ready', 'implementation-ready', 'integrating'].includes(journal.safePhase ?? journal.phase) || journal.pendingPhase === 'result');
                        if (safe) {
                            running = true; currentTask = safe.taskId;
                            currentSelection = { agent: safe.agent, harness: safe.harness, model: safe.model, thinkingLevel: safe.thinkingLevel };
                            let recovered: Awaited<ReturnType<typeof recoverTask>>;
                            try { recovered = await recoverTask(workspace, safe.taskId, { action: 'resume', occurrence: safe.occurrenceId }, {
                                ...options, waitForUser: true, signal: controller.signal, onEvent: emit,
                                ...(safe.harness && getHarness(safe.harness).toolDiscovery ? { tools: browserTools(browser, safe.taskId, () => safe.occurrenceId) } : {}),
                                onOutput: text => { terminal.output(text); options.onOutput?.(text); },
                            }); }
                            finally { running = false; currentTask = undefined; currentSelection = undefined; phase = undefined; }
                            const { journals: _journals, plan: _plan, ...outcome } = recovered;
                            lastResult = outcome; statistics.completed += outcome.completed; statistics.failed += outcome.failed;
                            if (outcome.failed || outcome.syncPending || outcome.exitCode === 1) {
                                status = outcome.syncPending ? 'sync-pending' : 'recovery-required';
                                idleReason = 'Recorded recovery could not finish safely; review its preserved result and diagnostics.';
                                idleAction = `Review ptbk recover ${JSON.stringify(safe.taskId)} --path ${JSON.stringify(workspace.projectPath)} and resolve the failed boundary before resuming.`;
                                await createRequest(workspace, { kind: 'action', taskId: safe.taskId, reason: 'Recorded recovery could not finish safely.', prompt: 'Review ptbk recover and resolve the failed persistence/check/synchronization boundary. Resume retries this same recorded occurrence without inventing a new task.' });
                                pacingCooldown = false; lastWake = Date.now() + (options.waitAfterError ?? 600000); nextOpportunity = lastWake;
                            } else {
                                if (!(await listRecovery(workspace)).length && options.gitChanges === 'continue') options = { ...options, gitChanges: 'fail' };
                                await persist(); continue;
                            }
                        } else {
                            status = 'recovery-required'; pacingCooldown = false; idleReason = 'Interrupted work requires recovery at its recorded boundary.';
                            idleAction = `Inspect ptbk recover ${unresolved[0]!.taskId} --path ${JSON.stringify(workspace.projectPath)} and choose resume, retry or acknowledge.`;
                            await createRequest(workspace, { kind: 'action', taskId: unresolved[0]!.taskId, reason: 'Interrupted work has an uncertain boundary.', prompt: `Inspect ptbk recover ${unresolved[0]!.taskId} and explicitly choose resume, retry or acknowledge. User work was preserved.` }); lastWake = Date.now() + 10_000; nextOpportunity = lastWake;
                        }
                    } else {
                        let tasks = await serviceTasks(workspace);
                        if (options.automatic !== false) {
                            running = true; status = 'preparing'; await persist();
                            try {
                                const unfinished = tasks.filter(task => !['done', 'retired'].includes(task.status));
                                idleReason = undefined; nextOpportunity = undefined;
                                if (!unfinished.length) { const discovery = await enquire(workspace, available, options); idleReason = discovery?.reason; nextOpportunity = discovery?.nextAt; tasks = await serviceTasks(workspace); }
                                const assignmentLedger = await readLedger(workspace);
                                let target: TaskDefinition | undefined;
                                for (const task of tasks) if ((await taskServiceEligibility(workspace, task, options, inventory, assignmentLedger.tasks[task.id])).kind === 'awaiting-assignment') { target = task; break; }
                                if (target && await assignment(workspace, target, available, options)) { tasks = await serviceTasks(workspace); }
                            } finally { running = false; }
                        }
                        const bootstrap = available[0];
                        const run: RunOptions = { ...options, waitForUser: true, limit: 1, harness: options.harness || (options.automatic !== false ? bootstrap?.name : undefined), context: await readContext(workspace, options.context), signal: controller.signal, requireAcceptance: options.automatic !== false, check: options.check || (options.automatic !== false ? 'npm run check' : undefined), isPaused: () => paused || terminal.isPaused(), shouldStop: () => finish || terminal.shouldStop(), skipWait: () => { const result = skip || terminal.skipWait(); skip = false; return result; }, onWait: value => { waiting = value; terminal.setWaiting(value); }, onEvent: event => { emit(event); if (options.mode !== 'daemon' && event.type !== 'output') terminal.status(`${event.type}: ${event.message}`); }, onOutput: text => { terminal.output(text); options.onOutput?.(text); } };
                        // Explicit per-task harness choices take precedence over an automatic bootstrap.
                        const ledger = await readLedger(workspace);
                        let ready: TaskDefinition | undefined;
                        for (const candidate of tasks) if ((await taskServiceEligibility(workspace, candidate, options, inventory, ledger.tasks[candidate.id])).kind === 'ready') { ready = candidate; break; }
                        if (paused || terminal.isPaused() || controller.signal.aborted || finish) { status = 'paused'; await persist(); await present(); await delay(1000, undefined, { signal: controller.signal }).catch(() => {}); continue; }
                        if (!ready) {
                            const outcomes = await Promise.all(tasks.filter(task => !['done', 'retired'].includes(task.status)).map(task => taskServiceEligibility(workspace, task, options, inventory, ledger.tasks[task.id])));
                            if (outcomes.length) idleReason = [...new Set(outcomes.map(outcome => outcome.reason))].join('; ');
                            const times = outcomes.flatMap(outcome => outcome.nextWakeUp === undefined ? [] : [outcome.nextWakeUp]);
                            if (times.length) nextOpportunity = Math.min(...times);
                            status = 'watching'; await persist(); await present(); await delay(1000, undefined, { signal: controller.signal }).catch(() => {}); if (terminal.shouldStop()) finish = true; continue; }
                        run.onlyTaskId = ready.id;
                        if (ready?.harness && !options.harness) run.harness = ready.harness;
                        if (run.harness && getHarness(run.harness).toolDiscovery) run.tools = browserTools(browser, ready.id, () => currentOccurrenceId);
                        if (ready?.agent && (!options.agent || ready.origin?.startsWith('engine:'))) run.agent = ready.agent;
                        if (ready?.model && !options.model) run.model = ready.model;
                        if (ready?.thinkingLevel && !options.thinkingLevel) run.thinkingLevel = ready.thinkingLevel;
                        const defaults = run.harness ? options.harnessSettings?.[run.harness] : undefined;
                        run.model ??= defaults?.model; run.thinkingLevel ??= defaults?.thinkingLevel;
                        run.harnessVersion = inventory.find(item => item.name === run.harness)?.version;
                        run.harnessConfiguration = defaults ? { apiKeyEnv: defaults.apiKeyEnv, configurationPath: defaults.configurationPath } : undefined;
                        idleReason = undefined; nextOpportunity = undefined;
                        currentTask = ready.id; currentSelection = { agent: run.agent, harness: run.harness, model: run.model, thinkingLevel: run.thinkingLevel }; phase = 'starting';
                        running = true; status = 'running'; await persist(); await present();
                        try {
                            lastResult = await runQueue(workspace, run); statistics.completed += lastResult.completed; statistics.failed += lastResult.failed;
                            if (options.noCommit && lastResult.retainedPaths?.length) {
                                options.ownedChanges = uncommittedOwnership(await captureSnapshot(workspace.gitRoot!), [...Object.keys(options.ownedChanges?.files ?? {}), ...lastResult.retainedPaths]);
                                await atomicWrite(join(workspace.statePath, 'uncommitted.json'), options.ownedChanges);
                            }
                        }
                        finally { running = false; currentTask = undefined; currentOccurrenceId = undefined; currentSelection = undefined; phase = undefined; }
                        if (lastResult?.failed || lastResult?.syncPending) {
                            status = lastResult.syncPending ? 'sync-pending' : 'blocked';
                            idleReason = record.error || 'The last task requires review of its failed execution, check or synchronization boundary.';
                            await createRequest(workspace, { kind: 'action', reason: status, prompt: 'Review recent task diagnostics and ptbk recover. Successful inference and local commits were preserved; resolve the failed phase before resuming.' });
                            pacingCooldown = false; lastWake = Date.now() + (options.waitAfterError ?? 600000); nextOpportunity = lastWake;
                        } else {
                            lastWake = Math.max(Date.now() + (options.waitAfterPrompt ?? 0), lastTaskStarted + (options.waitBetweenPrompts ?? 0)); pacingCooldown = lastWake > Date.now();
                            status = pacingCooldown ? 'waiting' : 'watching'; waiting = pacingCooldown;
                            idleReason = pacingCooldown ? 'Waiting between prompts under the configured pacing limits.' : undefined; nextOpportunity = pacingCooldown ? lastWake : undefined; terminal.setWaiting(waiting);
                        }
                    }
                }
                await persist();
                await present();
            } catch (error) {
                if (controller.signal.aborted) break;
                if (/^Workspace is owned by PID .*Wait for the worker to finish\./.test((error as Error).message)) {
                    status = 'watching'; idleReason = 'Waiting for the active workspace writer to finish its authorized operation.';
                    nextOpportunity = Date.now() + 1000; pacingCooldown = false; waiting = false;
                    await persist(); await present(); await delay(1000, undefined, { signal: controller.signal }).catch(() => {}); continue;
                }
                status = 'blocked'; record.error = redactSecrets((error as Error).message, workspace.projectPath);
                emit({ type: 'error', message: record.error, time: Date.now() });
                const signature = `${phase || 'supervisor cycle'}:${record.error}`;
                if (Date.now() - (reportedFailures.get(signature) ?? 0) >= 60_000) {
                    reportedFailures.set(signature, Date.now());
                    if (reportedFailures.size > 32) reportedFailures.delete(reportedFailures.keys().next().value!);
                    const diagnostic = await reportDiagnostic(error, { command: 'start', phase: phase || 'supervisor cycle', projectPath: workspace.projectPath, workspace, metadata: { agent: currentSelection?.agent, harness: currentSelection?.harness, model: currentSelection?.model, thinkingLevel: currentSelection?.thinkingLevel, harnessVersion: inventory.find(item => item.name === currentSelection?.harness)?.version, task: currentTask, occurrence: currentOccurrenceId } });
                    record.diagnostic = diagnostic.trace; record.nextAction = diagnostic.nextAction;
                }
                await createRequest(workspace, { kind: 'action', reason: 'Runtime could not continue safely.', prompt: record.error }).catch(() => {});
                pacingCooldown = false; waiting = false; terminal.setWaiting(false); idleReason = record.error;
                lastWake = Date.now() + 10_000; nextOpportunity = lastWake;
                await persist().catch(() => {});
            } finally { boundaryBusy = false; }
            await delay(1000, undefined, { signal: controller.signal }).catch(() => {});
            if (terminal.shouldStop()) finish = true;
        }
    } finally {
        clearInterval(requestMonitor); await requestObservation;
        controller.abort(); terminal.close(); supplied.signal?.removeEventListener('abort', abort);
        status = record.desired === 'stopped' || finish || options.mode !== 'daemon' ? 'stopped' : 'interrupted';
        if (finish || options.mode !== 'daemon') record.desired = 'stopped'; await persist().catch(() => {});
        const cleanup = await Promise.allSettled([browser.close(), http?.close(), new Promise<void>(resolve => socket.close(() => resolve()))]);
        const failure = cleanup.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (failure) throw failure.reason;
        if (ownsSocket && process.platform !== 'win32') await unlink(socketPath).catch(() => {});
        if (JSON.parse(await readFile(ownerFile, 'utf8')).id === ownerId) await unlink(ownerFile);
    }
}

/** Installation paths are persisted for both OS registration and detached local daemons. @private */
export function startupPaths(workspace: Workspace): StartupPaths {
    return { node: process.execPath, worker: fileURLToPath(new URL('./service-worker.js', import.meta.url)), configuration: join(workspace.statePath, 'service-config.json') };
}

/** Start one daemon, either through its OS manager or an explicitly nonpersistent child. @private */
export async function startService(workspace: Workspace, options: ServiceOptions): Promise<Record<string, unknown>> {
    validateRunOptions(options); validateTunnelOptions(options);
    if (options.limit !== undefined || options.noAuto) throw new InputError('start requires an indefinite automatic agenda.');
    const existing = await serviceCommand(workspace); if (existing) {
        if (!options.quiet) process.stdout.write(`Promptbook ${existing.engineVersion || 'version unavailable'}\nProject already running: ${workspace.projectPath}\n${existing.url || ''}\nUse ptbk show or ptbk stop --path ${JSON.stringify(workspace.projectPath)}.\n`);
        if (!options.quiet && existing.url && !options.noQr) process.stdout.write(await QRCode.toString(String(existing.url), { type: 'terminal', small: true }));
        return existing;
    }
    const baseline = protectUnrelatedChanges(await captureSnapshot(workspace.gitRoot || workspace.projectPath), await readOwnedChanges(workspace, options.noCommit));
    if (baseline.dirtyPaths.length && (options.gitChanges ?? 'fail') === 'fail') throw new InputError(`Startup requires a committed baseline. Preserve and commit changes in ${baseline.dirtyPaths.join(', ')} before ptbk start.`);
    const inventories = await (options.inspectHarnesses || inspectHarnesses)(workspace.projectPath, { names: selectedHarnesses(options), harnessSettings: options.harnessSettings, signal: options.signal });
    if (!inventories.some(item => item.usable && (!options.harness || options.harness === item.name) && (!options.enabledHarnesses || options.enabledHarnesses.includes(item.name)))) throw new InputError(`No authenticated authorized harness is ready. Run ptbk init to install/login.\n${inventories.map(item => `${item.name}: ${item.diagnostic}`).join('\n')}`);
    if (options.mode && options.mode !== 'daemon') { await runService(workspace, options); return { stopped: true }; }
    const directory = await confinePath(workspace.projectPath, workspace.statePath); await mkdir(directory, { recursive: true, mode: 0o700 });
    const lock = join(directory, 'launch.lock');
    const handle = await open(lock, 'wx', 0o600).catch(error => { throw new InputError(`A project launch is already pending (${lock}). Wait for it or inspect a stale launch record: ${(error as Error).message}`); });
    let child: ReturnType<typeof spawn> | undefined;
    try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, id: randomUUID(), createdAt: Date.now() })); await handle.close();
        const paths = startupPaths(workspace);
        await atomicWrite(paths.configuration, { version: 1, project: workspace.projectPath, tasks: workspace.tasksPath, installation: fileURLToPath(new URL('../..', import.meta.url)), environment: captureServiceEnvironment(), options: serialSettings({ ...options, mode: 'daemon' }), desired: 'running' });
        const prior = await readServiceRecord(workspace); if (prior) await atomicWrite(join(workspace.statePath, 'process.json'), { ...prior, desired: 'running' });
        if (!options.noPersist) await installStartup(workspace, paths);
        else {
            if (prior?.persistent) await disableStartup(workspace, paths);
            try { if ((await stat(join(workspace.statePath, 'service.log'))).size > 5 * 1024 * 1024) await rename(join(workspace.statePath, 'service.log'), join(workspace.statePath, 'service.log.1')); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            const log = await open(join(workspace.statePath, 'service.log'), 'a', 0o600);
            try { child = spawn(paths.node, [paths.worker, '--config', paths.configuration], { cwd: workspace.projectPath, detached: true, stdio: ['ignore', log.fd, log.fd], windowsHide: true }); child.unref(); }
            finally { await log.close(); }
            child.once('error', () => {});
        }
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
            const state = await serviceCommand(workspace);
            if (state && !['starting', 'stopped', 'interrupted'].includes(String(state.status))) {
                if (!options.quiet) process.stdout.write(`Promptbook ${state.engineVersion}\nptbk started: ${workspace.projectPath}\n${options.noPersist ? 'Persistence disabled.\n' : 'Startup persistence installed for this user/project.\n'}${state.url ? `Dashboard: ${state.url}\n` : ''}Use ptbk show, ptbk answer, or ptbk stop --path ${JSON.stringify(workspace.projectPath)}.\n`);
                if (!options.quiet && state.url && !options.noQr) process.stdout.write(await QRCode.toString(String(state.url), { type: 'terminal', small: true }));
                return state;
            }
            await delay(200, undefined, { signal: options.signal });
        }
        throw new Error(`Project did not confirm startup within 30 seconds. Inspect ${join(workspace.statePath, 'service.log')}; no successful start was reported.`);
    } catch (error) {
        const filename = startupPaths(workspace).configuration;
        try { const saved = JSON.parse(await readFile(filename, 'utf8')); saved.desired = 'stopped'; await atomicWrite(filename, saved); } catch { /* Keep the original startup error observable. */ }
        child?.kill('SIGTERM');
        throw error;
    } finally { await handle.close().catch(() => {}); await unlink(lock).catch(() => {}); }
}

/** Stop the authenticated daemon; foreground sessions use their own terminal controls. @private */
export async function stopService(workspace: Workspace, quiet = false, options: ServiceCommandOptions = {}): Promise<void> {
    const current = await serviceCommand(workspace, 'inspect', {}, undefined, options);
    const record = await readServiceRecord(workspace);
    if (current && (!record || current.id !== record.id || current.pid !== record.pid)) throw new InputError('Project supervisor identity changed while stopping; the new process was preserved.');
    if (current && record?.mode !== 'daemon') throw new InputError('This project runs in the foreground. Use its terminal controls or Ctrl+C.');
    if (current && record) await serviceCommand(workspace, 'stop', {}, { id: record.id, pid: record.pid }, options);
    if (record) {
        const saved = await readServiceRecord(workspace);
        if (!saved || saved.id !== record.id || saved.pid !== record.pid) throw new InputError('Project supervisor identity changed while stopping; the new process was preserved.');
        await atomicWrite(join(workspace.statePath, 'process.json'), { ...saved, desired: 'stopped' });
    }
    const configuration = startupPaths(workspace).configuration;
    try { const saved = JSON.parse(await readFile(configuration, 'utf8')); saved.desired = 'stopped'; await atomicWrite(configuration, saved); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (record?.persistent) await disableStartup(workspace, startupPaths(workspace));
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const active = await serviceCommand(workspace, 'inspect', {}, undefined, options);
        if (active && record && (active.id !== record.id || active.pid !== record.pid)) throw new InputError('Project supervisor identity changed while stopping; the new process was preserved.');
        let owned = false;
        try {
            const owner = JSON.parse(await readFile(await confinePath(workspace.projectPath, join(workspace.statePath, 'service-owner.lock')), 'utf8')) as { id?: string; pid?: number };
            if (record && (owner.pid !== record.pid || record.ownerId && owner.id !== record.ownerId)) throw new InputError('Project supervisor ownership changed while stopping; the new process was preserved.');
            owned = true;
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        if (!active && !owned) break;
        await delay(100);
    }
    if (Date.now() >= deadline) throw new InputError('The authenticated supervisor has not released this project after 30 seconds. Inspect its status before restarting.');
    if (!quiet) process.stdout.write(`ptbk stopped: ${workspace.projectPath}\n`);
}
