import { runtimeJson } from './http.js';
import { activeConsumers, forgetOwnedService, ownedService, recordOwnedService, withHostOperation, type HostOperation } from './host.js';
import { stopLmStudioServer } from './lm-studio.js';
import { runtimeAdapter } from './registry.js';
import type { RuntimeAction, RuntimeAdapter, RuntimeContext, RuntimeModel, RuntimeObservation, RuntimeProgress } from './types.js';
import type { InferenceRuntimeToolRecord } from '../tools/model.js';

/**
 * One requested runtime operation of a project's runtime reference.
 *
 * @private local runtime management
 */
export type RuntimeActionRequest = {
    /** The INFERENCE_RUNTIME tool name. */
    readonly runtime: string;
    readonly action: RuntimeAction;
    /** Model identifier of model actions. */
    readonly model?: string;
    /** Explicit destructive acknowledgement (`--yes`): model removal and stopping a service Promptbook did not start. */
    readonly acknowledged?: boolean;
};

/**
 * Honest outcome of a runtime operation (host state only; never a project commit).
 *
 * @private local runtime management
 */
export type RuntimeActionOutcome = {
    /** `completed`, `refused` (unsafe now or needs acknowledgement), `unsupported`, `failed` or `cancelled`. */
    readonly status: 'completed' | 'refused' | 'unsupported' | 'failed' | 'cancelled';
    readonly action: RuntimeAction;
    readonly runtime: string;
    readonly summary: string;
    readonly notes: readonly string[];
    /** Concrete next steps (manual commands where Promptbook does not act). */
    readonly next: readonly string[];
    /** The fresh observation after the operation. */
    readonly observation?: RuntimeObservation;
    /** The catalog of `models`. */
    readonly models?: readonly RuntimeModel[];
};

/**
 * Inputs of a runtime operation.
 *
 * @private local runtime management
 */
export type RuntimeActionContext = {
    readonly tool: InferenceRuntimeToolRecord;
    readonly env: NodeJS.ProcessEnv;
    /** The requesting project (recorded with host operations and owned services). */
    readonly project?: string;
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: RuntimeProgress) => void;
    /** Another engine holds this resource's maintenance: the request waits for it, then decides again. */
    readonly onWait?: (holder: HostOperation) => void;
};

/**
 * Actions that only read.
 */
const READ_ONLY: ReadonlySet<RuntimeAction> = new Set(['status', 'models']);

/**
 * Actions that need a model identifier.
 */
const MODEL_ACTIONS: ReadonlySet<RuntimeAction> = new Set(['download', 'load', 'unload', 'remove-model']);

/**
 * Manual update/uninstall guidance where Promptbook does not maintain the shared installation itself.
 */
function manualMaintenance(adapter: RuntimeAdapter, action: 'update' | 'uninstall', platform: NodeJS.Platform): string[] {
    if (adapter.variant === 'OLLAMA') {
        if (action === 'update') return platform === 'darwin' ? ['Homebrew installation: brew upgrade ollama', 'Ollama app: it updates itself (or download the current release from https://ollama.com/download).'] : platform === 'linux' ? ['Run the official installer again: curl -fsSL https://ollama.com/install.sh | sh'] : ['Ollama for Windows updates itself (or: winget upgrade Ollama.Ollama).'];
        return platform === 'darwin' ? ['Homebrew installation: brew uninstall ollama (downloaded models stay in ~/.ollama unless you delete them).', 'Ollama app: quit it and move it to the Trash.'] : platform === 'linux' ? ['Follow https://github.com/ollama/ollama/blob/main/docs/linux.md#uninstall (it removes the system service).'] : ['Uninstall Ollama in Settings → Apps (or: winget uninstall Ollama.Ollama).'];
    }
    return action === 'update' ? ['Update LM Studio from its own app (or `lms` follows the installed app version).'] : ['Uninstall LM Studio with your operating system (downloaded models stay in its models folder unless you delete them).'];
}

/**
 * Whether an observation shows a running service.
 */
async function observe(adapter: RuntimeAdapter, context: RuntimeContext): Promise<RuntimeObservation> {
    return await adapter.inspect(context);
}

/**
 * Waits until a stopped service no longer answers (bounded).
 */
async function waitStopped(endpoint: string): Promise<boolean> {
    for (let attempt = 0; attempt < 40; attempt++) {
        try {
            await runtimeJson(`${endpoint}/api/version`, { timeoutMs: 500 });
        } catch {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
}

/**
 * Runs one runtime operation on the actual shared host resource: read-only inspection, or a maintenance action that
 * is serialized with every other engine of this OS user, revalidated against active consumers at execution and never
 * recorded in project Git. Disabling/removing a project's reference is a separate tool operation and never reaches here.
 *
 * @private local runtime management
 */
export async function runRuntimeAction(context: RuntimeActionContext, request: RuntimeActionRequest): Promise<RuntimeActionOutcome> {
    const adapter = runtimeAdapter(context.tool.variant);
    const runtimeContext: RuntimeContext = { tool: context.tool, env: context.env, ...(context.signal ? { signal: context.signal } : {}) };
    const base = { action: request.action, runtime: context.tool.name };
    const outcome = (status: RuntimeActionOutcome['status'], summary: string, extra: Partial<Pick<RuntimeActionOutcome, 'notes' | 'next' | 'observation' | 'models'>> = {}): RuntimeActionOutcome => ({ ...base, status, summary, notes: extra.notes ?? [], next: extra.next ?? [], ...(extra.observation ? { observation: extra.observation } : {}), ...(extra.models ? { models: extra.models } : {}) });

    if (request.action === 'update' || request.action === 'uninstall') {
        return outcome('unsupported', `Promptbook does not ${request.action} the shared ${adapter.displayName} installation itself: other projects and applications on this computer may use it.`, { next: manualMaintenance(adapter, request.action, process.platform) });
    }
    if (!adapter.actions.includes(request.action)) {
        return outcome('unsupported', `${adapter.displayName} has no supported "${request.action}" action in Promptbook.`, { next: [`Supported: ${adapter.actions.join(', ')}.`] });
    }
    if (MODEL_ACTIONS.has(request.action) && !request.model) return outcome('refused', `ptbk tool runtime ${context.tool.name} ${request.action} needs the model identifier.`, { next: [`ptbk tool runtime ${context.tool.name} models`] });

    const before = await observe(adapter, runtimeContext);
    if (READ_ONLY.has(request.action)) {
        return outcome(before.running || before.problem !== 'error' ? 'completed' : 'failed', before.summary, { observation: before, ...(request.action === 'models' ? { models: before.models ?? [] } : {}), ...(before.nextAction ? { next: [before.nextAction] } : {}) });
    }

    const model = request.model;
    const consumers = async (filter?: string): Promise<string[]> => (await activeConsumers(context.env, before.resourceKey)).filter((consumer) => !filter || consumer.model === filter).map((consumer) => `${consumer.tool} in ${consumer.project} (${consumer.purpose}${consumer.model ? `, ${consumer.model}` : ''})`);
    const label = `${request.action}${model ? ` ${model}` : ''} on ${adapter.displayName} (${before.endpoint})`;
    try {
        return await withHostOperation(
            context.env,
            { key: before.resourceKey, label, ...(context.project ? { project: context.project } : {}) },
            async () => {
                // Decide again on the fresh state: another engine may have finished the same work meanwhile.
                const current = await observe(adapter, runtimeContext);
                const has = (id: string): RuntimeModel | undefined => current.models?.find((entry) => entry.id === id);
                switch (request.action) {
                    case 'download': {
                        if (!current.running) return outcome('refused', `${adapter.displayName} is not running at ${current.endpoint}.`, { observation: current, next: [`ptbk tool runtime ${context.tool.name} start`] });
                        const existing = has(model!);
                        if (existing?.installed) return outcome('completed', `${model} is already downloaded${existing.digest ? ` (${existing.digest.slice(0, 12)})` : ''}; it is reused.`, { observation: current });
                        await adapter.download!(runtimeContext, model!, (progress) => context.onProgress?.(progress));
                        const after = await observe(adapter, runtimeContext);
                        if (!after.models?.some((entry) => entry.id === model && entry.installed)) return outcome('failed', `${adapter.displayName} finished, but ${model} is not listed as downloaded.`, { observation: after });
                        return outcome('completed', `Downloaded ${model}.`, { observation: after, notes: ['The weights are shared on this computer (outside project Git).'] });
                    }
                    case 'load': {
                        if (!current.running) return outcome('refused', `${adapter.displayName} is not running.`, { observation: current, next: [`ptbk tool runtime ${context.tool.name} start`] });
                        if (!has(model!)?.installed) return outcome('refused', `${model} is not downloaded.`, { observation: current, next: [`ptbk tool runtime ${context.tool.name} download ${model}`] });
                        await adapter.load!(runtimeContext, model!);
                        return outcome('completed', `Loaded ${model}.`, { observation: await observe(adapter, runtimeContext) });
                    }
                    case 'unload': {
                        const users = await consumers(model);
                        if (users.length) return outcome('refused', `${model} is in use by ${users.join('; ')}; it is not unloaded under active work.`, { observation: current, next: ['Retry when that work has finished.'] });
                        if (!current.running) return outcome('completed', `${adapter.displayName} is not running; nothing is loaded.`, { observation: current });
                        await adapter.unload!(runtimeContext, model!);
                        return outcome('completed', `Unloaded ${model} (it loads again on demand).`, { observation: await observe(adapter, runtimeContext) });
                    }
                    case 'remove-model': {
                        if (!request.acknowledged) return outcome('refused', `Removing ${model} deletes its weights from ${adapter.displayName} on this computer for every project and application that uses them.`, { observation: current, next: [`Confirm: ptbk tool runtime ${context.tool.name} remove-model ${model} --yes`] });
                        const users = await consumers(model);
                        if (users.length) return outcome('refused', `${model} is in use by ${users.join('; ')}; it is not removed under active work.`, { observation: current });
                        if (!current.running) return outcome('refused', `${adapter.displayName} is not running.`, { observation: current, next: [`ptbk tool runtime ${context.tool.name} start`] });
                        if (!has(model!)) return outcome('completed', `${model} is not downloaded; nothing to remove.`, { observation: current });
                        await adapter.removeModel!(runtimeContext, model!);
                        return outcome('completed', `Removed ${model} from ${adapter.displayName} on this computer.`, { observation: await observe(adapter, runtimeContext), notes: ['Consumers outside Promptbook are not known to Promptbook.'] });
                    }
                    case 'start': {
                        if (current.running) return outcome('completed', `${adapter.displayName} is already running at ${current.endpoint}.`, { observation: current });
                        if (!current.onEngineHost) return outcome('refused', `${current.endpoint} is not on the engine host; Promptbook starts only local services.`, { observation: current });
                        if (current.problem === 'missing') return outcome('refused', current.summary, { observation: current, next: [current.nextAction ?? 'ptbk tool setup-local'] });
                        const pid = await adapter.start!(runtimeContext);
                        if (pid) await recordOwnedService(context.env, { resourceKey: current.resourceKey, pid, by: context.project ?? 'ptbk' });
                        const after = await observe(adapter, runtimeContext);
                        return outcome(after.running ? 'completed' : 'failed', after.running ? `Started ${adapter.displayName} at ${after.endpoint}${pid ? ' (Promptbook started it; it keeps running for other projects)' : ''}.` : after.summary, { observation: after });
                    }
                    case 'stop':
                    case 'restart': {
                        const users = await consumers();
                        if (users.length) return outcome('refused', `${adapter.displayName} is in use by ${users.join('; ')}; it is not ${request.action === 'stop' ? 'stopped' : 'restarted'} under active work.`, { observation: current, next: ['Retry when that work has finished.'] });
                        if (!current.running) {
                            if (request.action === 'stop') return outcome('completed', `${adapter.displayName} is not running.`, { observation: current });
                        } else {
                            const owned = await ownedService(context.env, current.resourceKey);
                            if (owned) {
                                process.kill(owned.pid, 'SIGTERM');
                                await waitStopped(current.endpoint);
                                await forgetOwnedService(context.env, current.resourceKey);
                            } else if (adapter.variant === 'LM_STUDIO') {
                                if (!request.acknowledged) return outcome('refused', `Promptbook did not start this LM Studio server; other applications may use it.`, { observation: current, next: [`Confirm: ptbk tool runtime ${context.tool.name} ${request.action} --yes`] });
                                await stopLmStudioServer(runtimeContext);
                            } else {
                                return outcome('refused', `Promptbook did not start this ${adapter.displayName} service (an app or system service owns it), so it does not stop it.`, {
                                    observation: current,
                                    next: process.platform === 'darwin' ? ['Quit the Ollama app from its menu-bar icon, or: brew services stop ollama'] : process.platform === 'linux' ? ['sudo systemctl stop ollama'] : ['Quit Ollama from its tray icon.'],
                                });
                            }
                        }
                        if (request.action === 'stop') return outcome('completed', `Stopped ${adapter.displayName}.`, { observation: await observe(adapter, runtimeContext), notes: ['Downloaded models stay installed.'] });
                        const pid = await adapter.start!(runtimeContext);
                        if (pid) await recordOwnedService(context.env, { resourceKey: current.resourceKey, pid, by: context.project ?? 'ptbk' });
                        const after = await observe(adapter, runtimeContext);
                        return outcome(after.running ? 'completed' : 'failed', after.running ? `Restarted ${adapter.displayName}.` : after.summary, { observation: after });
                    }
                    default:
                        return outcome('unsupported', `Unknown runtime action "${request.action}".`);
                }
            },
            { ...(context.signal ? { signal: context.signal } : {}), ...(context.onWait ? { onWait: context.onWait } : {}) },
        );
    } catch (error) {
        if (context.signal?.aborted) return outcome('cancelled', `Cancelled ${label}. Partial download data stays resumable in ${adapter.displayName}; nothing is reported as installed.`);
        return outcome('failed', `${label} failed: ${(error as Error).message}`, { observation: await observe(adapter, runtimeContext).catch(() => before) });
    }
}
