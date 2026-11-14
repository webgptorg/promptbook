import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { which } from '../common/process.js';
import { redact } from '../common/redact.js';
import { HarnessPool } from '../engine/harnesses.js';
import { functionalCheck, localCapabilityChecks, type CapabilityCheck, type FunctionalCheck, type PreparatoryCall } from '../harness/preparation.js';
import { HARNESS_PLUGINS, harnessPlugin } from '../harness/registry.js';
import { resolveSettings } from '../project/config.js';
import { harnessPluginId, runtimeVariantLabel, type HarnessToolRecord, type HarnessVariant, type InferenceRuntimeToolRecord, type InferenceRuntimeVariant, type ToolRecord } from '../tools/model.js';
import type { ToolDraft, ToolOperation } from '../tools/operations.js';
import { knownLocalModel, LOCAL_COMBINATIONS, recommendLocalModel, type LocalCombination, type LocalRecommendation } from './catalog.js';
import { discoverHardware, formatBytes, type HostHardware } from './hardware.js';
import { runRuntimeAction } from './management.js';
import { RUNTIME_ADAPTERS, runtimeAdapter } from './registry.js';
import type { RuntimeInstallation, RuntimeObservation } from './types.js';

/**
 * Honest stages of one local setup (operation/resource observations, never engine lifecycle states).
 *
 * @private local model setup
 */
export type LocalSetupStage = 'discovering' | 'needs-installation' | 'installing' | 'starting' | 'downloading' | 'loading' | 'verifying' | 'ready' | 'failed' | 'cancelled';

/**
 * Progress of a local setup.
 *
 * @private local model setup
 */
export type LocalSetupProgress = { readonly stage: LocalSetupStage; readonly message: string; readonly completedBytes?: number; readonly totalBytes?: number };

/**
 * What the engine host offers for local models.
 *
 * @private local model setup
 */
export type LocalSetupDiscovery = {
    readonly hardware: HostHardware;
    readonly runtimes: ReadonlyArray<{
        readonly variant: InferenceRuntimeVariant;
        readonly displayName: string;
        readonly observation: RuntimeObservation;
        /** The supported installation route when the runtime is missing (absent: manual installation only). */
        readonly installation?: RuntimeInstallation;
    }>;
    readonly harnesses: ReadonlyArray<{ readonly variant: HarnessVariant; readonly displayName: string; readonly executablePath?: string; readonly runtimes: readonly InferenceRuntimeVariant[] }>;
};

/**
 * Editable selections of the journey (discovered/recommended values fill what is omitted).
 *
 * @private local model setup
 */
export type LocalSetupChoices = {
    readonly runtime?: InferenceRuntimeVariant;
    readonly model?: string;
    readonly harness?: HarnessVariant;
    /** A non-default service URL of the runtime. */
    readonly endpoint?: string;
    readonly runtimeName?: string;
    readonly connectionName?: string;
};

/**
 * The concrete setup for this host: what is reused, what is prepared and what is saved.
 *
 * @private local model setup
 */
export type LocalSetupPlan = {
    readonly runtime: InferenceRuntimeVariant;
    readonly harness: HarnessVariant;
    readonly model?: string;
    readonly endpoint?: string;
    readonly combination?: LocalCombination;
    readonly recommendation: LocalRecommendation;
    /** Existing project records reused by name. */
    readonly reuse: { readonly runtime?: string; readonly connection?: string };
    readonly names: { readonly runtime: string; readonly connection: string };
    /** New records saved together (empty: everything is already configured). */
    readonly drafts: readonly ToolDraft[];
    readonly steps: { readonly install?: RuntimeInstallation; readonly start: boolean; readonly download: boolean; readonly downloadBytes?: number };
    /** What prevents this setup (it cannot be prepared as chosen). */
    readonly problems: readonly string[];
    /** Limitations and consequences worth knowing before consent. */
    readonly notes: readonly string[];
};

/**
 * Outcome of preparing and verifying a plan (saving is the caller's staged persistence).
 *
 * @private local model setup
 */
export type LocalSetupResult = {
    readonly status: 'ready' | 'failed' | 'cancelled' | 'needs-consent';
    readonly plan: LocalSetupPlan;
    readonly summary: string;
    readonly check?: FunctionalCheck;
    readonly capabilities: readonly CapabilityCheck[];
    /** The records to save (absent when nothing new is needed or the setup did not become ready). */
    readonly operation?: ToolOperation;
    /** Host prerequisites already completed (never rolled back by cancellation). */
    readonly completed: readonly string[];
    readonly pending: readonly string[];
};

/**
 * Discovers hardware, runtimes and harness executables of the engine host (read-only: never installs, downloads or
 * runs inference).
 *
 * @private local model setup
 */
export async function discoverLocalSetup(env: NodeJS.ProcessEnv, tools: readonly ToolRecord[] = [], options: { readonly endpoint?: string; readonly runtime?: InferenceRuntimeVariant; readonly signal?: AbortSignal } = {}): Promise<LocalSetupDiscovery> {
    const [hardware, runtimes, harnesses] = await Promise.all([
        discoverHardware(env),
        Promise.all(
            RUNTIME_ADAPTERS.map(async (adapter) => {
                const existing = tools.find((tool): tool is InferenceRuntimeToolRecord => tool.type === 'INFERENCE_RUNTIME' && tool.variant === adapter.variant && tool.isEnabled);
                const endpoint = options.runtime === adapter.variant && options.endpoint ? options.endpoint : existing?.endpoint;
                const observation = await adapter.inspect({ tool: { name: existing?.name ?? `local-${adapter.variant.toLowerCase().replace(/_/g, '-')}`, variant: adapter.variant, ...(endpoint ? { endpoint } : {}) }, env, ...(options.signal ? { signal: options.signal } : {}) });
                const installation = observation.problem === 'missing' ? await adapter.installation?.(process.platform, env) : undefined;
                return { variant: adapter.variant, displayName: adapter.displayName, observation, ...(installation ? { installation } : {}) };
            }),
        ),
        Promise.all(
            HARNESS_PLUGINS.filter((plugin) => plugin.endpoints.localConnection).map(async (plugin) => {
                const executablePath = await which(plugin.executable, env);
                return { variant: plugin.variant as HarnessVariant, displayName: plugin.displayName, ...(executablePath ? { executablePath } : {}), runtimes: Object.keys(plugin.endpoints.localConnection!.runtimes) as InferenceRuntimeVariant[] };
            }),
        ),
    ]);
    return { hardware, runtimes, harnesses };
}

/**
 * A unique kebab-case name (`base`, `base-2`, …) among the project's tools.
 */
function uniqueName(names: readonly string[], base: string): string {
    const taken = new Set(names);
    if (!taken.has(base)) return base;
    for (let index = 2; ; index++) if (!taken.has(`${base}-${index}`)) return `${base}-${index}`;
}

/**
 * Plans the setup from discovery and the user's selections: reuse healthy installations, models and project records
 * first; recommend a verified combination that fits; never silently fall back to cloud inference.
 *
 * @private local model setup
 */
export function planLocalSetup(discovery: LocalSetupDiscovery, tools: readonly ToolRecord[], choices: LocalSetupChoices = {}): LocalSetupPlan {
    const problems: string[] = [];
    const notes: string[] = [];
    // Default runtime: one that is already running with local models, else the automatic-install baseline (Ollama).
    const running = discovery.runtimes.find((entry) => entry.observation.running && entry.observation.models?.some((model) => model.locality === 'local'));
    const runtime = choices.runtime ?? running?.variant ?? 'OLLAMA';
    const harness = choices.harness ?? 'OPENAI_CODEX';
    const found = discovery.runtimes.find((entry) => entry.variant === runtime)!;
    const observation = found.observation;
    const harnessEntry = discovery.harnesses.find((entry) => entry.variant === harness);
    if (!harnessEntry) problems.push(`${harnessPlugin(harnessPluginId(harness))?.displayName ?? harness} has no verified local connection in Promptbook.`);
    else if (!harnessEntry.runtimes.includes(runtime)) problems.push(`${harnessEntry.displayName} is not verified with ${runtimeVariantLabel(runtime)} local connections (supported: ${harnessEntry.runtimes.map(runtimeVariantLabel).join(', ')}).`);
    else if (!harnessEntry.executablePath) problems.push(`${harnessEntry.displayName} is not installed on the engine host; install it first (as for its hosted use), then run the setup again.`);

    const installed = (observation.models ?? []).filter((model) => model.installed && model.locality === 'local');
    const recommendation = recommendLocalModel(discovery.hardware, runtime, harness, installed);
    const model = choices.model ?? recommendation.combination?.model;
    const combination = model ? knownLocalModel(runtime, model, harness) : undefined;
    if (!model) problems.push(recommendation.incompatibility ?? `No verified ${runtimeVariantLabel(runtime)} model is known for ${harnessEntry?.displayName ?? harness}; choose one explicitly.`);
    else if (!combination) notes.push(`${model} is not in Promptbook's verified catalog: the functional check decides whether it works with ${harnessEntry?.displayName ?? harness}.`);
    else if (choices.model && discovery.hardware.inferenceMemoryBytes < combination.minimumMemoryBytes) notes.push(`${model} needs about ${formatBytes(combination.minimumMemoryBytes)} of memory; this host has ${formatBytes(discovery.hardware.inferenceMemoryBytes)}. It may fail to load or run very slowly.`);
    notes.push(...recommendation.limitations);
    if (combination) notes.push(`${combination.model} by ${combination.manufacturer}, ${combination.quantization}, license ${combination.license}: ${combination.note}.`);

    const missing = observation.problem === 'missing';
    const install = missing ? found.installation : undefined;
    if (missing && !install) problems.push(`${found.displayName} is not installed and Promptbook offers no automatic installation for it on this platform: ${observation.nextAction ?? runtimeAdapter(runtime).homepage}`);
    if (missing && install && combination && !combination.automaticInstall) problems.push(`${found.displayName} is not installed automatically; install it from ${runtimeAdapter(runtime).homepage} and run the setup again.`);
    if (observation.problem === 'unreachable') problems.push(observation.summary);
    const servedModel = model ? observation.models?.find((entry) => entry.id === model) : undefined;
    if (servedModel && servedModel.locality !== 'local') problems.push(`${model} is ${servedModel.locality === 'cloud' ? 'a cloud model served through the local runtime' : 'not verifiably executed on the engine host'}; local setup never uses cloud inference.`);
    const download = Boolean(model) && !servedModel?.installed;
    if (download && combination && discovery.hardware.freeDiskBytes !== undefined && discovery.hardware.freeDiskBytes < combination.downloadBytes * 1.1) problems.push(`${model} needs about ${formatBytes(combination.downloadBytes)} of free disk space; ${formatBytes(discovery.hardware.freeDiskBytes)} is free.`);

    // Reuse an enabled runtime record of the same service and its credential-free connection.
    const endpoint = choices.endpoint ?? undefined;
    const runtimeRecord = tools.find((tool): tool is InferenceRuntimeToolRecord => tool.type === 'INFERENCE_RUNTIME' && tool.variant === runtime && tool.isEnabled && (choices.runtimeName ? tool.name === choices.runtimeName : (tool.endpoint ?? undefined) === endpoint));
    const runtimeName = runtimeRecord?.name ?? uniqueName(tools.map((tool) => tool.name), choices.runtimeName ?? `local-${runtime.toLowerCase().replace(/_/g, '-')}`);
    const connectionRecord = tools.find((tool): tool is HarnessToolRecord => tool.type === 'HARNESS' && tool.variant === harness && tool.inferenceRuntime === runtimeName && tool.authentication === 'NONE' && tool.isEnabled && (!choices.connectionName || tool.name === choices.connectionName));
    const plugin = harnessPlugin(harnessPluginId(harness));
    const connectionName = connectionRecord?.name ?? uniqueName([...tools.map((tool) => tool.name), runtimeName], choices.connectionName ?? `${plugin?.id.replace(/^openai-/, '') ?? harness.toLowerCase()}-local`);
    const drafts: ToolDraft[] = [
        ...(runtimeRecord ? [] : [{ type: 'INFERENCE_RUNTIME', variant: runtime, name: runtimeName, description: `Local models on this computer (${found.displayName})`, ...(endpoint ? { endpoint } : {}) }]),
        ...(connectionRecord ? [] : [{ type: 'HARNESS', variant: harness, name: connectionName, description: `${plugin?.displayName ?? harness} with local models (no cloud login)`, authentication: 'NONE', baseUrl: 'LOCAL', inferenceRuntime: runtimeName }]),
    ];
    if (runtimeRecord) notes.push(`Reuses the runtime ${runtimeRecord.name}.`);
    if (connectionRecord) notes.push(`Reuses the connection ${connectionRecord.name}.`);
    const start = !missing && !observation.running && observation.onEngineHost;
    return {
        runtime,
        harness,
        ...(model ? { model } : {}),
        ...(endpoint ? { endpoint } : {}),
        ...(combination ? { combination } : {}),
        recommendation,
        reuse: { ...(runtimeRecord ? { runtime: runtimeRecord.name } : {}), ...(connectionRecord ? { connection: connectionRecord.name } : {}) },
        names: { runtime: runtimeName, connection: connectionName },
        drafts,
        steps: { ...(install ? { install } : {}), start: start || Boolean(install), download, ...(download && combination ? { downloadBytes: combination.downloadBytes } : {}) },
        problems,
        notes,
    };
}

/**
 * Plain words for a plan, shown before consent (what will be installed, started, downloaded and saved).
 *
 * @private local model setup
 */
export function describeLocalPlan(plan: LocalSetupPlan): string[] {
    const runtime = runtimeVariantLabel(plan.runtime);
    const plugin = harnessPlugin(harnessPluginId(plan.harness));
    return [
        `Model: ${plan.model ?? '(none fits)'} on ${runtime} with ${plugin?.displayName ?? plan.harness}${plan.recommendation.installed && plan.model === plan.recommendation.combination?.model ? ' (already downloaded)' : ''}`,
        ...(plan.steps.install ? [`Install ${runtime}: ${plan.steps.install.description}${plan.steps.install.mayNeedAdministrator ? ' — may ask for administrator approval' : ''}`] : []),
        ...(plan.steps.start ? [`Start the ${runtime} service on this computer (it keeps running for other projects)`] : []),
        ...(plan.steps.download ? [`Download ${plan.model}${plan.steps.downloadBytes ? ` (about ${formatBytes(plan.steps.downloadBytes)})` : ''}; the weights are shared on this computer`] : []),
        `Save: ${plan.drafts.length ? plan.drafts.map((draft) => `${draft.name} (${draft.type === 'HARNESS' ? 'harness connection, no cloud login' : 'local model runtime'})`).join(' and ') : 'nothing new (already configured)'}`,
    ];
}

/**
 * Runs an accepted installation route, streaming its output as progress (interactive terminals pass their TTY so an
 * administrator prompt can be answered).
 */
async function install(installation: RuntimeInstallation, env: NodeJS.ProcessEnv, options: { readonly interactive?: boolean; readonly signal?: AbortSignal; readonly onProgress: (progress: LocalSetupProgress) => void }): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const child = spawn(installation.command, installation.args, { env, stdio: options.interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'], windowsHide: true, ...(options.signal ? { signal: options.signal } : {}) });
        const forward = (chunk: Buffer): void => {
            for (const line of chunk.toString('utf8').split(/\r?\n|\r/)) if (line.trim()) options.onProgress({ stage: 'installing', message: redact(line.trim()).slice(0, 200) });
        };
        child.stdout?.on('data', forward);
        child.stderr?.on('data', forward);
        child.on('error', reject);
        child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${installation.command} exited with ${code}`))));
    });
}

/**
 * Capability checks whose failure means the connection is not ready for agent work: tasks need tool calls and chats
 * and consultations need an enforceable read-only mode (a failed continuation is reported but does not block).
 */
const READINESS_CAPABILITIES: readonly string[] = ['scratch-file', 'read-only'];

/**
 * Prepares (install, start, download/reuse) and verifies an accepted plan on the engine host. The accepted choice
 * authorizes exactly its stated prerequisites. Host prerequisites already completed are reported and never rolled
 * back; the records to save are returned only when a real response through the local route proved the connection.
 *
 * @private local model setup
 */
export async function prepareLocalSetup(
    env: NodeJS.ProcessEnv,
    plan: LocalSetupPlan,
    options: { readonly accepted: boolean; readonly project?: string; readonly interactive?: boolean; readonly signal?: AbortSignal; readonly onProgress?: (progress: LocalSetupProgress) => void; readonly extendedChecks?: boolean } = { accepted: false },
): Promise<LocalSetupResult> {
    const completed: string[] = [];
    const progress = (value: LocalSetupProgress): void => options.onProgress?.(value);
    const result = (status: LocalSetupResult['status'], summary: string, extra: Partial<LocalSetupResult> = {}): LocalSetupResult => ({ status, plan, summary, capabilities: [], completed, pending: [], ...extra });
    if (plan.problems.length) return result('failed', plan.problems.join(' '), { pending: plan.problems });
    if (!options.accepted && (plan.steps.install || plan.steps.download || plan.steps.start)) return result('needs-consent', 'The setup needs your consent for its stated prerequisites.', { pending: describeLocalPlan(plan) });
    const adapter = runtimeAdapter(plan.runtime);
    const runtimeTool: InferenceRuntimeToolRecord = { type: 'INFERENCE_RUNTIME', variant: plan.runtime, name: plan.names.runtime, isEnabled: true, ...(plan.endpoint ? { endpoint: plan.endpoint } : {}) };
    const context = { tool: runtimeTool, env, ...(options.project ? { project: options.project } : {}), ...(options.signal ? { signal: options.signal } : {}) };
    try {
        if (plan.steps.install) {
            progress({ stage: 'installing', message: `Installing ${adapter.displayName}: ${plan.steps.install.description}` });
            await install(plan.steps.install, env, { ...(options.interactive ? { interactive: true } : {}), ...(options.signal ? { signal: options.signal } : {}), onProgress: progress });
            completed.push(`Installed ${adapter.displayName}.`);
        }
        let observation = await adapter.inspect({ tool: runtimeTool, env });
        if (!observation.running) {
            progress({ stage: 'starting', message: `Starting ${adapter.displayName}…` });
            const started = await runRuntimeAction(context, { runtime: runtimeTool.name, action: 'start' });
            if (started.status !== 'completed') return result('failed', started.summary, { pending: [...started.next] });
            completed.push(started.summary);
            observation = started.observation ?? observation;
        }
        if (plan.model && !observation.models?.some((entry) => entry.id === plan.model && entry.installed && entry.locality === 'local')) {
            progress({ stage: 'downloading', message: `Downloading ${plan.model}…`, ...(plan.steps.downloadBytes ? { totalBytes: plan.steps.downloadBytes } : {}) });
            const downloaded = await runRuntimeAction(
                { ...context, onProgress: (item) => progress({ stage: 'downloading', message: item.message ?? item.stage, ...(item.completedBytes !== undefined ? { completedBytes: item.completedBytes } : {}), ...(item.totalBytes !== undefined ? { totalBytes: item.totalBytes } : {}) }), onWait: (holder) => progress({ stage: 'downloading', message: `Waiting for ${holder.label} started by another Promptbook engine…` }) },
                { runtime: runtimeTool.name, action: 'download', model: plan.model },
            );
            if (downloaded.status === 'cancelled') return result('cancelled', downloaded.summary, { pending: ['The download can be resumed by running the setup again.'] });
            if (downloaded.status !== 'completed') return result('failed', downloaded.summary, { pending: [...downloaded.next] });
            completed.push(downloaded.summary);
        } else if (plan.model) completed.push(`Reused the downloaded ${plan.model}.`);

        // Connect/test through the exact local route ordinary work will use (a disposable non-project directory).
        progress({ stage: 'verifying', message: `Checking ${plan.model} through ${harnessPlugin(harnessPluginId(plan.harness))?.displayName ?? plan.harness}…` });
        const verification = await verifyLocalConnection(env, plan, { ...(options.signal ? { signal: options.signal } : {}), ...(options.extendedChecks === false ? { extendedChecks: false } : {}) });
        if (!verification.check.ok) return result('failed', `The local connection did not answer a real request: ${verification.check.summary}`, { check: verification.check, capabilities: verification.capabilities, pending: ['Fix the cause above and run the setup again; prepared prerequisites are reused.'] });
        const blocking = verification.capabilities.filter((capability) => capability.outcome === 'failed' && READINESS_CAPABILITIES.includes(capability.name));
        if (blocking.length)
            return result('failed', `${plan.model} answered through ${adapter.displayName}, but it is not ready for agent work: ${blocking.map((capability) => `${capability.name} — ${capability.summary}`).join('; ')}`, {
                check: verification.check,
                capabilities: verification.capabilities,
                pending: [`Choose another model or harness (nothing was saved; prepared prerequisites are reused): ptbk tool setup-local --model <model>.`],
            });
        const operation: ToolOperation | undefined = plan.drafts.length ? { kind: 'add-together', tools: plan.drafts, summary: `Add local models (${plan.model} on ${adapter.displayName})` } : undefined;
        const failed = verification.capabilities.filter((capability) => capability.outcome === 'failed');
        progress({ stage: 'ready', message: `${plan.names.connection} is ready with ${plan.model}.` });
        return result('ready', `${plan.names.connection} answered through ${adapter.displayName} with ${plan.model} (${verification.check.summary}).`, {
            check: verification.check,
            capabilities: verification.capabilities,
            ...(operation ? { operation } : {}),
            pending: [
                ...failed.map((capability) => `${capability.name}: ${capability.summary}`),
                ...(options.extendedChecks === false ? ['Only a real answer was checked (--quick): tool use, read-only enforcement and continuation are not verified yet.'] : []),
                `To keep agents on local models, add runtime=local to their MODEL (for example: harness=${plan.harness} model=${plan.model} runtime=local).`,
            ],
        });
    } catch (error) {
        if (options.signal?.aborted) return result('cancelled', 'Cancelled. Prepared prerequisites stay on this computer and are reused next time.');
        return result('failed', redact((error as Error).message));
    }
}

/**
 * The preparatory call of a planned local connection: the exact environment, provider and local route ordinary work
 * uses, through a pool of only the planned records (no project file is read or written). Undefined while the connection
 * is not usable (its inspection says why).
 *
 * @private local model setup
 */
export async function localPreparatoryCall(env: NodeJS.ProcessEnv, plan: LocalSetupPlan, directory: string, options: { readonly signal?: AbortSignal } = {}): Promise<{ readonly call?: PreparatoryCall; readonly summary: string }> {
    const tools = [
        { type: 'INFERENCE_RUNTIME', variant: plan.runtime, name: plan.names.runtime, ...(plan.endpoint ? { endpoint: plan.endpoint } : {}) },
        { type: 'HARNESS', variant: plan.harness, name: plan.names.connection, authentication: 'NONE', baseUrl: 'LOCAL', inferenceRuntime: plan.names.runtime },
    ];
    const pool = new HarnessPool(directory, resolveSettings({ file: { tools } }), env);
    await pool.refresh();
    const tool = pool.instance(plan.names.connection)!;
    const inspection = pool.inspectionOf(tool.name);
    const localRoute = pool.localRoute(tool, plan.model);
    if (!inspection?.usable || !localRoute) return { summary: inspection?.summary ?? 'The local connection could not be inspected.' };
    const thinkingLevel = plan.combination?.defaultThinkingLevel;
    return {
        call: { plugin: pool.plugin(tool.name)!, inspection, env: pool.context(tool.name).env, ...(plan.model ? { model: plan.model } : {}), ...(thinkingLevel ? { thinkingLevel } : {}), localRoute, ...(options.signal ? { signal: options.signal } : {}), timeoutMs: 10 * 60_000 },
        summary: inspection.summary,
    };
}

/**
 * Functional and bounded capability checks of the planned connection in a disposable non-project directory, with the
 * exact environment, provider and route ordinary work uses.
 *
 * @private local model setup
 */
export async function verifyLocalConnection(env: NodeJS.ProcessEnv, plan: LocalSetupPlan, options: { readonly signal?: AbortSignal; readonly extendedChecks?: boolean } = {}): Promise<{ readonly check: FunctionalCheck; readonly capabilities: readonly CapabilityCheck[] }> {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk-local-setup-'));
    try {
        const { call, summary } = await localPreparatoryCall(env, plan, directory, options);
        if (!call) return { check: { ok: false, summary, durationMs: 0 }, capabilities: [] };
        const check = await functionalCheck(call);
        const capabilities = check.ok && options.extendedChecks !== false ? await localCapabilityChecks(call) : [];
        return { check, capabilities };
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}

/**
 * The verified combinations in words (for help and the dashboard).
 *
 * @private local model setup
 */
export function localCombinationsSummary(): string[] {
    return LOCAL_COMBINATIONS.map((entry) => `${runtimeVariantLabel(entry.runtime)} + ${harnessPlugin(harnessPluginId(entry.harness))?.displayName ?? entry.harness}: ${entry.model} (${formatBytes(entry.downloadBytes)} download, about ${formatBytes(entry.minimumMemoryBytes)} memory)${entry.automaticInstall ? '' : ' — existing installation only'}`);
}
