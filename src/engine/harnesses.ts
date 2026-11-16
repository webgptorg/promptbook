import { createHmac, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { formatShortTime } from '../common/time.js';
import { enabledHarnessTools, type EffectiveSettings } from '../project/config.js';
import { harnessPlugin } from '../harness/registry.js';
import { baseInspection } from '../harness/shared.js';
import type { HarnessContext, HarnessInspection, HarnessPlugin } from '../harness/types.js';
import { describeCredentialSource, parseEnvironmentReference, readDotEnv, resolveVariable, type DotEnv, type ResolvedReference } from '../tools/environment.js';
import { knownLocalModel, LOCAL_COMBINATIONS } from '../inference/catalog.js';
import { versionAtLeast } from '../inference/http.js';
import { runtimeAdapter, RuntimePool } from '../inference/registry.js';
import type { ModelLocality, RuntimeObservation } from '../inference/types.js';
import { harnessPluginId, runtimeReferenceProblem, runtimeVariantLabel, toolRuntime, type HarnessToolRecord, type InferenceRuntimeToolRecord, type ThinkingLevel } from '../tools/model.js';
import type { LocalRoute } from '../harness/types.js';

/**
 * How long an inspection stays fresh before an automatic recheck.
 */
const INSPECTION_TTL_MS = 30 * 60_000;

/**
 * Directory of a named native account context of one harness adapter (`accountProfile`), per OS user.
 *
 * @private harness availability
 */
export function accountHome(plugin: HarnessPlugin, accountProfile: string, env: NodeJS.ProcessEnv = process.env): string {
    return join(promptbookAppData(env), 'harness-accounts', plugin.id, accountProfile);
}

/**
 * Hosted inference and cloud-account credentials a credential-free `NONE` connection never inherits, whichever adapter
 * runs it: hosted model API keys and endpoints, AWS (Bedrock), Google Cloud (Vertex AI) and Azure account credentials.
 * Unrelated credentials (for example a GitHub token used by the work itself) stay available.
 */
const CLOUD_CREDENTIAL_VARIABLES: readonly string[] = [
    'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_ORG_ID', 'OPENAI_PROJECT_ID', 'CODEX_API_KEY',
    'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_OAUTH_TOKEN',
    'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'DASHSCOPE_API_KEY', 'QWEN_API_KEY', 'OPENCODE_API_KEY',
    'OPENROUTER_API_KEY', 'MISTRAL_API_KEY', 'GROQ_API_KEY', 'XAI_API_KEY', 'DEEPSEEK_API_KEY', 'TOGETHER_AI_API_KEY', 'FIREWORKS_API_KEY', 'CEREBRAS_API_KEY', 'MOONSHOT_API_KEY', 'ZHIPU_API_KEY',
    'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE', 'AWS_DEFAULT_PROFILE', 'AWS_BEARER_TOKEN_BEDROCK', 'AWS_WEB_IDENTITY_TOKEN_FILE', 'AWS_ROLE_ARN',
    'AWS_CONTAINER_CREDENTIALS_FULL_URI', 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI', 'AWS_CONTAINER_AUTHORIZATION_TOKEN',
    'GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_CLOUD_ACCESS_TOKEN', 'CLOUDSDK_AUTH_ACCESS_TOKEN', 'GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT_ID', 'GCLOUD_PROJECT', 'GOOGLE_VERTEX_PROJECT', 'GOOGLE_CLOUD_QUOTA_PROJECT', 'ANTHROPIC_VERTEX_PROJECT_ID',
    'AZURE_API_KEY', 'AZURE_OPENAI_API_KEY', 'AZURE_RESOURCE_NAME', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID', 'AZURE_FEDERATED_TOKEN_FILE',
];

/**
 * The invocation-scoped authentication environment of one named harness instance, used alike for probes, catalog and
 * capability discovery, functional checks and execution. Every mode starts without the variables that could select
 * another authentication/billing route (ambient keys, aliases, alternate provider keys, endpoint overrides and mode
 * selectors); then `NATIVE` adds its own account home and native selectors, `API_KEY` exactly its configured credential
 * (in an isolated configuration home where the CLI would otherwise prefer a stored login), and `NONE` nothing that
 * belongs to a cloud account (no hosted or cloud credential at all). Where the CLI itself fills absent variables from a
 * `.env` file of its working directory, every removed variable is passed empty instead, so that file cannot reinstate
 * the route. The engine's shared environment is never mutated; secret values are runtime-only.
 *
 * @private harness availability
 */
export function instanceEnvironment(plugin: HarnessPlugin, tool: HarnessToolRecord | undefined, credential: ResolvedReference | undefined, base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...base };
    if (!tool) return env;
    const removed = new Set<string>();
    const remove = (names: readonly string[]): void => {
        for (const name of names) {
            delete env[name];
            removed.add(name);
        }
    };
    remove(plugin.ambientApiKeyVariables ?? []);
    if (tool.authentication !== 'NATIVE') remove(plugin.nativeCredentialVariables ?? []);
    if (tool.authentication === 'NONE') remove(CLOUD_CREDENTIAL_VARIABLES);
    Object.assign(env, plugin.modeEnvironment?.[tool.authentication] ?? {});
    if (tool.authentication === 'NATIVE') {
        if (tool.accountProfile && plugin.accountHomeVariable) env[plugin.accountHomeVariable] = accountHome(plugin, tool.accountProfile, base);
    } else if (tool.authentication === 'API_KEY') {
        if (plugin.apiKeyVariable && credential?.value) env[plugin.apiKeyVariable] = credential.value;
        const setup = plugin.setupApiKey;
        const profile = plugin.apiKeyProfile ?? (setup?.profile && credential?.value && credential.name === setup.reference ? setup.profile : undefined);
        if (profile) {
            env[profile.home] = accountHome(plugin, 'api-key', base);
            remove(profile.omit ?? []);
        }
    }
    if (plugin.fillsFromWorkspaceDotEnv) for (const name of removed) if (env[name] === undefined) env[name] = '';
    return env;
}

/**
 * Wait after a quota/rate limit or authentication failure when the provider gives no reset time.
 *
 * @private harness availability
 */
export const QUOTA_BACKOFF_MS = 15 * 60_000;

/**
 * Shortest wait after a quota/rate limit, also when the provider reports an earlier reset.
 */
const QUOTA_MIN_WAIT_MS = 30_000;

/**
 * A runtime quota or authentication failure, scoped to its connection identity and bounded by time.
 */
type UnavailableMark = { readonly kind: 'quota' | 'authentication' | 'technical'; readonly reason: string; readonly until: number; readonly identity: string };

/**
 * Bounded recheck of an instance after an observed technical invocation failure that moved work to a fallback: the
 * earlier instance regains priority at a later selection once it passes.
 *
 * @private harness availability
 */
export const TECHNICAL_RECHECK_MS = 5 * 60_000;

/**
 * Tracks inspections of the project's enabled harness instances (only configured instances are inspected) and selects
 * the instance serving a variant: the first usable enabled instance in array order, later ones being fallbacks for
 * unavailable earlier ones (never arbitrary load-balancing).
 *
 * @private harness availability
 */
export class HarnessPool {
    private readonly inspections = new Map<string, HarnessInspection>();
    /** Per-pool secret key keeps cache identities private to this runtime, never diagnostic or persisted. */
    readonly #identityKey = randomBytes(32);
    private readonly inspectedConfig = new Map<string, string>();
    private readonly unavailable = new Map<string, UnavailableMark>();
    private readonly modelCache = new Map<string, { identity: string; models: Promise<string[]>; resolved?: string[] }>();
    private dotEnv: DotEnv = { exists: false, text: '', assignments: [] };
    /** Read-only observations of the project's local model runtimes (shared with the tool inventory). */
    public readonly runtimes: RuntimePool;

    public constructor(
        private readonly projectRoot: string,
        private settings: EffectiveSettings,
        private readonly env: NodeJS.ProcessEnv,
    ) {
        this.runtimes = new RuntimePool(env);
        this.runtimes.update(settings.tools);
    }

    /** Replaces effective settings (live changes: added, enabled, disabled or modified instances). */
    public updateSettings(settings: EffectiveSettings): void {
        this.settings = settings;
        this.runtimes.update(settings.tools);
    }

    /** Re-reads the project's `.env` (credentials can change without a restart). */
    public async reloadCredentials(): Promise<void> {
        this.dotEnv = await readDotEnv(this.projectRoot).catch(() => this.dotEnv);
    }

    /** Every harness instance (enabled or not) in array order. */
    public allInstances(): HarnessToolRecord[] {
        return this.settings.tools.filter((tool): tool is HarnessToolRecord => tool.type === 'HARNESS');
    }

    /** Enabled instances, optionally of one variant (plugin identifier), in array order. */
    public instances(variant?: string): HarnessToolRecord[] {
        const enabled = enabledHarnessTools(this.settings);
        return variant ? enabled.filter((tool) => harnessPluginId(tool.variant) === variant) : enabled;
    }

    /** An instance by name. */
    public instance(name: string): HarnessToolRecord | undefined {
        return this.allInstances().find((tool) => tool.name === name);
    }

    /** Enabled variants (plugin identifiers) in first-instance order. */
    public enabled(): string[] {
        return [...new Set(this.instances().map((tool) => harnessPluginId(tool.variant)))];
    }

    /** Resolved credential reference of an API_KEY instance (source only is ever shown). */
    public credential(tool: HarnessToolRecord): ResolvedReference | undefined {
        const name = parseEnvironmentReference(tool.apiKey);
        return name ? resolveVariable(name, this.env, this.dotEnv) : undefined;
    }

    /** Process environment of an instance for inspection and execution. */
    public environment(tool: HarnessToolRecord): NodeJS.ProcessEnv {
        const plugin = harnessPlugin(harnessPluginId(tool.variant));
        if (!plugin) return { ...this.env };
        return instanceEnvironment(plugin, tool, tool.authentication === 'API_KEY' ? this.credential(tool) : undefined, this.env);
    }

    /** Inspection context of an instance (by name) or of a variant's selected instance. */
    public context(nameOrVariant: string, signal?: AbortSignal): HarnessContext {
        const tool = this.instance(nameOrVariant) ?? this.select(nameOrVariant) ?? this.instances(nameOrVariant)[0];
        return { projectRoot: this.projectRoot, env: tool ? this.environment(tool) : { ...this.env }, tool, signal };
    }

    /** Runtime-only connection identity shared by readiness, model catalogs and provider failure backoff. */
    private fingerprint(tool: HarnessToolRecord, env = this.environment(tool)): string {
        const plugin = this.plugin(harnessPluginId(tool.variant));
        const runtime = tool.inferenceRuntime ? this.runtimes.record(tool.inferenceRuntime) : undefined;
        return createHmac('sha256', this.#identityKey).update(JSON.stringify([
            tool.variant, tool.authentication, tool.accountProfile, toolRuntime(tool),
            tool.authentication === 'API_KEY' && plugin?.apiKeyVariable ? env[plugin.apiKeyVariable] : undefined,
            tool.inferenceRuntime, runtime?.variant, runtime?.endpoint,
        ])).digest('hex');
    }

    /** Inspection dependencies also include the non-secret source description shown in readiness output. */
    private inspectionFingerprint(tool: HarnessToolRecord): string {
        const credential = this.credential(tool);
        return JSON.stringify([this.fingerprint(tool), credential?.name, credential?.source]);
    }

    /** Inspects one instance through its adapter (API_KEY readiness needs no login probe and never a paid call). */
    private async inspectInstance(tool: HarnessToolRecord): Promise<HarnessInspection> {
        const plugin = harnessPlugin(harnessPluginId(tool.variant))!;
        const context: HarnessContext = { projectRoot: this.projectRoot, env: this.environment(tool), tool };
        // An endpoint the adapter cannot reach is never invented: the instance stays visibly unusable.
        const runtime = toolRuntime(tool);
        if (runtime === 'local' && tool.inferenceRuntime) return await this.inspectLocalConnection(plugin, tool, context);
        if (runtime === 'local' && plugin.endpoints.local) {
            // A legacy LOCAL endpoint has no saved runtime binding: locality cannot be verified and nothing is guessed.
            const { inspection } = await baseInspection(plugin, context);
            return {
                ...inspection,
                usable: false,
                summary: `${tool.name} uses a local endpoint without a local model runtime binding, so Promptbook cannot verify which service and models it reaches.`,
                problem: 'unsupported',
                nextAction: `Bind it to a runtime: ptbk tool setup-local (or ptbk tool add INFERENCE_RUNTIME --variant OLLAMA --name local-ollama, then ptbk tool modify ${tool.name} --inference-runtime local-ollama --authentication NONE)`,
            };
        }
        if (tool.authentication === 'NONE' && runtime !== 'local') {
            // An explicit credential-free custom endpoint: no login and no key; its catalog stays unknown.
            const { inspection } = await baseInspection(plugin, context);
            if (!plugin.endpoints.custom) return { ...inspection, usable: false, summary: `${plugin.displayName} does not support a custom base URL (baseUrl ${tool.baseUrl}).`, problem: 'unsupported', nextAction: `Use a harness that supports custom endpoints, or remove ${tool.name}.` };
            if (!inspection.installed) return inspection;
            return { ...inspection, authenticated: true, authentication: 'local', usable: true, summary: `Ready (credential-free endpoint ${runtime}${inspection.version ? `, v${inspection.version}` : ''}; locality is not verified).` };
        }
        if ((runtime === 'local' && !plugin.endpoints.local) || (runtime !== 'local' && runtime !== 'official' && !plugin.endpoints.custom)) {
            const { inspection } = await baseInspection(plugin, context);
            return {
                ...inspection,
                usable: false,
                summary: `${plugin.displayName} does not support ${runtime === 'local' ? 'local inference on the engine host' : 'a custom base URL'} (baseUrl ${tool.baseUrl}).`,
                problem: 'unsupported',
                nextAction: `Remove baseUrl from the tool (ptbk tool modify ${tool.name} --base-url default), or use a harness that supports this endpoint.`,
            };
        }
        if (tool.accountProfile && tool.authentication === 'NATIVE' && !plugin.accountHomeVariable) {
            const { inspection } = await baseInspection(plugin, context);
            return { ...inspection, usable: false, authenticated: false, summary: `${plugin.displayName} does not support separate native account contexts (accountProfile "${tool.accountProfile}").`, problem: 'unsupported', nextAction: 'Remove accountProfile, or use an API_KEY instance for a second billing account.' };
        }
        if (tool.authentication === 'API_KEY') {
            const { inspection } = await baseInspection(plugin, context);
            if (!plugin.apiKeyVariable) return { ...inspection, usable: false, authenticated: false, summary: `${plugin.displayName} does not support explicit API-key authentication in ptbk.`, problem: 'unsupported', nextAction: 'Use authentication NATIVE for this harness.' };
            if (!inspection.installed) return inspection;
            const credential = this.credential(tool);
            if (!credential?.value) {
                return { ...inspection, usable: false, authenticated: false, authentication: 'none', summary: `API key: ${credential ? describeCredentialSource(credential) : 'apiKey reference missing'}.`, problem: 'signed-out', nextAction: `Set the key without echoing it: ptbk tool modify ${tool.name} --api-key-stdin` };
            }
            return { ...inspection, authenticated: true, authentication: 'api', usable: true, summary: `Ready (API key ${describeCredentialSource(credential)}${inspection.version ? `, v${inspection.version}` : ''}).` };
        }
        const inspection = await plugin.inspect(context);
        // NATIVE readiness comes only from the native account context: API credentials (a CLI-configured key, helper or
        // token) belong to another route, so they never make a native instance ready and the route is never changed.
        if (inspection.authentication === 'api') {
            return { ...inspection, usable: false, authenticated: false, authentication: 'none', summary: `${plugin.displayName} has no native login for ${tool.name}: only API credentials are visible, which a NATIVE instance never uses.`, problem: 'signed-out', nextAction: plugin.loginHint };
        }
        if (tool.accountProfile && plugin.accountHomeVariable && inspection.problem === 'signed-out') {
            return { ...inspection, nextAction: `Log in to this separate account context: ${plugin.accountHomeVariable}="${accountHome(plugin, tool.accountProfile, this.env)}" ${plugin.executable} ${(plugin.loginArgs ?? ['login']).join(' ')}` };
        }
        return inspection;
    }

    /**
     * Installation and transport support of a managed local connection (its runtime's service and models are overlaid
     * live by `inspectionOf`, so a runtime start, stop or download changes readiness without a long inspection TTL).
     */
    private async inspectLocalConnection(plugin: HarnessPlugin, tool: HarnessToolRecord, context: HarnessContext): Promise<HarnessInspection> {
        const { inspection } = await baseInspection(plugin, context);
        const connection = plugin.endpoints.localConnection;
        const runtimeRecord = this.runtimes.record(tool.inferenceRuntime!);
        if (!connection) return { ...inspection, usable: false, authentication: 'local', summary: `${plugin.displayName} has no verified managed local connection in Promptbook.`, problem: 'unsupported', nextAction: 'Use OpenAI Codex for local models (`ptbk tool setup-local`).' };
        if (runtimeRecord?.type === 'INFERENCE_RUNTIME' && connection.runtimes[runtimeRecord.variant] === undefined) {
            return { ...inspection, usable: false, authentication: 'local', summary: `${plugin.displayName} is not verified with ${runtimeVariantLabel(runtimeRecord.variant)} local connections.`, problem: 'unsupported', nextAction: `Use a supported combination (${Object.keys(connection.runtimes).map((variant) => runtimeVariantLabel(variant as InferenceRuntimeToolRecord['variant'])).join(', ')}).` };
        }
        if (tool.authentication !== 'NONE') return { ...inspection, usable: false, authentication: 'local', summary: `A managed local connection is credential-free; ${tool.name} is set to ${tool.authentication}, which is never converted silently.`, problem: 'unsupported', nextAction: `ptbk tool modify ${tool.name} --authentication NONE` };
        if (!inspection.installed) return { ...inspection, authentication: 'local' };
        return { ...inspection, authenticated: true, authentication: 'local', usable: true, summary: `Installed${inspection.version ? ` (v${inspection.version})` : ''}; credential-free local connection.` };
    }

    /** The runtime record and its current observation of a managed local connection. */
    private runtimeOf(tool: HarnessToolRecord): { readonly record?: InferenceRuntimeToolRecord; readonly observation?: RuntimeObservation; readonly problem?: string } {
        if (!tool.inferenceRuntime) return {};
        const problem = runtimeReferenceProblem(this.settings.tools, tool);
        const record = this.runtimes.record(tool.inferenceRuntime);
        if (problem) return { problem, ...(record ? { record } : {}) };
        return { record, observation: this.runtimes.observation(tool.inferenceRuntime) };
    }

    /** Overlays the live runtime state on a managed local connection's installation inspection. */
    private localReadiness(tool: HarnessToolRecord, inspection: HarnessInspection): HarnessInspection {
        if (!inspection.usable) return inspection;
        const plugin = this.plugin(tool.name)!;
        const { record, observation, problem } = this.runtimeOf(tool);
        if (problem) return { ...inspection, usable: false, summary: `${tool.name} cannot be used: ${problem}.`, problem: 'unsupported', nextAction: `ptbk tool modify ${tool.name} --inference-runtime <name>${record ? ` (or ptbk tool enable ${record.name})` : ''}` };
        if (!observation || !record) return { ...inspection, usable: false, summary: `Waiting for the first inspection of ${tool.inferenceRuntime}.` };
        const minimum = plugin.endpoints.localConnection?.runtimes[record.variant];
        if (!observation.running) return { ...inspection, usable: false, summary: observation.summary, problem: observation.problem === 'missing' ? 'missing' : 'error', nextAction: observation.nextAction };
        if (minimum && observation.version && !versionAtLeast(observation.version, minimum)) {
            return { ...inspection, usable: false, summary: `${observation.displayName} ${observation.version} is older than ${minimum}, which ${plugin.displayName}'s local transport needs.`, problem: 'unsupported', nextAction: `Update ${observation.displayName} on the engine host (ptbk tool runtime ${record.name} update shows how).` };
        }
        const models = (observation.models ?? []).filter((model) => model.installed);
        if (!models.length) return { ...inspection, usable: false, summary: observation.summary, problem: 'missing', nextAction: observation.nextAction };
        return { ...inspection, models: models.map((model) => model.id), thinkingLevels: plugin.thinkingLevels, summary: `Ready (local ${observation.displayName}${observation.version ? ` ${observation.version}` : ''} at ${observation.endpoint}, ${models.length} model${models.length === 1 ? '' : 's'}; credential-free).` };
    }

    /**
     * The invocation-scoped local route of a managed local connection (undefined for hosted connections or while its
     * runtime is not observed as reachable).
     */
    public localRoute(tool: HarnessToolRecord, model?: string): LocalRoute | undefined {
        if (!tool.inferenceRuntime || toolRuntime(tool) !== 'local') return undefined;
        const plugin = this.plugin(tool.name);
        const { record, observation, problem } = this.runtimeOf(tool);
        const protocol = plugin?.endpoints.localConnection?.protocol;
        if (problem || !record || !observation || !protocol) return undefined;
        const adapter = runtimeAdapter(record.variant);
        const protocolUrl = adapter.protocolEndpoint(observation.endpoint, protocol);
        if (!protocolUrl) return undefined;
        const served = model ? observation.models?.find((candidate) => candidate.id === model) : undefined;
        return {
            runtime: record.variant,
            runtimeTool: record.name,
            connection: tool.name,
            resourceKey: observation.resourceKey,
            protocol,
            protocolUrl,
            compatibilityToken: adapter.compatibilityToken,
            ...(observation.version ? { runtimeVersion: observation.version } : {}),
            ...(model ? { model: { id: model, ...(served?.digest ? { digest: served.digest } : {}), ...(served?.quantization ? { quantization: served.quantization } : {}), locality: served ? (observation.onEngineHost ? served.locality : 'unknown') : 'unknown' } } : {}),
        };
    }

    /**
     * Where a model executes through a connection: verified `local`, `cloud` behind the runtime, `unknown`, or `missing`
     * (not offered by that runtime now). Hosted connections are never local.
     */
    public modelLocality(name: string, model: string): ModelLocality | 'missing' | 'service-down' {
        const tool = this.instance(name);
        if (!tool) return 'unknown';
        if (!tool.inferenceRuntime) return toolRuntime(tool) === 'official' ? 'cloud' : 'unknown';
        const { observation } = this.runtimeOf(tool);
        if (!observation?.running) return 'service-down';
        const entry = observation.models?.find((candidate) => candidate.id === model);
        if (!entry) return 'missing';
        return observation.onEngineHost ? entry.locality : 'unknown';
    }

    /** One served model of a connection's runtime catalog (capabilities, quantization, digest). */
    public runtimeModel(name: string, model: string): import('../inference/types.js').RuntimeModel | undefined {
        const tool = this.instance(name);
        if (!tool?.inferenceRuntime) return undefined;
        return this.runtimeOf(tool).observation?.models?.find((candidate) => candidate.id === model);
    }

    /** Whether a connection's catalog can accept a model now (complete catalogs only; unknown catalogs accept). */
    private catalogAccepts(tool: HarnessToolRecord, model: string | undefined): boolean {
        if (!model) return true;
        if (tool.inferenceRuntime) return (this.runtimeOf(tool).observation?.models ?? []).some((candidate) => candidate.id === model);
        const plugin = this.plugin(tool.name);
        if (plugin?.modelCatalog !== 'complete') return true;
        const resolved = this.modelCache.get(tool.name)?.resolved;
        return !resolved?.length || resolved.includes(model);
    }

    /** Inspects instances (default: every enabled one), refreshing stale or reconfigured results. */
    public async refresh(names: readonly string[] = this.instances().map((tool) => tool.name), force = false): Promise<void> {
        await this.reloadCredentials();
        // Runtime services change quickly (downloads, restarts): observed on their own short schedule, read-only.
        const runtimeNames = new Set([...this.runtimes.records().filter((tool) => tool.isEnabled).map((tool) => tool.name), ...names.flatMap((name) => this.instance(name)?.inferenceRuntime ?? [])]);
        await this.runtimes.refresh([...runtimeNames], force);
        await Promise.all(
            names.map(async (name) => {
                const tool = this.instance(name) ?? this.instances(name)[0];
                if (!tool) return;
                const plugin = harnessPlugin(harnessPluginId(tool.variant));
                if (!plugin) return;
                const existing = this.inspections.get(tool.name);
                const fingerprint = this.inspectionFingerprint(tool);
                if (!force && existing && this.inspectedConfig.get(tool.name) === fingerprint && Date.now() - existing.checkedAt < INSPECTION_TTL_MS) return;
                // Model discovery also depends on installed CLI/readiness state, even when the connection is unchanged.
                this.modelCache.delete(tool.name);
                try {
                    this.inspections.set(tool.name, await this.inspectInstance(tool));
                } catch (error) {
                    this.inspections.set(tool.name, {
                        id: plugin.id,
                        displayName: plugin.displayName,
                        installed: false,
                        authenticated: false,
                        authentication: 'none',
                        usable: false,
                        models: [],
                        thinkingLevels: plugin.thinkingLevels,
                        capabilities: plugin.capabilities,
                        summary: `Inspection failed: ${(error as Error).message}`,
                        problem: 'error',
                        checkedAt: Date.now(),
                    });
                }
                this.inspectedConfig.set(tool.name, fingerprint);
            }),
        );
    }

    /** Latest inspection of an instance, with an active runtime unavailability mark applied. */
    public inspectionOf(name: string): HarnessInspection | undefined {
        const inspection = this.inspections.get(name);
        const mark = this.unavailable.get(name);
        const tool = this.instance(name);
        if (!inspection || !tool || this.inspectedConfig.get(name) !== this.inspectionFingerprint(tool)) return undefined;
        if (mark && mark.identity === this.fingerprint(tool) && mark.until > Date.now()) return { ...inspection, usable: false, summary: `${mark.reason} (rechecked after ${formatShortTime(mark.until)})`, problem: 'error', nextAction: mark.kind === 'quota' ? 'Wait for the reset, or enable another instance of this variant as a fallback.' : inspection.nextAction, ...(mark.kind === 'quota' || mark.kind === 'technical' ? { recheckAt: mark.until } : {}) };
        if (mark) this.unavailable.delete(name);
        return tool.inferenceRuntime ? this.localReadiness(tool, inspection) : inspection;
    }

    /**
     * The instance serving a variant: an explicitly named instance when given (never broadened), otherwise the first
     * usable enabled instance of that variant in array order. A `runtime` (`official`, `local` or a base URL) keeps
     * same-variant fallback within that endpoint: accounts aimed at different services are not interchangeable.
     */
    public select(variant: string, options: { readonly tool?: string; readonly runtime?: string; readonly except?: string; readonly model?: string } = {}): HarnessToolRecord | undefined {
        if (options.tool) {
            const tool = this.instance(options.tool);
            return tool && tool.isEnabled && this.inspectionOf(tool.name)?.usable ? tool : undefined;
        }
        // Same-variant priority applies only among connections whose own catalog serves the resolved model.
        return this.instances(variant).find((tool) => tool.name !== options.except && (!options.runtime || options.runtime === 'default' || toolRuntime(tool) === options.runtime.replace(/\/+$/, '')) && this.catalogAccepts(tool, options.model) && this.inspectionOf(tool.name)?.usable);
    }

    /** Enabled instances of a variant aimed at an endpoint (`default`/undefined: any), usable or not. */
    public instancesFor(variant: string, runtime?: string): HarnessToolRecord[] {
        return this.instances(variant).filter((tool) => !runtime || runtime === 'default' || toolRuntime(tool) === runtime.replace(/\/+$/, ''));
    }

    /** The base URL an instance's endpoint needs at execution (undefined for the official endpoint). */
    public baseUrl(tool: HarnessToolRecord): string | undefined {
        const runtime = toolRuntime(tool);
        if (runtime === 'official') return undefined;
        if (runtime === 'local') return tool.inferenceRuntime ? this.localRoute(tool)?.protocolUrl : this.plugin(tool.name)?.endpoints.local;
        return runtime;
    }

    /** Inspection of the instance currently serving a variant (or of its first instance when none is usable). */
    public inspection(variant: string): HarnessInspection | undefined {
        const tool = this.instance(variant) ?? this.select(variant) ?? this.instances(variant)[0];
        return tool ? this.inspectionOf(tool.name) : undefined;
    }

    /** Every known inspection by instance name. */
    public all(): Array<{ tool: HarnessToolRecord; inspection?: HarnessInspection }> {
        return this.allInstances().map((tool) => ({ tool, inspection: this.inspectionOf(tool.name) }));
    }

    /** Variants with at least one usable enabled instance, in `tools` order. */
    public usable(): string[] {
        return this.enabled().filter((id) => this.select(id));
    }

    /** Plugin of a variant or instance name. */
    public plugin(nameOrVariant: string): HarnessPlugin | undefined {
        const tool = this.instance(nameOrVariant);
        return harnessPlugin(tool ? harnessPluginId(tool.variant) : nameOrVariant);
    }

    /** The integration's model catalog of a variant (cached, bounded; empty when unknown). */
    public async models(variant: string): Promise<string[]> {
        const plugin = this.plugin(variant);
        const selected = this.instance(variant) ?? this.select(variant) ?? this.instances(variant)[0];
        // A managed local connection's catalog is its runtime's, never the variant's hosted catalog (or vice versa).
        if (selected?.inferenceRuntime) return [...(this.runtimeOf(selected).observation?.models ?? [])].sort((a, b) => Number(b.locality === 'local') - Number(a.locality === 'local')).map((model) => model.id);
        if (!plugin?.listModels) return [];
        const context = this.context(variant);
        const name = context.tool?.name ?? plugin.id;
        const identity = context.tool ? this.fingerprint(context.tool, context.env) : plugin.id;
        let cached = this.modelCache.get(name);
        if (!cached || cached.identity !== identity) {
            const entry: { identity: string; models: Promise<string[]>; resolved?: string[] } = { identity, models: plugin.listModels(context).catch(() => []) };
            void entry.models.then((models) => (entry.resolved = models));
            cached = entry;
            this.modelCache.set(name, cached);
        }
        return [...(await cached.models)];
    }

    /**
     * Whether a model ID is known to be unsupported: only an authoritative (complete) catalog can say so; partial
     * catalogs and unknown catalogs never reject an identifier.
     */
    public async rejectsModel(variant: string, model: string, runtime?: string): Promise<boolean> {
        const plugin = this.plugin(variant);
        if (!plugin) return false;
        // Connection-scoped: a model missing from the hosted catalog can still be valid on a local connection, and
        // only an authoritative catalog of every candidate connection can reject it.
        const connections = this.instance(variant) ? [this.instance(variant)!] : this.instancesFor(plugin.id, runtime);
        if (!connections.length) return false;
        for (const tool of connections) {
            if (tool.inferenceRuntime) {
                const { record, observation } = this.runtimeOf(tool);
                if (!observation?.running || (observation.models ?? []).some((candidate) => candidate.id === model)) return false;
                // A known model of this runtime that is not downloaded yet is a resource wait, not an unknown model.
                if (record && knownLocalModel(record.variant, model, tool.variant)) return false;
                continue;
            }
            if (plugin.modelCatalog !== 'complete') return false;
            const known = await this.models(tool.name);
            if (!known.length || known.includes(model)) return false;
        }
        return true;
    }

    /**
     * The plugin's coded defaults for the selected tool and its provider (or the first model when a complete catalog
     * lacks the default). Tools identify connections, while adapters own the model and thinking defaults.
     */
    public async defaults(variant: string): Promise<{ readonly model?: string; readonly thinkingLevel?: ThinkingLevel }> {
        const plugin = this.plugin(variant);
        if (!plugin) return {};
        const tool = this.instance(variant) ?? this.select(variant);
        if (tool?.inferenceRuntime) return this.localDefaults(tool);
        const setup = plugin.setupApiKey;
        const provider = setup && tool?.authentication === 'API_KEY' && parseEnvironmentReference(tool.apiKey) === setup.reference ? setup : undefined;
        let model: string | undefined = provider?.model ?? plugin.defaultModel;
        if (plugin.modelCatalog === 'complete') {
            const known = await this.models(variant);
            if (known.length && !known.includes(model)) model = known[0];
        }
        return { model, thinkingLevel: provider?.thinkingLevel ?? (plugin.thinkingLevels.length ? (plugin.defaultThinkingLevel ?? plugin.thinkingLevels[0]) : undefined) };
    }

    /**
     * Connection-aware defaults of a managed local connection: the plugin's recommendation logic applied to the models
     * its runtime actually has (a verified catalog combination first, then the first local model), never the official
     * provider's default.
     */
    private localDefaults(tool: HarnessToolRecord): { readonly model?: string; readonly thinkingLevel?: ThinkingLevel } {
        const { record, observation } = this.runtimeOf(tool);
        const local = (observation?.models ?? []).filter((model) => model.installed && model.locality === 'local');
        if (!record || !local.length) return {};
        const recommended = LOCAL_COMBINATIONS.find((entry) => entry.runtime === record.variant && entry.harness === tool.variant && local.some((model) => model.id === entry.model));
        const model = recommended?.model ?? local[0]!.id;
        const known = knownLocalModel(record.variant, model, tool.variant);
        return { model, ...(known?.defaultThinkingLevel ? { thinkingLevel: known.defaultThinkingLevel } : {}) };
    }

    /**
     * Marks an instance temporarily unavailable after an observed quota or authentication failure, so the same-variant
     * fallback serves the next selection without repeated failing probes. The acquired context attributes a late
     * failure to its original connection, so it cannot penalize a replacement credential or endpoint.
     */
    public markUnavailable(name: string, kind: UnavailableMark['kind'], reason: string, forMs: number, context?: HarnessContext): void {
        const tool = context?.tool ?? this.instance(name);
        if (!tool) return;
        const identity = this.fingerprint(tool, context?.env);
        const current = this.instance(name);
        if (!current || identity !== this.fingerprint(current)) return;
        this.unavailable.set(name, { kind, reason, until: Date.now() + forMs, identity });
    }

    /**
     * Records an observed quota/rate limit of one run on its instance, shared by tasks, chat replies, briefs and
     * consultations: until the provider's reported reset when it stated one (no failing probes before it, no needless
     * wait after it), otherwise the default backoff. Returns that wait.
     */
    public markQuota(name: string, result: { readonly diagnostic: string; readonly quotaResetAt?: number }, context?: HarnessContext): number {
        const waitMs = result.quotaResetAt ? Math.max(QUOTA_MIN_WAIT_MS, result.quotaResetAt - Date.now()) : QUOTA_BACKOFF_MS;
        this.markUnavailable(name, 'quota', `Quota/rate limit: ${result.diagnostic}`, waitMs, context);
        return waitMs;
    }

    /**
     * The eligible same-variant fallback of a selection whose instance failed: the next usable enabled instance in
     * `tools` order on the same resolved endpoint whose catalog serves the same model. An explicitly named instance is
     * an account constraint and has no fallback; a different endpoint or unsupported model is never interchangeable.
     */
    public fallbackFor(selection: { readonly harness: string; readonly tool?: string; readonly model?: string; readonly runtime?: string; readonly sources?: { readonly tool?: string } }): HarnessToolRecord | undefined {
        if (!selection.tool || selection.sources?.tool?.startsWith('explicit instance')) return undefined;
        const failed = this.instance(selection.tool);
        const runtime = selection.runtime ?? (failed ? toolRuntime(failed) : undefined);
        return this.select(selection.harness, { except: selection.tool, ...(runtime ? { runtime } : {}), ...(selection.model ? { model: selection.model } : {}) });
    }

    /**
     * Records an observed technical invocation failure against the exact acquired connection when a fallback will serve
     * the continuation (a late failure of an old credential, profile or endpoint never marks its replacement).
     */
    public markTechnical(name: string, diagnostic: string, context?: HarnessContext): void {
        this.markUnavailable(name, 'technical', `Technical failure: ${diagnostic}`, TECHNICAL_RECHECK_MS, context);
    }

    /** Marks a variant or instance for recheck (e.g. after an authentication failure). */
    public invalidate(nameOrVariant: string): void {
        const names = this.instance(nameOrVariant) ? [nameOrVariant] : this.instances(nameOrVariant).map((tool) => tool.name);
        for (const name of names) {
            this.inspections.delete(name);
            this.inspectedConfig.delete(name);
            this.modelCache.delete(name);
        }
    }
}
