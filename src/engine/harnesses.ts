import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { formatShortTime } from '../common/time.js';
import { enabledHarnessTools, setting, type EffectiveSettings } from '../project/config.js';
import { harnessPlugin } from '../harness/registry.js';
import { baseInspection } from '../harness/shared.js';
import type { HarnessContext, HarnessInspection, HarnessPlugin } from '../harness/types.js';
import { describeCredentialSource, parseEnvironmentReference, readDotEnv, resolveVariable, type DotEnv, type ResolvedReference } from '../tools/environment.js';
import { harnessPluginId, type HarnessToolRecord } from '../tools/model.js';

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
 * The environment of one named harness instance: its own explicit API key (API_KEY), its own native account home
 * (accountProfile), and no ambient API keys for a native instance. Secret values are runtime-only.
 *
 * @private harness availability
 */
export function instanceEnvironment(plugin: HarnessPlugin, tool: HarnessToolRecord | undefined, credential: ResolvedReference | undefined, base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...base };
    if (!tool) return env;
    if (tool.authentication === 'NATIVE') {
        for (const name of plugin.ambientApiKeyVariables ?? []) delete env[name];
        if (tool.accountProfile && plugin.accountHomeVariable) env[plugin.accountHomeVariable] = accountHome(plugin, tool.accountProfile, base);
    } else {
        for (const name of plugin.ambientApiKeyVariables ?? []) delete env[name];
        if (plugin.apiKeyVariable && credential?.value) env[plugin.apiKeyVariable] = credential.value;
    }
    return env;
}

/**
 * A runtime unavailability mark of one instance (quota/rate limit or failed authentication), cleared by time or recheck.
 */
type UnavailableMark = { readonly kind: 'quota' | 'authentication'; readonly reason: string; readonly until: number };

/**
 * Tracks inspections of the project's enabled harness instances (only configured instances are inspected) and selects
 * the instance serving a variant: the first usable enabled instance in array order, later ones being fallbacks for
 * unavailable earlier ones (never arbitrary load-balancing).
 *
 * @private harness availability
 */
export class HarnessPool {
    private readonly inspections = new Map<string, HarnessInspection>();
    private readonly inspectedConfig = new Map<string, string>();
    private readonly unavailable = new Map<string, UnavailableMark>();
    private readonly modelCache = new Map<string, Promise<string[]>>();
    private dotEnv: DotEnv = { exists: false, text: '', assignments: [] };

    public constructor(
        private readonly projectRoot: string,
        private settings: EffectiveSettings,
        private readonly env: NodeJS.ProcessEnv,
    ) {}

    /** Replaces effective settings (live changes: added, enabled, disabled or modified instances). */
    public updateSettings(settings: EffectiveSettings): void {
        this.settings = settings;
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

    /** A fingerprint of the configuration an inspection depends on (a changed instance is reinspected at once). */
    private fingerprint(tool: HarnessToolRecord): string {
        const credential = this.credential(tool);
        return JSON.stringify([tool.variant, tool.authentication, tool.accountProfile, tool.apiKey, credential?.source, credential?.value ? credential.value.length : 0]);
    }

    /** Inspects one instance through its adapter (API_KEY readiness needs no login probe and never a paid call). */
    private async inspectInstance(tool: HarnessToolRecord): Promise<HarnessInspection> {
        const plugin = harnessPlugin(harnessPluginId(tool.variant))!;
        const context: HarnessContext = { projectRoot: this.projectRoot, env: this.environment(tool), tool };
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
        if (tool.accountProfile && plugin.accountHomeVariable && inspection.problem === 'signed-out') {
            return { ...inspection, nextAction: `Log in to this separate account context: ${plugin.accountHomeVariable}="${accountHome(plugin, tool.accountProfile, this.env)}" ${plugin.executable} ${(plugin.loginArgs ?? ['login']).join(' ')}` };
        }
        return inspection;
    }

    /** Inspects instances (default: every enabled one), refreshing stale or reconfigured results. */
    public async refresh(names: readonly string[] = this.instances().map((tool) => tool.name), force = false): Promise<void> {
        await this.reloadCredentials();
        await Promise.all(
            names.map(async (name) => {
                const tool = this.instance(name) ?? this.instances(name)[0];
                if (!tool) return;
                const plugin = harnessPlugin(harnessPluginId(tool.variant));
                if (!plugin) return;
                const existing = this.inspections.get(tool.name);
                const fingerprint = this.fingerprint(tool);
                if (!force && existing && this.inspectedConfig.get(tool.name) === fingerprint && Date.now() - existing.checkedAt < INSPECTION_TTL_MS) return;
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
        if (!inspection) return undefined;
        if (mark && mark.until > Date.now()) return { ...inspection, usable: false, summary: `${mark.reason} (rechecked after ${formatShortTime(mark.until)})`, problem: 'error', nextAction: mark.kind === 'quota' ? 'Wait for the reset, or enable another instance of this variant as a fallback.' : inspection.nextAction };
        if (mark) this.unavailable.delete(name);
        return inspection;
    }

    /**
     * The instance serving a variant: an explicitly named instance when given (never broadened), otherwise the first
     * usable enabled instance of that variant in array order.
     */
    public select(variant: string, options: { readonly tool?: string } = {}): HarnessToolRecord | undefined {
        if (options.tool) {
            const tool = this.instance(options.tool);
            return tool && tool.isEnabled && this.inspectionOf(tool.name)?.usable ? tool : undefined;
        }
        return this.instances(variant).find((tool) => this.inspectionOf(tool.name)?.usable);
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

    /** Variants with at least one usable enabled instance, default variant first. */
    public usable(): string[] {
        const preferred = setting<string | undefined>(this.settings, 'routing.harness');
        const ids = this.enabled().filter((id) => this.select(id));
        return preferred && ids.includes(preferred) ? [preferred, ...ids.filter((id) => id !== preferred)] : ids;
    }

    /** Plugin of a variant or instance name. */
    public plugin(nameOrVariant: string): HarnessPlugin | undefined {
        const tool = this.instance(nameOrVariant);
        return harnessPlugin(tool ? harnessPluginId(tool.variant) : nameOrVariant);
    }

    /** Preferred model of the instance serving a variant. */
    public modelOf(variant: string): string | undefined {
        return (this.select(variant) ?? this.instances(variant)[0])?.model;
    }

    /** Known models of a variant: configured ones of its instances plus the integration's catalog (cached, bounded). */
    public async models(variant: string): Promise<string[]> {
        const configured = this.instances(variant).flatMap((tool) => [...(tool.models ?? [])]);
        const plugin = this.plugin(variant);
        if (!plugin?.listModels) return [...new Set(configured)];
        let cached = this.modelCache.get(plugin.id);
        if (!cached) {
            cached = plugin.listModels(this.context(variant)).catch(() => []);
            this.modelCache.set(plugin.id, cached);
        }
        return [...new Set([...configured, ...(await cached)])];
    }

    /**
     * Marks an instance temporarily unavailable after an observed quota or authentication failure, so the same-variant
     * fallback serves the next selection without repeated failing probes.
     */
    public markUnavailable(name: string, kind: UnavailableMark['kind'], reason: string, forMs: number): void {
        this.unavailable.set(name, { kind, reason, until: Date.now() + forMs });
    }

    /** Marks a variant or instance for recheck (e.g. after an authentication failure). */
    public invalidate(nameOrVariant: string): void {
        const names = this.instance(nameOrVariant) ? [nameOrVariant] : this.instances(nameOrVariant).map((tool) => tool.name);
        for (const name of names) {
            this.inspections.delete(name);
            this.inspectedConfig.delete(name);
        }
        const plugin = this.plugin(nameOrVariant);
        if (plugin) this.modelCache.delete(plugin.id);
    }
}
