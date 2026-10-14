import { identifyRuntime } from './agent-identity.js';
import { discoverAgents } from './agents.js';
import { randomUUID } from 'node:crypto';
import type { Workspace } from './domain.js';
import { type RunOptions, type RunResult, type EngineEvent, taskEligibility, validateRunOptions } from './engine.js';
import { discoverTasks } from './sources.js';
import { readLedger } from './state.js';
import { createTerminal } from './terminal.js';
import { openDashboard, serviceCommand, type RuntimeControl } from './service.js';
import { installedEngineVersion } from './version.js';
import { answerRequest, listRequests } from './requests.js';
import { ProjectBrowser, browserTools } from './browser.js';
import { getHarness, getHarnessCatalog, HARNESS_REGISTRY, redactSecrets } from './harness.js';
import { InputError } from './workspace.js';
import type { TunnelOptions } from './tunnel.js';
import { connectionDetails } from './status-view.js';

/** Finite presentation uses the same state/control channels without creating a supervisor. @private */
export interface FiniteRuntimeOptions extends RunOptions, TunnelOptions {
    interactive?: boolean; noServer?: boolean; noQr?: boolean; port?: number;
    browserMode?: 'headless' | 'headful'; browserProfile?: string;
}
/** Runtime controls distinguish the single finite invocation's fixed routing from future defaults. */
const FINITE_SETTINGS = new Set(['harness', 'agent', 'model', 'thinkingLevel', 'context', 'browserMode', 'browserProfile', 'waitBetweenPrompts', 'waitAfterPrompt', 'waitAfterError', 'preserveLogs', 'noQuestions', 'allowCredits', 'check', 'checkBefore', 'gitChanges', 'autoPull', 'autoPush', 'isolate', 'normalizeLineEndings', 'limit', 'minPriority', 'maxPriority']);
/** Changes that do not replace this invocation's one agent/harness/model selection. */
const FINITE_LIVE_SETTINGS = new Set(['browserMode', 'browserProfile', 'waitBetweenPrompts', 'waitAfterPrompt', 'waitAfterError', 'preserveLogs', 'noQuestions', 'allowCredits', 'check', 'autoPull', 'autoPush', 'normalizeLineEndings', 'limit', 'minPriority', 'maxPriority']);

/** Attach a finite engine invocation to the common dashboard and an optional guarded page.
 * @private Internal run/fix presentation; HTTP and browser ownership end with this invocation.
 */
export async function createFiniteRuntime(workspace: Workspace, supplied: FiniteRuntimeOptions, cancel: () => void): Promise<{
    options: RunOptions; terminal: ReturnType<typeof createTerminal>; control: RuntimeControl;
    complete(result: RunResult): Promise<void>; close(): Promise<void>;
}> {
    validateRunOptions(supplied);
    if (await serviceCommand(workspace)) throw new InputError('This project already has an active service. Use ptbk dashboard, or stop it before starting finite work; no second dashboard/tunnel was created.');
    const engineVersion = await installedEngineVersion();
    const options: RunOptions = { ...supplied };
    const browser = new ProjectBrowser(workspace, { mode: supplied.browserMode, profile: supplied.browserProfile, signal: supplied.signal });
    const events: EngineEvent[] = [];
    const statistics = { completed: 0, failed: 0, startedAt: Date.now() };
    const restartSettings: Partial<FiniteRuntimeOptions> = {};
    let pending: Partial<FiniteRuntimeOptions> = {};
    let paused = false; let finishing = false; let waiting = false; let skip = false; let closed = false;
    let phase = 'ready'; let currentTask: string | undefined; let occurrence: string | undefined;
    let currentSelection: Record<string, unknown> | undefined;
    let failure: { error: string; diagnostic?: string; nextAction?: string } | undefined;
    let lastResult: RunResult | undefined; let url: string | undefined; let refreshing: Promise<void> | undefined;
    let page: Awaited<ReturnType<typeof openDashboard>> | undefined;
    /** Return actual shared queue and request state; inspection never starts another engine. */
    const snapshot = async (): Promise<Record<string, unknown>> => {
        const tasks = await discoverTasks(workspace); const ledger = await readLedger(workspace);
        const selected = tasks.find(task => task.id === currentTask);
        return identifyRuntime({ engineVersion, project: workspace.projectPath, mode: supplied.interactive ? 'interactive' : 'raw', lifetime: 'finite', status: lastResult ? lastResult.exitCode ? 'failed' : 'completed' : paused ? 'paused' : currentTask ? 'running' : 'ready', phase, paused, pausePending: paused && Boolean(currentTask), running: Boolean(currentTask), waiting, currentTask, finishAfterTask: finishing,
            currentSelection: currentSelection ?? { agent: options.agent ?? selected?.agent ?? 'Developer', harness: options.harness ?? selected?.harness, model: options.model ?? selected?.model, thinkingLevel: options.thinkingLevel ?? selected?.thinkingLevel }, ...failure,
            statistics, lastResult, url, ...(page?.connection() ?? {}), configurationSources: options.configurationSources, settings: JSON.parse(JSON.stringify(options, (_key, value) => typeof value === 'function' || value instanceof AbortSignal ? undefined : value)), pendingSettings: pending, restartSettings,
            settingsCapabilities: { live: [...FINITE_LIVE_SETTINGS], requiresRestart: [...FINITE_SETTINGS].filter(key => !FINITE_LIVE_SETTINGS.has(key)), temporary: true, explanation: 'Finite work keeps one execution selection. Other settings apply to future tasks at a safe boundary.' },
            controlCapabilities: { actions: ['inspect', 'pause', 'resume', 'skip-wait', 'finish', 'stop', 'answer', 'settings', 'harnesses'] },
            tasks: await Promise.all(tasks.map(async task => ({ ...task, status: ledger.tasks[task.id]?.claim ? 'in-progress' : task.status, eligibility: await taskEligibility(workspace, task, options, ledger) }))), requests: await listRequests(workspace, true), browser: browser.status(), events,
            harnessCatalog: getHarnessCatalog().map(({ id, name, displayName, featured }) => ({ id, name, displayName, featured })) }, await discoverAgents(workspace.projectPath));
    };
    const control: RuntimeControl = { token: randomUUID(), snapshot,
        async command(action, input = {}) {
            if (closed) throw new InputError('This finite invocation has finished.');
            if (action === 'inspect') return snapshot();
            if (action === 'pause' || action === 'resume') { paused = action === 'pause'; terminal.setPaused(paused); }
            else if (action === 'skip-wait') { skip = waiting; return { skipped: skip }; }
            else if (action === 'finish') {
                const cancelOwnedWork = finishing; finishing = true; terminal.setStopping(true);
                if (cancelOwnedWork) cancel();
                await refresh(); return { finishAfterTask: true, cancellationRequested: cancelOwnedWork };
            }
            else if (action === 'stop') cancel();
            else if (action === 'answer') {
                if (typeof input.id !== 'string' || typeof input.response !== 'string') throw new InputError('Answer requires a request id and response.');
                return answerRequest(workspace, input.id, input.response);
            } else if (action === 'harnesses') {
                if (input.more !== undefined && typeof input.more !== 'boolean' || input.name !== undefined && typeof input.name !== 'string') throw new InputError('Harness inspection accepts a name or boolean more choice.');
                if (typeof input.name === 'string') {
                    const harness = getHarness(input.name);
                    return { id: harness.id, name: harness.name, displayName: harness.displayName, featured: harness.featured,
                        capabilities: { toolDiscovery: harness.toolDiscovery, readOnly: Boolean(harness.readOnlyTools) }, thinkingLevels: harness.thinkingLevels,
                        defaultModel: harness.defaultModel, models: 'Unknown; use native harness inspection to discover available models.' };
                }
                return (input.more ? HARNESS_REGISTRY : getHarnessCatalog()).map(({ id, name, displayName, featured }) => ({ id, name, displayName, featured }));
            } else if (action === 'settings') {
                if (input.save) throw new InputError('Saving defaults is available through the project service; finite settings are temporary.');
                if (!input.settings || typeof input.settings !== 'object' || Array.isArray(input.settings)) throw new InputError('settings must be an object.');
                const update = input.settings as Partial<FiniteRuntimeOptions>;
                for (const [key, value] of Object.entries(update)) {
                    if (!FINITE_SETTINGS.has(key)) throw new InputError(`Unknown/immutable setting ${key}.`);
                    if (['harness', 'agent', 'model', 'thinkingLevel', 'context', 'browserProfile', 'check'].includes(key) && (typeof value !== 'string' || !value.trim())) throw new InputError(`${key} must be a nonempty string.`);
                    if (['preserveLogs', 'noQuestions', 'allowCredits', 'autoPull', 'autoPush', 'isolate', 'normalizeLineEndings'].includes(key) && typeof value !== 'boolean') throw new InputError(`${key} must be a boolean.`);
                }
                if (update.harness) getHarness(update.harness);
                if (update.browserMode !== undefined && !['headless', 'headful'].includes(update.browserMode)) throw new InputError('browserMode must be headless or headful.');
                if (update.checkBefore !== undefined && !['no', 'yes-and-fail', 'yes-and-fix'].includes(update.checkBefore)) throw new InputError('Invalid checkBefore setting.');
                if (update.gitChanges !== undefined && !['fail', 'ignore', 'continue'].includes(update.gitChanges)) throw new InputError('Invalid gitChanges setting.');
                validateRunOptions({ ...options, ...restartSettings, ...pending, ...update });
                if (update.browserMode !== undefined || update.browserProfile !== undefined) await browser.validateConfiguration({ ...(update.browserMode ? { mode: update.browserMode } : {}), ...(update.browserProfile !== undefined ? { profile: update.browserProfile } : {}) });
                for (const [key, value] of Object.entries(update)) Object.assign(FINITE_LIVE_SETTINGS.has(key) ? pending : restartSettings, { [key]: value });
                await refresh();
                return { active: JSON.parse(JSON.stringify(options)), pending, requiresRestart: restartSettings, savedDefaults: false };
            } else throw new InputError(`Unknown control action ${action}.`);
            await refresh(); return { paused, pausePending: paused && Boolean(currentTask), finishAfterTask: finishing };
        },
    };
    const terminal = createTerminal(Boolean(supplied.interactive), cancel, workspace.projectPath, { noQr: supplied.noQr, onControl: async action => {
        if (action === 'requests') {
            const requests = await listRequests(workspace, true);
            if (!requests.length) { terminal.status('There are no pending user requests.'); return; }
            const selected = await terminal.choose('Choose a pending request to answer:', [...requests.map(item => ({ value: item.id, label: item.prompt, description: item.reason })), { value: 'cancel', label: 'Cancel', description: 'Leave the requests pending.' }]);
            const request = requests.find(item => item.id === selected);
            if (!request) return;
            const response = request.choices?.length
                ? request.choices[Number(await terminal.choose(request.prompt, request.choices.map((label, index) => ({ value: String(index), label }))))]!
                : await terminal.question(request.prompt);
            if (response.trim()) await control.command('answer', { id: request.id, response });
        } else if (action === 'settings') {
            const value = await terminal.question(`Temporary runtime settings as JSON (blank to cancel).\nLive at the next safe boundary: ${[...FINITE_LIVE_SETTINGS].join(', ')}\nNext invocation only: ${[...FINITE_SETTINGS].filter(key => !FINITE_LIVE_SETTINGS.has(key)).join(', ')}\nPacing values use milliseconds.`);
            if (value.trim()) terminal.status(JSON.stringify(await control.command('settings', { settings: JSON.parse(value) })));
        } else if (action === 'inventory') {
            let more = false;
            while (true) {
                const entries = await control.command('harnesses', { more }) as Array<Record<string, any>>;
                const picked = await terminal.choose(more ? 'All harnesses:' : 'Featured harnesses:', [...entries.map(item => ({ value: String(item.name), label: String(item.displayName) })),
                    { value: more ? '@featured' : '@more', label: more ? 'Back to featured' : 'More harnesses' }, { value: '@cancel', label: 'Return to dashboard' }]);
                if (picked === '@cancel') break;
                if (picked === '@more' || picked === '@featured') { more = picked === '@more'; continue; }
                const detail = await control.command('harnesses', { name: picked });
                await terminal.choose(`Harness details:\n${JSON.stringify(detail, null, 2)}`, [{ value: '@back', label: 'Back to harnesses' }]);
            }
        } else terminal.status(JSON.stringify(await control.command(action)));
    } });
    /** Serialize refreshes so a slow read cannot overwrite more recent state or recreate closed UI. */
    const refresh = async () => {
        if (closed || refreshing) return refreshing;
        refreshing = snapshot().then(state => { if (!closed) terminal.setSnapshot({ ...state, ...(supplied.interactive ? page?.trustedConnection() : {}) }); }).finally(() => { refreshing = undefined; });
        return refreshing;
    };
    const refreshTimer = setInterval(() => { void refresh().catch(error => terminal.status(`Dashboard refresh failed: ${(error as Error).message}`)); }, 1000);
    refreshTimer.unref();
    /** Release only this invocation's UI/browser/server; completion cannot keep the process alive. */
    const close = async () => {
        if (closed) return;
        closed = true; clearInterval(refreshTimer); terminal.close();
        const cleanup = await Promise.allSettled([refreshing, browser.close(), page?.close()]);
        const rejected = cleanup.find((entry): entry is PromiseRejectedResult => entry.status === 'rejected');
        if (rejected) throw rejected.reason;
    };
    try {
        if (supplied.noServer === false) { page = await openDashboard(workspace, control, supplied.port, supplied); await page.startTunnel(); url = page.url; terminal.status(connectionDetails({ ...page.connection(), status: 'ready' }, false).join('\n')); }
        await refresh();
    } catch (error) { await close(); throw error; }
    options.isPaused = () => paused || terminal.isPaused();
    options.shouldStop = () => finishing || terminal.shouldStop();
    options.skipWait = () => { const requested = waiting && (skip || terminal.skipWait()); skip = false; return requested; };
    options.onWait = value => { waiting = value; terminal.setWaiting(value); supplied.onWait?.(value); };
    if (supplied.noAuto && supplied.interactive) options.confirm = async (_step, message) => await terminal.choose(message, [{ value: 'yes', label: 'Yes, continue' }, { value: 'no', label: 'No, decline' }], 'no') === 'yes';
    options.onOutput = text => { terminal.output(text); supplied.onOutput?.(text); };
    options.onEvent = event => {
        events.push({ ...event, message: redactSecrets(event.message, workspace.projectPath) }); if (events.length > 160) events.shift();
        if (event.type !== 'output') {
            phase = event.type;
            if (event.taskId && ['claimed', 'selection'].includes(event.type)) currentTask = event.taskId;
            if (event.type === 'selection') currentSelection = { agent: event.agent, agentName: event.agentName, harness: event.harness, model: event.model, thinkingLevel: event.thinkingLevel };
            if (event.type === 'error') failure = { error: event.message, diagnostic: typeof event.trace === 'string' ? event.trace : undefined, nextAction: typeof event.nextAction === 'string' ? event.nextAction : undefined };
            if (event.type === 'claimed') occurrence = event.occurrenceId;
            if (event.type === 'completed') { statistics.completed++; currentTask = undefined; occurrence = undefined; }
            if (event.type === 'failed' || event.type === 'error') statistics.failed++;
            terminal.status(`${event.type}: ${event.message}`); void refresh().catch(() => {});
        }
        supplied.onEvent?.(event);
    };
    options.onTaskBoundary = async activeOptions => {
        currentTask = undefined; occurrence = undefined;
        if (pending.browserMode || pending.browserProfile !== undefined) await browser.configure({ ...(pending.browserMode ? { mode: pending.browserMode } : {}), ...(pending.browserProfile !== undefined ? { profile: pending.browserProfile } : {}) });
        Object.assign(activeOptions, pending); pending = {};
        await supplied.onTaskBoundary?.(activeOptions);
        await refresh();
    };
    options.toolsForHarness = (harness, taskId, occurrenceId) => [...(supplied.toolsForHarness?.(harness, taskId, occurrenceId) ?? []), ...(getHarness(harness).toolDiscovery ? browserTools(browser, taskId, () => occurrenceId) : [])];
    return { options, terminal, control, close, async complete(result) { lastResult = result; statistics.completed = result.completed; statistics.failed = result.failed; currentTask = undefined; phase = result.exitCode ? 'failed' : 'completed'; await refresh(); } };
}
