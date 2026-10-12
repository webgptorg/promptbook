import { randomUUID } from 'node:crypto';
import type { Workspace } from './domain.js';
import { type RunOptions, type RunResult, type EngineEvent, taskEligibility, validateRunOptions } from './engine.js';
import { discoverTasks } from './sources.js';
import { readLedger } from './state.js';
import { createTerminal } from './terminal.js';
import { openDashboard, type RuntimeControl } from './service.js';
import { installedEngineVersion } from './version.js';
import { answerRequest, listRequests } from './requests.js';
import { ProjectBrowser, browserTools } from './browser.js';
import { getHarness, getHarnessCatalog, redactSecrets } from './harness.js';
import { InputError } from './workspace.js';

/** Finite presentation uses the same state/control channels without creating a supervisor. @private */
export interface FiniteRuntimeOptions extends RunOptions {
    interactive?: boolean; noServer?: boolean; port?: number;
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
        return { engineVersion, project: workspace.projectPath, mode: supplied.interactive ? 'interactive' : 'raw', lifetime: 'finite', status: lastResult ? lastResult.exitCode ? 'failed' : 'completed' : paused ? 'paused' : currentTask ? 'running' : 'ready', phase, paused, pausePending: paused && Boolean(currentTask), running: Boolean(currentTask), waiting, currentTask,
            currentSelection: currentSelection ?? { agent: options.agent ?? selected?.agent ?? 'Developer', harness: options.harness ?? selected?.harness, model: options.model ?? selected?.model, thinkingLevel: options.thinkingLevel ?? selected?.thinkingLevel }, ...failure,
            statistics, lastResult, url, configurationSources: options.configurationSources, settings: JSON.parse(JSON.stringify(options, (_key, value) => typeof value === 'function' || value instanceof AbortSignal ? undefined : value)), pendingSettings: pending, restartSettings,
            settingsCapabilities: { live: [...FINITE_LIVE_SETTINGS], requiresRestart: [...FINITE_SETTINGS].filter(key => !FINITE_LIVE_SETTINGS.has(key)), temporary: true, explanation: 'Finite work keeps one execution selection. Other settings apply to future tasks at a safe boundary.' },
            tasks: await Promise.all(tasks.map(async task => ({ ...task, status: ledger.tasks[task.id]?.claim ? 'in-progress' : task.status, eligibility: await taskEligibility(workspace, task, options, ledger) }))), requests: await listRequests(workspace, true), browser: browser.status(), events,
            harnessCatalog: getHarnessCatalog().map(({ id, name, displayName, featured }) => ({ id, name, displayName, featured })) };
    };
    const control: RuntimeControl = { token: randomUUID(), snapshot,
        async command(action, input = {}) {
            if (closed) throw new InputError('This finite invocation has finished.');
            if (action === 'inspect') return snapshot();
            if (action === 'pause' || action === 'resume') { paused = action === 'pause'; terminal.setPaused(paused); }
            else if (action === 'skip-wait') { skip = waiting; return { skipped: skip }; }
            else if (action === 'finish') { finishing = !finishing; terminal.setStopping(finishing); return { finishAfterTask: finishing }; }
            else if (action === 'stop') cancel();
            else if (action === 'answer') {
                if (typeof input.id !== 'string' || typeof input.response !== 'string') throw new InputError('Answer requires a request id and response.');
                return answerRequest(workspace, input.id, input.response);
            } else if (action === 'harnesses') {
                if (input.more !== undefined && typeof input.more !== 'boolean') throw new InputError('more must be a boolean.');
                return getHarnessCatalog({ includeMore: input.more === true }).map(({ id, name, displayName, featured }) => ({ id, name, displayName, featured }));
            } else if (action === 'settings') {
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
    const terminal = createTerminal(Boolean(supplied.interactive), cancel, workspace.projectPath, { onControl: async action => {
        if (action === 'requests') {
            const requests = await listRequests(workspace, true);
            if (!requests.length) { terminal.status('There are no pending user requests.'); return; }
            const request = requests.length === 1 ? requests[0] : requests[Number(await terminal.question(`Request number (1–${requests.length}, blank to cancel):\n${requests.map((item, index) => `${index + 1}. ${item.prompt}`).join('\n')}`)) - 1];
            if (!request) return;
            const response = await terminal.question(request.prompt);
            if (response.trim()) await control.command('answer', { id: request.id, response });
        } else if (action === 'settings') {
            const value = await terminal.question('Settings for the next finite invocation as JSON (blank to cancel):');
            if (value.trim()) terminal.status(JSON.stringify(await control.command('settings', { settings: JSON.parse(value) })));
        } else terminal.status(JSON.stringify(await control.command(action)));
    } });
    /** Serialize refreshes so a slow read cannot overwrite more recent state or recreate closed UI. */
    const refresh = async () => {
        if (closed || refreshing) return refreshing;
        refreshing = snapshot().then(state => { if (!closed) terminal.setSnapshot(state); }).finally(() => { refreshing = undefined; });
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
        if (supplied.noServer === false) { page = await openDashboard(workspace, control, supplied.port); url = page.sessionUrl; terminal.status(`Dashboard: ${url}`); }
        await refresh();
    } catch (error) { await close(); throw error; }
    options.isPaused = () => paused || terminal.isPaused();
    options.shouldStop = () => finishing || terminal.shouldStop();
    options.skipWait = () => { const requested = waiting && (skip || terminal.skipWait()); skip = false; return requested; };
    options.onWait = value => { waiting = value; terminal.setWaiting(value); supplied.onWait?.(value); };
    if (supplied.noAuto && supplied.interactive) options.confirm = async (_step, message) => /^(?:y|yes)$/i.test((await terminal.question(`${message}\nAnswer yes or no`)).trim());
    options.onOutput = text => { terminal.output(text); supplied.onOutput?.(text); };
    options.onEvent = event => {
        events.push({ ...event, message: redactSecrets(event.message, workspace.projectPath) }); if (events.length > 160) events.shift();
        if (event.type !== 'output') {
            phase = event.type;
            if (event.taskId && ['claimed', 'selection'].includes(event.type)) currentTask = event.taskId;
            if (event.type === 'selection') currentSelection = { agent: event.agent, harness: event.harness, model: event.model, thinkingLevel: event.thinkingLevel };
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
